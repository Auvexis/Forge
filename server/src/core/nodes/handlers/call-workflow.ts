import type { CallWorkflowNode, WorkflowTrigger } from "../../../shared/models/workflow-types.ts";
import { getTriggerEntry } from "../../modules/workflows/workflow-triggers.ts";
import { createNodeHandler } from "../handler.ts";

const CALLABLE_TRIGGER_TYPES = new Set<WorkflowTrigger["type"]>(["manual", "form", "webhook"]);

export const callWorkflowNodeHandler = createNodeHandler<CallWorkflowNode>(
  "call-workflow",
  async ({ node, nodeId, context, services }) => {
    const childWorkflow = services.getWorkflowById(node.targetWorkflowId);
    if (!childWorkflow) {
      throw new Error(`Call workflow target ${node.targetWorkflowId} not found`);
    }
    if (!childWorkflow.metadata.isActive || childWorkflow.metadata.isDraft) {
      throw new Error(`Call workflow target ${node.targetWorkflowId} must be published`);
    }

    const triggerEntry = getTriggerEntry(childWorkflow, node.targetTriggerId);
    if (!triggerEntry) {
      throw new Error(`Call workflow trigger ${node.targetTriggerId} not found`);
    }
    if (!CALLABLE_TRIGGER_TYPES.has(triggerEntry.trigger.type)) {
      throw new Error(`Call workflow trigger ${node.targetTriggerId} is not callable`);
    }

    const triggerPayload = {
      ...(node.inputDefaults ?? {}),
      ...runtimeInputForNode(context, nodeId),
    };
    if (!services.executeWorkflowFromTrigger) {
      throw new Error("Call workflow execution service is not configured");
    }
    const childExecutionId = `exec_call_${nodeId}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const result = await services.executeWorkflowFromTrigger(
      childWorkflow,
      triggerEntry.id,
      triggerPayload,
      childExecutionId,
    );

    return {
      executionId: result?.executionId ?? childExecutionId,
      status: result?.status ?? "UNKNOWN",
      output: result?.context ?? null,
    };
  },
  {
    description: "Calls a published workflow through a callable trigger.",
    execution: "long-running",
    sideEffects: ["workflow-dispatch"],
    outputs: [{ id: "default", label: "Child execution" }],
    errors: [
      "Call workflow target not found",
      "Call workflow target must be published",
      "Call workflow trigger not found",
      "Call workflow trigger is not callable",
      "Call workflow execution failed",
    ],
  },
);

function runtimeInputForNode(context: { steps?: Record<string, any> }, nodeId: string): Record<string, any> {
  const input = context.steps?.[nodeId]?.input;
  return input && typeof input === "object" && !Array.isArray(input) ? input : {};
}
