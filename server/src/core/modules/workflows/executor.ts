import { PluginExecutor } from "../plugins/executor.ts";
import { WorkflowParser, resolvePath } from "./parser.ts";
import { WorkflowRepository } from "./repository.ts";
import { runCode } from "./code-runner.ts";
import type {
  WorkflowItem,
  WorkflowNode,
  WorkflowEdge,
  WorkflowVariable,
  PluginNode,
  CodeNode,
  IfNode,
  LoopNode,
  SubWorkflowNode,
} from "../../../shared/models/workflow-types.ts";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ──────────── Context Sanitization ────────────

export function sanitizeContextForLogging(context: any): any {
  if (context === null || context === undefined) return context;

  if (Buffer.isBuffer(context)) {
    return `<Buffer size: ${context.length}>`;
  }

  // Check for Readable Stream (duck typing for robustness)
  if (
    typeof context === "object" &&
    typeof context.pipe === "function" &&
    typeof context.on === "function"
  ) {
    return `<ReadableStream>`;
  }

  if (Array.isArray(context)) {
    return context.map(sanitizeContextForLogging);
  }

  if (typeof context === "object") {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(context)) {
      // Avoid deep-sanitizing everything if it's a suspected internal node object
      if (key.startsWith("_") && typeof value === "object") continue;
      sanitized[key] = sanitizeContextForLogging(value);
    }
    return sanitized;
  }
  return context;
}

// ──────────── Condition Evaluator ────────────

/**
 * Evaluates a JS expression against the execution context.
 * The expression can reference `trigger`, `steps`, and `variables` directly.
 * e.g. "steps.step1.output.status === 200"
 */
function evaluateCondition(
  expression: string,
  context: { trigger: any; steps: Record<string, any>; variables: Record<string, any> },
): boolean {
  const fn = new Function(
    "trigger",
    "steps",
    "variables",
    `"use strict"; return Boolean(${expression});`,
  );
  return fn(context.trigger, context.steps, context.variables);
}

// ──────────── Variable Initialization ────────────

function initializeVariables(
  definitions: WorkflowVariable[] | undefined,
): Record<string, any> {
  const vars: Record<string, any> = {};
  if (!definitions) return vars;

  for (const v of definitions) {
    if (v.defaultValue !== undefined) {
      vars[v.name] = v.defaultValue;
    } else {
      // Sensible defaults per type
      switch (v.type) {
        case "string":
          vars[v.name] = "";
          break;
        case "number":
          vars[v.name] = 0;
          break;
        case "boolean":
          vars[v.name] = false;
          break;
        case "object":
          vars[v.name] = {};
          break;
        case "array":
          vars[v.name] = [];
          break;
      }
    }
  }
  return vars;
}

// ──────────── Node Execution Handlers ────────────

async function executePluginNode(
  node: PluginNode,
  context: any,
): Promise<any> {
  const cookedParams = WorkflowParser.evalParams(node.params, context);
  return PluginExecutor.execute(node.pluginId, node.action, cookedParams);
}

function executeCodeNode(
  node: CodeNode,
  context: any,
): any {
  const result = runCode(node.script, context, context.variables);

  // Merge variable mutations back into the main context
  Object.assign(context.variables, result.variables);

  // Return exactly what the user returned. 
  // We'll store logs in a side-channel or separate step property.
  return result; 
}

function executeIfNode(
  node: IfNode,
  context: any,
): { branch: "then" | "else" } {
  const result = evaluateCondition(node.condition, context);
  return { branch: result ? "then" : "else" };
}

async function executeLoopNode(
  node: LoopNode,
  context: any,
  workflow: WorkflowItem,
  edges: WorkflowEdge[],
): Promise<{ iterations: number; results: any[] }> {
  // Resolve the collection via template expression
  const collectionExpr = node.collection.trim();
  const templateMatch = /^{{\s*([a-zA-Z0-9_.\[\]]+)\s*}}$/.exec(collectionExpr);

  let collection: any[];
  if (templateMatch) {
    collection = resolvePath(context, templateMatch[1]);
  } else {
    // Try evaluating as a direct context path
    collection = resolvePath(context, collectionExpr);
  }

  if (!Array.isArray(collection)) {
    throw new Error(
      `Loop node collection is not an array. Resolved value: ${typeof collection}`,
    );
  }

  const maxIter = node.maxIterations || 1000;
  const iterations = Math.min(collection.length, maxIter);
  const results: any[] = [];

  // Find "loop-body" edges — nodes to execute per iteration
  const bodyEdges = edges.filter(
    (e) => e.source === getNodeIdFromWorkflow(workflow, node) && e.sourceHandle === "loop-body",
  );

  for (let i = 0; i < iterations; i++) {
    // Inject loop metadata into context
    context.variables["$item"] = collection[i];
    context.variables["$index"] = i;
    context.variables["$total"] = collection.length;

    // Execute body nodes sequentially for each iteration
    for (const edge of bodyEdges) {
      const bodyNode = workflow.nodes[edge.target];
      if (bodyNode) {
        const result = await executeNode(
          edge.target,
          bodyNode,
          context,
          workflow,
          edges,
        );
        results.push(result);
      }
    }
  }

  // Clean up loop variables
  delete context.variables["$item"];
  delete context.variables["$index"];
  delete context.variables["$total"];

  return { iterations, results };
}

async function executeSubWorkflowNode(
  node: SubWorkflowNode,
  context: any,
): Promise<any> {
  const childWorkflow = WorkflowRepository.getWorkflowById(node.workflowId);

  if (!childWorkflow) {
    throw new Error(`Sub-workflow ${node.workflowId} not found`);
  }

  // Build the trigger payload for the child from parent context
  const childTrigger: Record<string, any> = {};
  for (const [childKey, parentPath] of Object.entries(node.inputMapping)) {
    childTrigger[childKey] = resolvePath(context, parentPath);
  }

  // Recursive execution
  const result = await WorkflowEngine.executeWorkflow(childWorkflow, childTrigger);
  return result.context;
}

// ──────────── Unified Node Dispatcher ────────────

async function executeNode(
  nodeId: string,
  node: WorkflowNode,
  context: any,
  workflow: WorkflowItem,
  edges: WorkflowEdge[],
): Promise<any> {
  switch (node.type) {
    case "plugin":
      return executePluginNode(node, context);
    case "code":
      return executeCodeNode(node, context);
    case "if":
      return executeIfNode(node, context);
    case "loop":
      return executeLoopNode(node, context, workflow, edges);
    case "subworkflow":
      return executeSubWorkflowNode(node, context);
    case "trigger":
      // Trigger nodes are entry points — no execution logic
      return { type: "trigger" };
    default:
      throw new Error(`Unknown node type: ${(node as any).type}`);
  }
}

// ──────────── Helper: Get node ID from workflow ────────────

function getNodeIdFromWorkflow(
  workflow: WorkflowItem,
  node: WorkflowNode,
): string {
  for (const [id, n] of Object.entries(workflow.nodes)) {
    if (n === node) return id;
  }
  return "";
}

// ──────────── Main Engine ────────────

export const WorkflowEngine = {
  executeWorkflow: async (
    workflow: WorkflowItem,
    triggerPayload: any,
  ): Promise<any> => {
    const executionId = `exec_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const context = {
      trigger: triggerPayload,
      steps: {} as Record<string, any>,
      variables: initializeVariables(workflow.variables),
    };

    let status = "RUNNING";
    const startTime = Date.now();

    WorkflowRepository.saveExecutionLog(
      executionId,
      workflow.metadata.id,
      status,
      startTime,
      null,
      sanitizeContextForLogging(context),
    );

    try {
      const nodeIds = ["trigger", ...Object.keys(workflow.nodes)];

      // Build in‑degree map & adjacency list from edges
      const inDegree: Record<string, number> = {};
      const adjList: Record<string, WorkflowEdge[]> = {};

      nodeIds.forEach((n) => {
        inDegree[n] = 0;
        adjList[n] = [];
      });

      workflow.edges.forEach((edge: WorkflowEdge) => {
        if (inDegree[edge.target] !== undefined) {
          inDegree[edge.target]++;
          adjList[edge.source]?.push(edge);
        }
      });

      const queue: string[] = nodeIds.filter((n) => inDegree[n] === 0);
      const executed = new Set<string>();

      while (queue.length > 0) {
        const nodeId = queue.shift()!;

        if (executed.has(nodeId)) continue;
        executed.add(nodeId);

        const node = workflow.nodes[nodeId];

        // Handle the virtual "trigger" entry point
        if (nodeId === "trigger") {
          adjList[nodeId].forEach((edge) => {
            inDegree[edge.target]--;
            if (inDegree[edge.target] === 0) {
              queue.push(edge.target);
            }
          });
          continue;
        }

        // Retry logic
        let attempts = 0;
        const maxRetries = node.retryPolicy?.maxRetries ?? 0;
        let success = false;
        let lastError: Error | null = null;

        while (attempts <= maxRetries && !success) {
          try {
            const result = await executeNode(
              nodeId,
              node,
              context,
              workflow,
              workflow.edges,
            );

            if (node.type === "code") {
               const codeResult = result as any;
               context.steps[nodeId] = { 
                 status: "SUCCESS", 
                 output: codeResult.output,
                 logs: codeResult.logs 
               };
            } else {
               context.steps[nodeId] = { status: "SUCCESS", output: result };
            }
            success = true;
          } catch (err: any) {
            attempts++;
            lastError = err;
            context.steps[nodeId] = { status: "FAILED", error: err.message };

            if (attempts <= maxRetries) {
              const interval = node.retryPolicy?.intervalSeconds ?? 2;
              const ms =
                (node.retryPolicy?.backoffStrategy === "exponential"
                  ? Math.pow(2, attempts) * interval
                  : interval) * 1000;
              await delay(ms);
            }
          }
        }

        if (!success) {
          throw new Error(
            `Node ${nodeId} failed after ${attempts} attempts. Last error: ${lastError?.message}`,
          );
        }

        // Release dependent nodes — with conditional edge filtering
        const outEdges = adjList[nodeId] || [];

        if (node.type === "if") {
          // Only follow the branch that matches the evaluation result
          const branch = (context.steps[nodeId]?.output as { branch: string })
            ?.branch;

          for (const edge of outEdges) {
            // Follow edges matching the branch, or edges with no handle (fallback)
            if (
              edge.sourceHandle === branch ||
              (!edge.sourceHandle && branch === "then")
            ) {
              inDegree[edge.target]--;
              if (inDegree[edge.target] === 0) {
                queue.push(edge.target);
              }
            }
            // Edges for the other branch are NOT released — those nodes stay blocked
          }
        } else if (node.type === "loop") {
          // Loop body nodes were already executed inline; release "loop-done" edges
          for (const edge of outEdges) {
            if (
              edge.sourceHandle === "loop-done" ||
              !edge.sourceHandle
            ) {
              inDegree[edge.target]--;
              if (inDegree[edge.target] === 0) {
                queue.push(edge.target);
              }
            }
          }
        } else {
          // Standard: release all downstream edges
          for (const edge of outEdges) {
            inDegree[edge.target]--;
            if (inDegree[edge.target] === 0) {
              queue.push(edge.target);
            }
          }
        }
      }

      status = "SUCCESS";
    } catch (err: any) {
      status = "FAILED";
      context.steps["error"] = err.message;
    } finally {
      WorkflowRepository.saveExecutionLog(
        executionId,
        workflow.metadata.id,
        status,
        startTime,
        Date.now(),
        sanitizeContextForLogging(context),
      );
    }

    return { executionId, status, context };
  },
};
