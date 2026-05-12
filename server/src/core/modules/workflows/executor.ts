import { InternalEventBus } from "../events/internal-event-bus.ts";
import { PluginExecutor } from "../plugins/executor.ts";
import { PendingWebhookResponseRegistry } from "./pending-webhook-registry.ts";
import { CancellationRegistry } from "./cancellation-registry.ts";
import {
  createExecutionContext,
  sanitizeContextForLogging,
} from "./execution-context.ts";
import {
  emitNodeFailure,
  emitNodeRetry,
  emitNodeStart,
  emitNodeSuccess,
  recordNodeRetry,
  recordNodeStart,
  recordSuccessfulStep,
} from "./execution-events.ts";
import { createGraph, shouldReleaseEdge } from "./graph.ts";
import { notifyPluginExecutionEnd } from "./plugin-lifecycle.ts";
import { WorkflowParser } from "./parser.ts";
import { WorkflowRepository } from "./repository.ts";
import { workflowEventBus } from "./event-bus.ts";
import { createUtilityNodeRegistry } from "../../nodes/registry.ts";
import type {
  NodeHandlerInput,
  NodeHandlerServices,
  WorkflowExecutionContext,
} from "../../nodes/types.ts";
import type {
  EventListenerNode,
  MergeNode,
  PluginNode,
  WorkflowItem,
  WorkflowNode,
} from "../../../shared/models/workflow-types.ts";

export { sanitizeContextForLogging } from "./execution-context.ts";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const utilityNodeRegistry = createUtilityNodeRegistry();

async function executePluginNode(
  node: PluginNode,
  context: WorkflowExecutionContext,
): Promise<any> {
  const cookedParams = WorkflowParser.evalParams(node.params, context);
  cookedParams.executionId = context._executionId;
  return PluginExecutor.execute(node.pluginId, node.action, cookedParams);
}

async function dispatchNode(input: Omit<NodeHandlerInput, "services">): Promise<any> {
  if (input.node.type === "plugin") {
    return executePluginNode(input.node, input.context);
  }

  const services = createNodeServices(input.workflow, input.executionId);
  const handler = utilityNodeRegistry.get(input.node.type);
  return handler.execute({ ...input, services });
}

function createNodeServices(
  workflow: WorkflowItem,
  executionId: string,
): NodeHandlerServices {
  return {
    executeNode: dispatchNode,
    executeWorkflow: WorkflowEngine.executeWorkflow,
    getWorkflowById: WorkflowRepository.getWorkflowById,
    emitInternalEvent: InternalEventBus.emit,
    resolvePendingWebhookResponse: PendingWebhookResponseRegistry.resolve,
    emitNodeStart: (nodeId) => emitNodeStart(workflow.metadata.id, executionId, nodeId),
    emitNodeSuccess: (nodeId, result, node) =>
      emitNodeSuccess(workflow.metadata.id, executionId, nodeId, result, node),
    emitNodeFailure: (nodeId, error) =>
      emitNodeFailure(workflow.metadata.id, executionId, nodeId, error),
    emitWorkflowEvent: (event) => workflowEventBus.emitWorkflowEvent(event),
  };
}

export const WorkflowEngine = {
  executeWorkflow: async (
    workflow: WorkflowItem,
    triggerPayload: any,
    executionId?: string,
  ): Promise<any> => {
    const execId =
      executionId ?? `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const context = createExecutionContext(workflow, triggerPayload, execId);
    const startTime = Date.now();
    let status = "RUNNING";

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
      const { nodeIds, inDegree, adjList } = createGraph(workflow);
      const queue = nodeIds.filter(
        (nodeId) => inDegree[nodeId] === 0 && workflow.nodes[nodeId]?.type !== "event-listener",
      );
      const executed = new Set<string>();

      const enqueueTarget = (targetId: string) => {
        inDegree[targetId]--;
        const targetNode = workflow.nodes[targetId];
        const isWaitAny =
          targetNode?.type === "merge" && (targetNode as MergeNode).mode === "wait-any";

        if (isWaitAny) {
          if (!executed.has(targetId) && !queue.includes(targetId)) queue.push(targetId);
          return;
        }

        if (inDegree[targetId] === 0) queue.push(targetId);
      };

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (executed.has(nodeId)) continue;

        if (CancellationRegistry.consume(execId)) {
          status = "CANCELLED";
          workflowEventBus.emitWorkflowEvent({
            executionId: execId,
            workflowId: workflow.metadata.id,
            type: "workflow:cancelled",
            timestamp: Date.now(),
          });
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

        executed.add(nodeId);

        if (nodeId === "trigger") {
          for (const edge of adjList[nodeId]) enqueueTarget(edge.target);
          continue;
        }

        const node = workflow.nodes[nodeId];
        recordNodeStart(context, nodeId);
        emitNodeStart(workflow.metadata.id, execId, nodeId);

        await executeWithRetry({
          nodeId,
          node,
          context,
          workflow,
          executionId: execId,
        });

        if (node.type === "event") {
          enqueueMatchingEventListeners(workflow, nodeId, context, executed, queue);
        }

        const output = context.steps[nodeId]?.output;
        for (const edge of adjList[nodeId] || []) {
          if (shouldReleaseEdge(node, edge, output)) enqueueTarget(edge.target);
        }
      }

      status = "SUCCESS";
    } catch (error: any) {
      status = "FAILED";
      context.steps.error = error.message;
    } finally {
      workflowEventBus.emitWorkflowEvent({
        executionId: execId,
        workflowId: workflow.metadata.id,
        type:
          status === "SUCCESS"
            ? "workflow:success"
            : status === "CANCELLED"
              ? "workflow:cancelled"
              : "workflow:failed",
        timestamp: Date.now(),
      });

      WorkflowRepository.saveExecutionLog(
        execId,
        workflow.metadata.id,
        status,
        startTime,
        Date.now(),
        sanitizeContextForLogging(context),
      );

      notifyPluginExecutionEnd(execId, status);
    }

    return { executionId: execId, status, context };
  },

  executeSingleNode: async (
    workflow: WorkflowItem,
    nodeId: string,
    nodeConfigOverride: WorkflowNode,
    executionCacheContext?: WorkflowExecutionContext,
  ): Promise<any> => {
    const execId = `exec_test_${Date.now()}`;
    const context = executionCacheContext ?? createExecutionContext(workflow, {}, execId);
    const result = await dispatchNode({
      nodeId,
      node: nodeConfigOverride,
      context,
      workflow,
      edges: workflow.edges,
      executionId: execId,
    });

    return nodeConfigOverride.type === "code" ? result.output : result;
  },
};

async function executeWithRetry(input: {
  nodeId: string;
  node: WorkflowNode;
  context: WorkflowExecutionContext;
  workflow: WorkflowItem;
  executionId: string;
}): Promise<void> {
  const { nodeId, node, context, workflow, executionId } = input;
  let attempts = 0;
  const maxRetries = node.retryPolicy?.maxRetries ?? 0;
  let lastError: Error | null = null;

  while (attempts <= maxRetries) {
    try {
      const result = await dispatchNode({
        nodeId,
        node,
        context,
        workflow,
        edges: workflow.edges,
        executionId,
      });
      recordSuccessfulStep(context, nodeId, node, result);
      emitNodeSuccess(workflow.metadata.id, executionId, nodeId, result, node);
      return;
    } catch (error: any) {
      attempts++;
      lastError = error instanceof Error ? error : new Error(String(error));
      context.steps[nodeId] = {
        ...(context.steps[nodeId] ?? {}),
        status: "FAILED",
        error: lastError.message,
        endedAt: Date.now(),
        attempts,
      };

      if (attempts <= maxRetries) {
        const interval = node.retryPolicy?.intervalSeconds ?? 2;
        const ms =
          (node.retryPolicy?.backoffStrategy === "exponential"
            ? Math.pow(2, attempts) * interval
            : interval) * 1000;
        recordNodeRetry(context, nodeId, attempts + 1, ms, lastError);
        emitNodeRetry(
          workflow.metadata.id,
          executionId,
          nodeId,
          attempts + 1,
          maxRetries,
          ms,
          lastError,
        );
        await delay(ms);
      }
    }
  }

  emitNodeFailure(
    workflow.metadata.id,
    executionId,
    nodeId,
    lastError ?? new Error("Unknown error"),
  );
  throw new Error(
    `Node ${nodeId} failed after ${attempts} attempt(s). Last error: ${lastError?.message}`,
  );
}

function enqueueMatchingEventListeners(
  workflow: WorkflowItem,
  nodeId: string,
  context: WorkflowExecutionContext,
  executed: Set<string>,
  queue: string[],
): void {
  const emittedName = context.steps[nodeId]?.output?.eventName;
  const payload = context.steps[nodeId]?.output?.payload;
  context._event_payloads = context._event_payloads || {};
  context._event_payloads[emittedName] = payload;

  for (const [listenerId, listenerNode] of Object.entries(workflow.nodes)) {
    if (
      listenerNode.type === "event-listener" &&
      (listenerNode as EventListenerNode).eventName === emittedName &&
      !executed.has(listenerId) &&
      !queue.includes(listenerId)
    ) {
      queue.push(listenerId);
    }
  }
}
