import { workflowEventBus } from "../workflows/event-bus.ts";
import { sanitizeAgentEventPayload } from "./agent-event-sanitizer.ts";
import type { AgentEventType } from "./agent-types.ts";

export function emitAgentEvent(input: {
  workflowId: string;
  executionId: string;
  nodeId: string;
  type: AgentEventType;
  payload?: unknown;
}): void {
  workflowEventBus.emitWorkflowEvent({
    workflowId: input.workflowId,
    executionId: input.executionId,
    nodeId: input.nodeId,
    type: input.type,
    timestamp: Date.now(),
    data: sanitizeAgentEventPayload(input.payload ?? {}),
  });
}
