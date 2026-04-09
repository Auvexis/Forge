import { PluginExecutor } from "../plugins/executor.ts";
import { WorkflowParser } from "./parser.ts";
import { WorkflowRepository } from "./repository.ts";
import type { WorkflowItem, WorkflowEdge } from "../../../shared/models/workflow-types.ts";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

function sanitizeContextForLogging(context: any): any {
  if (context instanceof Buffer) {
    return `<Buffer size: ${context.length}>`;
  }
  if (context && typeof context.pipe === "function" && typeof context.on === "function") {
    return `<ReadableStream>`;
  }
  if (Array.isArray(context)) {
    return context.map(sanitizeContextForLogging);
  }
  if (typeof context === "object" && context !== null) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(context)) {
      sanitized[key] = sanitizeContextForLogging(value);
    }
    return sanitized;
  }
  return context;
}

export const WorkflowEngine = {
  executeWorkflow: async (
    workflow: WorkflowItem,
    triggerPayload: any
  ): Promise<any> => {
    const executionId = `exec_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const context = {
      trigger: triggerPayload,
      steps: {} as Record<string, any>,
    };

    let status = "RUNNING";
    const startTime = Date.now();

    WorkflowRepository.saveExecutionLog(
      executionId,
      workflow.metadata.id,
      status,
      startTime,
      null,
      sanitizeContextForLogging(context)
    );

    try {
      const nodes = Object.keys(workflow.nodes);
      const inDegree: Record<string, number> = {};
      const adjList: Record<string, string[]> = {};

      nodes.forEach((n) => {
        inDegree[n] = 0;
        adjList[n] = [];
      });

      workflow.edges.forEach((edge: WorkflowEdge) => {
        if (inDegree[edge.target] !== undefined) {
          inDegree[edge.target]++;
          adjList[edge.source].push(edge.target);
        }
      });

      const queue: string[] = nodes.filter((n) => inDegree[n] === 0);
      const executed = new Set<string>();

      while (queue.length > 0) {
        // Strict Sequential DAG Execution for V1
        const nodeId = queue.shift()!;
        executed.add(nodeId);

        const node = workflow.nodes[nodeId];

        let attempts = 0;
        let maxRetries = node.retryPolicy?.maxRetries ?? 0;
        let success = false;
        let lastError: Error | null = null;

        while (attempts <= maxRetries && !success) {
          try {
            // Parse arguments evaluating the context (Buffers are preserved here via Lodash-like resolver)
            const cookedParams = WorkflowParser.evalParams(
              node.params,
              context
            );

            // Execute Plugin Action
            const result = await PluginExecutor.execute(
              node.pluginId,
              node.action,
              cookedParams
            );

            // Update context
            context.steps[nodeId] = { status: "SUCCESS", output: result };
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
            `Node ${nodeId} failed after ${attempts} attempts. Last error: ${lastError?.message}`
          );
        }

        // Release dependent nodes
        adjList[nodeId].forEach((target) => {
          inDegree[target]--;
          if (inDegree[target] === 0) {
            queue.push(target);
          }
        });
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
        sanitizeContextForLogging(context)
      );
    }

    return { executionId, status, context };
  },
};
