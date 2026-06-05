import { InternalEventBus } from "../events/internal-event-bus.ts";
import {
  AgentApprovalService,
  type AgentToolApproval,
} from "../agent-runtime/agent-approval-service.ts";
import { AgentToolApprovalRequiredError } from "../agent-runtime/agent-errors.ts";
import { emitAgentEvent } from "../agent-runtime/agent-event-bus.ts";
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
import { getTriggerEntry } from "./workflow-triggers.ts";
import type {
  NodeHandlerInput,
  NodeHandlerServices,
  WorkflowExecutionContext,
} from "../../nodes/types.ts";
import type {
  EventListenerNode,
  MergeNode,
  PluginNode,
  TriggerNode,
  WorkflowItem,
  WorkflowNode,
} from "../../../shared/models/workflow-types.ts";

export { sanitizeContextForLogging } from "./execution-context.ts";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const utilityNodeRegistry = createUtilityNodeRegistry();

class WorkflowWaitingApprovalError extends Error {
  public readonly approvalId: string;

  constructor(approvalId: string) {
    super("Workflow is waiting for agent tool approval");
    this.approvalId = approvalId;
  }
}

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
    return WorkflowEngine.executeWorkflowFromTrigger(
      workflow,
      "trigger",
      triggerPayload,
      executionId,
    );
  },

  executeWorkflowFromTrigger: async (
    workflow: WorkflowItem,
    triggerNodeId: string,
    triggerPayload: any,
    executionId?: string,
    options: { targetNodeId?: string } = {},
  ): Promise<any> => {
    const triggerEntry = getTriggerEntry(workflow, triggerNodeId);
    if (!triggerEntry) {
      throw new Error(`Trigger node "${triggerNodeId}" was not found`);
    }
    if (triggerEntry.disabled) {
      throw new Error(`Trigger node "${triggerNodeId}" is disabled`);
    }

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

    const triggerNode =
      triggerEntry.node ??
      ({
        type: "trigger",
        name: triggerEntry.name,
        trigger: triggerEntry.trigger,
      } satisfies TriggerNode);
    recordSuccessfulStep(context, triggerNodeId, triggerNode, triggerPayload);

    try {
      assertNoAgentConfigNodeCycles(workflow);
      const { adjList } = createGraph(workflow);
      const reachable = options.targetNodeId
        ? collectNodesOnPathsToTarget(triggerNodeId, options.targetNodeId, adjList)
        : collectReachableNodeIds(triggerNodeId, adjList);
      const branchInDegree = createBranchInDegree(reachable, adjList, triggerNodeId);
      const queue: string[] = [];
      const executed = new Set<string>();

      const enqueueTarget = (targetId: string) => {
        if (!reachable.has(targetId)) return;
        branchInDegree[targetId]--;
        const targetNode = workflow.nodes[targetId];
        const isWaitAny =
          targetNode?.type === "merge" && (targetNode as MergeNode).mode === "wait-any";

        if (isWaitAny) {
          if (!executed.has(targetId) && !queue.includes(targetId)) queue.push(targetId);
          return;
        }

        if (branchInDegree[targetId] <= 0) queue.push(targetId);
      };

      for (const edge of adjList[triggerNodeId] || []) enqueueTarget(edge.target);

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

        const node = workflow.nodes[nodeId];
        if (!node || node.type === "trigger" || node.disabled === true || isAgentConfigNode(node)) {
          for (const edge of adjList[nodeId]) enqueueTarget(edge.target);
          continue;
        }

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
          enqueueMatchingEventListeners(
            workflow,
            nodeId,
            context,
            executed,
            queue,
            adjList,
            reachable,
            branchInDegree,
          );
        }

        const output = context.steps[nodeId]?.output;
        if (options.targetNodeId && nodeId === options.targetNodeId) {
          queue.length = 0;
          continue;
        }

        for (const edge of adjList[nodeId] || []) {
          if (shouldReleaseEdge(node, edge, output)) enqueueTarget(edge.target);
        }
      }

      status = "SUCCESS";
    } catch (error: any) {
      if (CancellationRegistry.isCancelled(execId)) {
        status = "CANCELLED";
      } else if (error instanceof WorkflowWaitingApprovalError) {
        status = "WAITING_APPROVAL";
        context.steps.pendingApprovalId = error.approvalId;
      } else {
        status = "FAILED";
        context.steps.error = error.message;
      }
    } finally {
      workflowEventBus.emitWorkflowEvent({
        executionId: execId,
        workflowId: workflow.metadata.id,
        type:
          status === "SUCCESS"
            ? "workflow:success"
            : status === "CANCELLED"
              ? "workflow:cancelled"
              : status === "WAITING_APPROVAL"
                ? "workflow:waiting-approval"
                : "workflow:failed",
        timestamp: Date.now(),
      });

      WorkflowRepository.saveExecutionLog(
        execId,
        workflow.metadata.id,
        status,
        startTime,
        status === "WAITING_APPROVAL" ? null : Date.now(),
        sanitizeContextForLogging(context),
      );

      notifyPluginExecutionEnd(execId, status);
      if (status !== "WAITING_APPROVAL") CancellationRegistry.clear(execId);
    }

    return { executionId: execId, status, context };
  },

  resumeExecutionAfterAgentApproval: async (
    approval: AgentToolApproval,
  ): Promise<any> => {
    if (approval.status !== "approved") {
      return { executionId: approval.executionId, status: "CANCELLED", context: null };
    }

    const workflow = WorkflowRepository.getWorkflowById(approval.workflowId);
    if (!workflow) throw new Error(`Workflow "${approval.workflowId}" was not found`);

    const execution = WorkflowRepository.getWorkflowExecutionById(approval.executionId);
    if (!execution) throw new Error(`Execution "${approval.executionId}" was not found`);

    const request = approval.request as { nodeId?: unknown };
    const nodeId = typeof request.nodeId === "string" ? request.nodeId : "";
    if (!nodeId || !workflow.nodes[nodeId]) {
      throw new Error("Agent approval is missing a resumable node id");
    }

    const context = execution.context_state as WorkflowExecutionContext;
    context.trigger = {
      ...(context.trigger ?? {}),
      approvalToken: "approved",
      approvalId: approval.id,
      approvalToolName: approval.toolName,
      approvalToolArgs: approvalRequestArgs(approval.request),
      approvalToolResumeState: approvalRequestResumeState(approval.request),
    };
    const startTime = Number(execution.start_time ?? Date.now());

    workflowEventBus.emitWorkflowEvent({
      executionId: approval.executionId,
      workflowId: approval.workflowId,
      type: "agent:approval-resumed",
      nodeId,
      timestamp: Date.now(),
      data: { approvalId: approval.id, toolName: approval.toolName },
    });

    return continueWorkflowExecution({
      workflow,
      triggerNodeId: findTriggerNodeForExecution(workflow, context),
      context,
      executionId: approval.executionId,
      startTime,
      initialQueue: [nodeId],
      executed: successfulStepIds(context, nodeId),
    });
  },

  executeSingleNode: async (
    workflow: WorkflowItem,
    nodeId: string,
    nodeConfigOverride: WorkflowNode,
    executionCacheContext?: WorkflowExecutionContext,
  ): Promise<any> => {
    const execId = `exec_test_${Date.now()}`;
    const context = createExecutionContext(
      workflow,
      executionCacheContext?.trigger ?? {},
      execId,
    );

    if (executionCacheContext) {
      context.steps = {
        ...context.steps,
        ...(executionCacheContext.steps ?? {}),
      };
      context.variables = {
        ...context.variables,
        ...(executionCacheContext.variables ?? {}),
      };
      context._event_payloads = {
        ...context._event_payloads,
        ...(executionCacheContext._event_payloads ?? {}),
      };
    }

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

async function continueWorkflowExecution(input: {
  workflow: WorkflowItem;
  triggerNodeId: string;
  context: WorkflowExecutionContext;
  executionId: string;
  startTime: number;
  initialQueue: string[];
  executed: Set<string>;
}): Promise<any> {
  const {
    workflow,
    triggerNodeId,
    context,
    executionId,
    startTime,
    initialQueue,
    executed,
  } = input;
  let status = "RUNNING";

  try {
    assertNoAgentConfigNodeCycles(workflow);
    const { adjList } = createGraph(workflow);
    const reachable = collectReachableNodeIds(triggerNodeId, adjList);
    const branchInDegree = createBranchInDegree(reachable, adjList, triggerNodeId);
    const queue = [...initialQueue];

    const enqueueTarget = (targetId: string) => {
      if (!reachable.has(targetId)) return;
      branchInDegree[targetId]--;
      const targetNode = workflow.nodes[targetId];
      const isWaitAny =
        targetNode?.type === "merge" && (targetNode as MergeNode).mode === "wait-any";

      if (isWaitAny) {
        if (!executed.has(targetId) && !queue.includes(targetId)) queue.push(targetId);
        return;
      }

      if (branchInDegree[targetId] <= 0) queue.push(targetId);
    };

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (executed.has(nodeId)) continue;

      if (CancellationRegistry.consume(executionId)) {
        status = "CANCELLED";
        break;
      }

      executed.add(nodeId);

      const node = workflow.nodes[nodeId];
      if (!node || node.type === "trigger" || node.disabled === true || isAgentConfigNode(node)) {
        for (const edge of adjList[nodeId]) enqueueTarget(edge.target);
        continue;
      }

      recordNodeStart(context, nodeId);
      emitNodeStart(workflow.metadata.id, executionId, nodeId);

      await executeWithRetry({
        nodeId,
        node,
        context,
        workflow,
        executionId,
      });

      if (node.type === "event") {
        enqueueMatchingEventListeners(
          workflow,
          nodeId,
          context,
          executed,
          queue,
          adjList,
          reachable,
          branchInDegree,
        );
      }

      const output = context.steps[nodeId]?.output;
      for (const edge of adjList[nodeId] || []) {
        if (shouldReleaseEdge(node, edge, output)) enqueueTarget(edge.target);
      }
    }

    if (status === "RUNNING") status = "SUCCESS";
  } catch (error: any) {
    if (CancellationRegistry.isCancelled(executionId)) {
      status = "CANCELLED";
    } else if (error instanceof WorkflowWaitingApprovalError) {
      status = "WAITING_APPROVAL";
      context.steps.pendingApprovalId = error.approvalId;
    } else {
      status = "FAILED";
      context.steps.error = error.message;
    }
  } finally {
    workflowEventBus.emitWorkflowEvent({
      executionId,
      workflowId: workflow.metadata.id,
      type:
        status === "SUCCESS"
          ? "workflow:success"
          : status === "CANCELLED"
            ? "workflow:cancelled"
            : status === "WAITING_APPROVAL"
              ? "workflow:waiting-approval"
              : "workflow:failed",
      timestamp: Date.now(),
    });

    WorkflowRepository.saveExecutionLog(
      executionId,
      workflow.metadata.id,
      status,
      startTime,
      status === "WAITING_APPROVAL" ? null : Date.now(),
      sanitizeContextForLogging(context),
    );

    notifyPluginExecutionEnd(executionId, status);
    if (status !== "WAITING_APPROVAL") CancellationRegistry.clear(executionId);
  }

  return { executionId, status, context };
}

function successfulStepIds(context: WorkflowExecutionContext, pausedNodeId: string): Set<string> {
  return new Set(
    Object.entries(context.steps ?? {})
      .filter(([nodeId, step]) => nodeId !== pausedNodeId && step?.status === "SUCCESS")
      .map(([nodeId]) => nodeId),
  );
}

function findTriggerNodeForExecution(
  workflow: WorkflowItem,
  context: WorkflowExecutionContext,
): string {
  const triggerStep = Object.entries(context.steps ?? {}).find(([, step]) => {
    return step?.status === "SUCCESS" && step?.output === context.trigger;
  });
  if (triggerStep?.[0]) return triggerStep[0];

  return Object.entries(workflow.nodes).find(([, node]) => node.type === "trigger")?.[0] ?? "trigger";
}

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
      if (error instanceof AgentToolApprovalRequiredError) {
        const approvalId = createAgentApprovalForPausedNode({
          error,
          nodeId,
          context,
          workflow,
          executionId,
        });
        context.steps[nodeId] = {
          ...(context.steps[nodeId] ?? {}),
          status: "WAITING_APPROVAL",
          approvalId,
          endedAt: Date.now(),
          attempts: attempts + 1,
        };
        throw new WorkflowWaitingApprovalError(approvalId);
      }

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
        const strategy = node.retryPolicy?.backoffStrategy ?? "fixed";
        const multiplier =
          strategy === "exponential"
            ? Math.pow(2, attempts - 1)
            : strategy === "linear"
              ? attempts
              : 1;
        const ms = multiplier * interval * 1000;
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
  adjList: Record<string, WorkflowItem["edges"]>,
  reachable: Set<string>,
  branchInDegree: Record<string, number>,
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
      addReachableListenerBranch(listenerId, adjList, reachable, branchInDegree);
      queue.push(listenerId);
    }
  }
}

function approvalRequestArgs(request: unknown): Record<string, any> | undefined {
  if (!request || typeof request !== "object" || Array.isArray(request)) return undefined;
  const args = (request as { args?: unknown }).args;
  return args && typeof args === "object" && !Array.isArray(args)
    ? args as Record<string, any>
    : undefined;
}

function approvalRequestResumeState(request: unknown): unknown {
  if (!request || typeof request !== "object" || Array.isArray(request)) return undefined;
  return (request as { resumeState?: unknown }).resumeState;
}

function createAgentApprovalForPausedNode(input: {
  error: AgentToolApprovalRequiredError;
  nodeId: string;
  context: WorkflowExecutionContext;
  workflow: WorkflowItem;
  executionId: string;
}): string {
  const approvalId = `approval_${crypto.randomUUID()}`;
  const triggerPayload = input.context.trigger ?? {};
  const profileId = String(triggerPayload.profileId ?? triggerPayload.profile_id ?? "default");
  const sessionId = optionalString(triggerPayload.sessionId ?? triggerPayload.session_id);
  const request = {
    ...input.error.approvalRequest,
    nodeId: input.nodeId,
  };

  new AgentApprovalService(WorkflowRepository.database()).create({
    id: approvalId,
    profileId,
    workflowId: input.workflow.metadata.id,
    executionId: input.executionId,
    sessionId,
    toolName: input.error.approvalRequest.toolName,
    request,
  });

  emitAgentEvent({
    workflowId: input.workflow.metadata.id,
    executionId: input.executionId,
    nodeId: input.nodeId,
    type: "agent:approval-created",
    payload: {
      approvalId,
      executionId: input.executionId,
      toolName: input.error.approvalRequest.toolName,
      sideEffect: input.error.approvalRequest.sideEffect,
      args: input.error.approvalRequest.args,
    },
  });

  return approvalId;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function addReachableListenerBranch(
  listenerId: string,
  adjList: Record<string, WorkflowItem["edges"]>,
  reachable: Set<string>,
  branchInDegree: Record<string, number>,
): void {
  const listenerReachable = collectReachableNodeIds(listenerId, adjList);
  const newReachable = new Set<string>();

  for (const nodeId of listenerReachable) {
    if (reachable.has(nodeId)) continue;
    reachable.add(nodeId);
    branchInDegree[nodeId] = 0;
    newReachable.add(nodeId);
  }

  for (const source of listenerReachable) {
    if (source === listenerId) continue;
    for (const edge of adjList[source] || []) {
      if (newReachable.has(edge.target)) {
        branchInDegree[edge.target] = (branchInDegree[edge.target] ?? 0) + 1;
      }
    }
  }
}

function collectReachableNodeIds(
  triggerNodeId: string,
  adjList: Record<string, WorkflowItem["edges"]>,
): Set<string> {
  const reachable = new Set<string>([triggerNodeId]);
  const queue = [triggerNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of adjList[current] || []) {
      if (reachable.has(edge.target)) continue;
      reachable.add(edge.target);
      queue.push(edge.target);
    }
  }

  return reachable;
}

function collectNodesOnPathsToTarget(
  triggerNodeId: string,
  targetNodeId: string,
  adjList: Record<string, WorkflowItem["edges"]>,
): Set<string> {
  const reachable = new Set<string>();

  const visit = (nodeId: string, path: string[], visiting: Set<string>): boolean => {
    if (visiting.has(nodeId)) return false;
    const nextPath = [...path, nodeId];
    if (nodeId === targetNodeId) {
      for (const pathNodeId of nextPath) reachable.add(pathNodeId);
      return true;
    }

    visiting.add(nodeId);
    let foundTarget = false;
    for (const edge of adjList[nodeId] || []) {
      if (visit(edge.target, nextPath, visiting)) foundTarget = true;
    }
    visiting.delete(nodeId);

    if (foundTarget) {
      for (const pathNodeId of nextPath) reachable.add(pathNodeId);
    }
    return foundTarget;
  };

  visit(triggerNodeId, [], new Set<string>());
  return reachable;
}

function createBranchInDegree(
  reachable: Set<string>,
  adjList: Record<string, WorkflowItem["edges"]>,
  triggerNodeId: string,
): Record<string, number> {
  const inDegree: Record<string, number> = {};
  for (const nodeId of reachable) inDegree[nodeId] = 0;

  for (const [source, edges] of Object.entries(adjList)) {
    if (source === triggerNodeId || !reachable.has(source)) continue;
    for (const edge of edges) {
      if (!reachable.has(edge.target)) continue;
      inDegree[edge.target] = (inDegree[edge.target] ?? 0) + 1;
    }
  }

  return inDegree;
}

function isAgentConfigNode(node: WorkflowNode | undefined): boolean {
  return node?.type === "ai-model" || node?.type === "ai-memory" || node?.type === "ai-tool";
}

function assertNoAgentConfigNodeCycles(workflow: WorkflowItem): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeId: string, path: string[]): void => {
    if (visiting.has(nodeId)) {
      throw new Error(`AI config node cycle detected: ${[...path, nodeId].join(" -> ")}`);
    }
    if (visited.has(nodeId)) return;

    visiting.add(nodeId);
    for (const edge of workflow.edges) {
      if (edge.source !== nodeId) continue;
      if (!isAgentConfigNode(workflow.nodes[edge.target])) continue;
      visit(edge.target, [...path, nodeId]);
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const [nodeId, node] of Object.entries(workflow.nodes)) {
    if (isAgentConfigNode(node)) visit(nodeId, []);
  }
}
