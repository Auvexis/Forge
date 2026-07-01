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

export function emitNodeRetry(
  workflowId: string,
  executionId: string,
  nodeId: string,
  attempt: number,
  maxRetries: number,
  delayMs: number,
  error: Error,
): void {
  workflowEventBus.emitWorkflowEvent({
    executionId,
    workflowId,
    type: "node:retry",
    nodeId,
    timestamp: Date.now(),
    data: { attempt, maxRetries, delayMs },
    error: error.message,
  });
}

export function emitNodeSuccess(
  workflowId: string,
  executionId: string,
  nodeId: string,
  result: any,
  node?: WorkflowNode,
): void {
  const data = node?.type === "code" || node?.type === "call-workflow"
    ? result.output
    : result;
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
  if (node.type === "code" || node.type === "call-workflow") {
    const startedAt = context.steps[nodeId]?.startedAt;
    const attempts = context.steps[nodeId]?.attempts ?? 1;
    const retries = context.steps[nodeId]?.retries ?? [];
    context.steps[nodeId] = {
      status: "SUCCESS",
      output: result.output,
      ...(node.type === "code" ? { logs: result.logs } : {}),
      ...(node.type === "call-workflow" ? { childExecution: result.childExecution } : {}),
      startedAt,
      endedAt: Date.now(),
      attempts,
      retries,
    };
    return;
  }

  context.steps[nodeId] = {
    status: "SUCCESS",
    output: result,
    startedAt: context.steps[nodeId]?.startedAt,
    endedAt: Date.now(),
    attempts: context.steps[nodeId]?.attempts ?? 1,
    retries: context.steps[nodeId]?.retries ?? [],
  };
}

export function recordNodeStart(context: WorkflowExecutionContext, nodeId: string): void {
  context.steps[nodeId] = {
    ...(context.steps[nodeId] ?? {}),
    status: "RUNNING",
    startedAt: Date.now(),
    attempts: context.steps[nodeId]?.attempts ?? 1,
  };
}

export function recordNodeRetry(
  context: WorkflowExecutionContext,
  nodeId: string,
  attempt: number,
  delayMs: number,
  error: Error,
): void {
  const previousRetries = context.steps[nodeId]?.retries ?? [];
  context.steps[nodeId] = {
    ...(context.steps[nodeId] ?? {}),
    status: "RETRYING",
    attempts: attempt,
    error: error.message,
    retries: [
      ...previousRetries,
      {
        attempt,
        delayMs,
        error: error.message,
        at: Date.now(),
      },
    ],
  };
}
