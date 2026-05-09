import { workflowEventBus } from "./event-bus.ts";
import { sanitizeContextForLogging } from "./execution-context.ts";
import type { WorkflowExecutionContext } from "../../nodes/types.ts";
import type { WorkflowNode } from "../../../shared/models/workflow-types.ts";

export function emitNodeStart(workflowId: string, executionId: string, nodeId: string): void {
  workflowEventBus.emitWorkflowEvent({
    executionId,
    workflowId,
    type: "node:start",
    nodeId,
    timestamp: Date.now(),
  });
}

export function emitNodeSuccess(
  workflowId: string,
  executionId: string,
  nodeId: string,
  result: any,
  node?: WorkflowNode,
): void {
  const data = node?.type === "code" ? result.output : result;
  workflowEventBus.emitWorkflowEvent({
    executionId,
    workflowId,
    type: "node:success",
    nodeId,
    timestamp: Date.now(),
    data: sanitizeContextForLogging(data),
  });
}

export function emitNodeFailure(
  workflowId: string,
  executionId: string,
  nodeId: string,
  error: Error,
): void {
  workflowEventBus.emitWorkflowEvent({
    executionId,
    workflowId,
    type: "node:failed",
    nodeId,
    timestamp: Date.now(),
    error: error.message,
  });
}

export function recordSuccessfulStep(
  context: WorkflowExecutionContext,
  nodeId: string,
  node: WorkflowNode,
  result: any,
): void {
  if (node.type === "code") {
    context.steps[nodeId] = {
      status: "SUCCESS",
      output: result.output,
      logs: result.logs,
    };
    return;
  }

  context.steps[nodeId] = { status: "SUCCESS", output: result };
}
