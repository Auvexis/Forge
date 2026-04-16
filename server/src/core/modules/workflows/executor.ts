import { PluginExecutor } from "../plugins/executor.ts";
import { WorkflowParser, resolvePath } from "./parser.ts";
import { WorkflowRepository } from "./repository.ts";
import { runCode } from "./code-runner.ts";
import { workflowEventBus } from "./event-bus.ts";
import { InternalEventBus } from "../events/internal-event-bus.ts";
import { CancellationRegistry } from "./cancellation-registry.ts";
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
  HttpNode,
  EventNode,
  EventListenerNode,
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
  Object.assign(context.variables, result.variables);
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
  execId: string,
): Promise<{ iterations: number; results: any[] }> {
  const collectionExpr = node.collection.trim();
  const templateMatch = /^{{\s*([a-zA-Z0-9_.\[\]]+)\s*}}$/.exec(collectionExpr);

  let collection: any[];
  if (templateMatch) {
    collection = resolvePath(context, templateMatch[1]);
  } else {
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

  const loopNodeId = getNodeIdFromWorkflow(workflow, node);

  // ── 1. BFS to collect the full body sub-graph ──────────────────────────────
  // Start from every node directly attached to the `loop-body` handle and
  // follow edges forward, stopping at the loop node itself or any node that
  // is NOT part of the workflow (safety guard).
  const bodyNodeIds = new Set<string>();
  const bfsQueue: string[] = edges
    .filter((e) => e.source === loopNodeId && e.sourceHandle === "loop-body")
    .map((e) => e.target);

  while (bfsQueue.length > 0) {
    const nId = bfsQueue.shift()!;
    // Stop if we've seen this node, if it's the loop itself, or it doesn't
    // exist in the workflow (edge points to loop-done side or external node).
    if (bodyNodeIds.has(nId) || nId === loopNodeId || !workflow.nodes[nId]) continue;
    bodyNodeIds.add(nId);
    // Enqueue all successors that haven't been visited yet.
    for (const e of edges) {
      if (e.source === nId && !bodyNodeIds.has(e.target)) {
        bfsQueue.push(e.target);
      }
    }
  }

  // ── 2. Collect internal edges (source AND target both inside the body) ──────
  const internalEdges = edges.filter(
    (e) => bodyNodeIds.has(e.source) && bodyNodeIds.has(e.target),
  );

  // ── 3. Per-iteration topological execution of the body sub-graph ───────────
  for (let i = 0; i < iterations; i++) {
    context.variables["$item"] = collection[i];
    context.variables["$index"] = i;
    context.variables["$total"] = collection.length;

    // Build local in-degree map for this iteration.
    const localInDegree: Record<string, number> = {};
    bodyNodeIds.forEach((n) => { localInDegree[n] = 0; });
    internalEdges.forEach((e) => { localInDegree[e.target]++; });

    // Entry nodes are those with no in-body predecessors.
    // Also include every node pointed to by a `loop-body` edge from the loop
    // itself (they have external predecessors that we treat as already resolved).
    const loopBodyTargets = new Set(
      edges
        .filter((e) => e.source === loopNodeId && e.sourceHandle === "loop-body")
        .map((e) => e.target),
    );
    const localQueue: string[] = [...bodyNodeIds].filter(
      (n) => localInDegree[n] === 0 || loopBodyTargets.has(n),
    );
    const localExecuted = new Set<string>();

    while (localQueue.length > 0) {
      const nId = localQueue.shift()!;
      if (localExecuted.has(nId)) continue;
      localExecuted.add(nId);

      const bodyNode = workflow.nodes[nId];
      if (!bodyNode) continue;

      // Emit node:start for visibility in the frontend.
      workflowEventBus.emitWorkflowEvent({
        executionId: execId,
        workflowId: workflow.metadata.id,
        type: "node:start",
        nodeId: nId,
        timestamp: Date.now(),
      });

      try {
        const result = await executeNode(nId, bodyNode, context, workflow, edges, execId);

        if (bodyNode.type === "code") {
          const codeResult = result as any;
          context.steps[nId] = {
            status: "SUCCESS",
            output: codeResult.output,
            logs: codeResult.logs,
          };
          workflowEventBus.emitWorkflowEvent({
            executionId: execId,
            workflowId: workflow.metadata.id,
            type: "node:success",
            nodeId: nId,
            timestamp: Date.now(),
            data: sanitizeContextForLogging(codeResult.output),
          });
        } else {
          context.steps[nId] = { status: "SUCCESS", output: result };
          workflowEventBus.emitWorkflowEvent({
            executionId: execId,
            workflowId: workflow.metadata.id,
            type: "node:success",
            nodeId: nId,
            timestamp: Date.now(),
            data: sanitizeContextForLogging(result),
          });
        }

        results.push(result);
      } catch (err: any) {
        context.steps[nId] = { status: "FAILED", error: err.message };
        workflowEventBus.emitWorkflowEvent({
          executionId: execId,
          workflowId: workflow.metadata.id,
          type: "node:failed",
          nodeId: nId,
          timestamp: Date.now(),
          error: err.message,
        });
        // Propagate to the outer executor so the whole workflow fails cleanly.
        throw err;
      }

      // Release successor nodes inside the body.
      for (const e of internalEdges) {
        if (e.source === nId) {
          localInDegree[e.target]--;
          if (localInDegree[e.target] === 0) localQueue.push(e.target);
        }
      }
    }
  }

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

  const childTrigger: Record<string, any> = {};
  for (const [childKey, parentPath] of Object.entries(node.inputMapping)) {
    childTrigger[childKey] = resolvePath(context, parentPath);
  }

  const childExecutionId = `exec_sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const result = await WorkflowEngine.executeWorkflow(childWorkflow, childTrigger, childExecutionId);
  return result.context;
}

async function executeHttpNode(
  node: HttpNode,
  context: any,
): Promise<any> {
  // 1. Resolve template expressions in URL, headers, and body
  const resolvedUrl = WorkflowParser.evalParams({ url: node.url }, context).url as string;

  const resolvedHeaders: Record<string, string> = {};
  if (node.headers) {
    const cooked = WorkflowParser.evalParams(node.headers, context);
    for (const [k, v] of Object.entries(cooked)) {
      resolvedHeaders[k] = String(v);
    }
  }

  let bodyPayload: string | undefined;
  if (node.body && node.method !== "GET" && node.method !== "DELETE") {
    const cooked = WorkflowParser.evalParams({ body: node.body }, context);
    const bodyStr = String(cooked.body ?? "");

    if (node.bodyType === "json" || !node.bodyType) {
      resolvedHeaders["Content-Type"] =
        resolvedHeaders["Content-Type"] ?? "application/json";
      // Validate & re-serialize JSON  so templates that resolve to objects are handled
      try {
        const parsed = JSON.parse(bodyStr);
        bodyPayload = JSON.stringify(parsed);
      } catch {
        bodyPayload = bodyStr;
      }
    } else if (node.bodyType === "form") {
      resolvedHeaders["Content-Type"] =
        resolvedHeaders["Content-Type"] ?? "application/x-www-form-urlencoded";
      bodyPayload = bodyStr;
    } else {
      bodyPayload = bodyStr;
    }
  }

  // 2. Execute the HTTP request using native fetch (available in Node.js 22+)
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    node.timeout ?? 30000,
  );

  try {
    const response = await fetch(resolvedUrl, {
      method: node.method,
      headers: resolvedHeaders,
      body: bodyPayload,
      redirect: node.followRedirects !== false ? "follow" : "manual",
      signal: controller.signal,
    });

    // 3. Parse response
    let responseData: any;
    const contentType = response.headers.get("content-type") ?? "";

    if (node.responseType === "text") {
      responseData = await response.text();
    } else if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function executeEventNode(
  node: EventNode,
  context: any,
): Promise<any> {
  // Resolve payload mappings via template expressions
  const resolvedPayload = WorkflowParser.evalParams(
    node.payloadMapping ?? {},
    context,
  );

  const result = await InternalEventBus.emit({
    name: node.eventName,
    payload: resolvedPayload,
    emittedBy: context._workflowId as string | undefined,
    timestamp: Date.now(),
  });

  return {
    eventName: node.eventName,
    payload: resolvedPayload,
    triggeredWorkflows: result.triggered,
  };
}

async function executeEventListenerNode(
  node: EventListenerNode,
  context: any,
): Promise<any> {
  const payloads = context._event_payloads || {};
  return payloads[node.eventName] ?? {};
}

// ──────────── Unified Node Dispatcher ────────────

async function executeNode(
  nodeId: string,
  node: WorkflowNode,
  context: any,
  workflow: WorkflowItem,
  edges: WorkflowEdge[],
  execId: string,
): Promise<any> {
  switch (node.type) {
    case "plugin":
      return executePluginNode(node, context);
    case "code":
      return executeCodeNode(node, context);
    case "if":
      return executeIfNode(node, context);
    case "loop":
      return executeLoopNode(node, context, workflow, edges, execId);
    case "subworkflow":
      return executeSubWorkflowNode(node, context);
    case "http":
      return executeHttpNode(node, context);
    case "event":
      return executeEventNode(node, context);
    case "event-listener":
      return executeEventListenerNode(node as EventListenerNode, context);
    case "trigger":
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
    executionId?: string,
  ): Promise<any> => {
    const execId =
      executionId ??
      `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const context = {
      _workflowId: workflow.metadata.id,
      trigger: triggerPayload,
      steps: {} as Record<string, any>,
      variables: initializeVariables(workflow.variables),
      _event_payloads: {} as Record<string, any>,
    };

    let status = "RUNNING";
    const startTime = Date.now();

    // Emit workflow start
    workflowEventBus.emitWorkflowEvent({
      executionId: execId,
      workflowId: workflow.metadata.id,
      type: "workflow:start",
      timestamp: Date.now(),
    });

    WorkflowRepository.saveExecutionLog(
      execId,
      workflow.metadata.id,
      status,
      startTime,
      null,
      sanitizeContextForLogging(context),
    );

    try {
      const nodeIds = ["trigger", ...Object.keys(workflow.nodes)];

      // Build in-degree map & adjacency list from edges
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

      const queue: string[] = nodeIds.filter(
        (n) => inDegree[n] === 0 && workflow.nodes[n]?.type !== "event-listener"
      );
      const executed = new Set<string>();

      while (queue.length > 0) {
        const nodeId = queue.shift()!;

        if (executed.has(nodeId)) continue;

        // ─── Cancellation checkpoint ───
        if (CancellationRegistry.consume(execId)) {
          status = "CANCELLED";
          workflowEventBus.emitWorkflowEvent({
            executionId: execId,
            workflowId: workflow.metadata.id,
            type: "workflow:cancelled",
            timestamp: Date.now(),
          });
          // Save final log and return — skip remaining nodes cleanly
          WorkflowRepository.saveExecutionLog(
            execId,
            workflow.metadata.id,
            status,
            startTime,
            Date.now(),
            sanitizeContextForLogging(context),
          );
          return { executionId: execId, status, context };
        }
        // ───────────────────────────────

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

        // Emit node:start
        workflowEventBus.emitWorkflowEvent({
          executionId: execId,
          workflowId: workflow.metadata.id,
          type: "node:start",
          nodeId,
          timestamp: Date.now(),
        });

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
              execId,
            );

            if (node.type === "code") {
              const codeResult = result as any;
              context.steps[nodeId] = {
                status: "SUCCESS",
                output: codeResult.output,
                logs: codeResult.logs,
              };
              // Emit sanitized code output (already structured with output+logs)
              workflowEventBus.emitWorkflowEvent({
                executionId: execId,
                workflowId: workflow.metadata.id,
                type: "node:success",
                nodeId,
                timestamp: Date.now(),
                data: sanitizeContextForLogging(codeResult.output),
              });
            } else {
              context.steps[nodeId] = { status: "SUCCESS", output: result };
              // Emit sanitized raw result — this is what NodeOutputPanel shows
              workflowEventBus.emitWorkflowEvent({
                executionId: execId,
                workflowId: workflow.metadata.id,
                type: "node:success",
                nodeId,
                timestamp: Date.now(),
                data: sanitizeContextForLogging(result),
              });
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
          // Emit node:failed
          workflowEventBus.emitWorkflowEvent({
            executionId: execId,
            workflowId: workflow.metadata.id,
            type: "node:failed",
            nodeId,
            timestamp: Date.now(),
            error: lastError?.message,
          });

          throw new Error(
            `Node ${nodeId} failed after ${attempts} attempt(s). Last error: ${lastError?.message}`,
          );
        }

        // --- Event Listener Sub-Trigger Enqueue ---
        if (node.type === "event") {
          const emittedName = (context.steps[nodeId]?.output as any)?.eventName;
          const payload = (context.steps[nodeId]?.output as any)?.payload;

          context._event_payloads = context._event_payloads || {};
          context._event_payloads[emittedName] = payload;

          for (const [lId, lNode] of Object.entries(workflow.nodes)) {
            if (lNode.type === "event-listener" && (lNode as EventListenerNode).eventName === emittedName) {
              if (!executed.has(lId) && !queue.includes(lId)) {
                queue.push(lId);
              }
            }
          }
        }
        // ------------------------------------------

        // Release dependent nodes — with conditional edge filtering
        const outEdges = adjList[nodeId] || [];

        if (node.type === "if") {
          const branch = (context.steps[nodeId]?.output as { branch: string })
            ?.branch;

          for (const edge of outEdges) {
            if (
              edge.sourceHandle === branch ||
              (!edge.sourceHandle && branch === "then")
            ) {
              inDegree[edge.target]--;
              if (inDegree[edge.target] === 0) {
                queue.push(edge.target);
              }
            }
          }
        } else if (node.type === "loop") {
          for (const edge of outEdges) {
            if (edge.sourceHandle === "loop-done" || !edge.sourceHandle) {
              inDegree[edge.target]--;
              if (inDegree[edge.target] === 0) {
                queue.push(edge.target);
              }
            }
          }
        } else {
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
      // Emit workflow terminal event
      workflowEventBus.emitWorkflowEvent({
        executionId: execId,
        workflowId: workflow.metadata.id,
        type: status === "SUCCESS" ? "workflow:success" : "workflow:failed",
        timestamp: Date.now(),
      });

      const sanitized = sanitizeContextForLogging(context);

      WorkflowRepository.saveExecutionLog(
        execId,
        workflow.metadata.id,
        status,
        startTime,
        Date.now(),
        sanitized,
      );
    }

    return { executionId: execId, status, context };
  },
};
