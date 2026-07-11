import type { EventListenerNode, EventNode } from "../../../shared/models/workflow-types.ts";
import { WorkflowParser } from "../../modules/workflows/parser.ts";
import { createNodeHandler } from "../handler.ts";

export const eventNodeHandler = createNodeHandler<EventNode>(
  "event",
  async ({ node, context, services, workflow }) => {
    const mapping: Record<string, string> = {};
    for (const param of node.payloadParams || []) {
      if (param.key) {
        mapping[param.key] = param.value;
      }
    }
    const payload = WorkflowParser.evalParams(mapping, context);

    const result = await services.emitInternalEvent({
      name: node.eventName,
      payload,
      emittedBy: context._workflowId,
      timestamp: Date.now(),
    });

    const localTriggered: string[] = [];
    for (const [id, n] of Object.entries(workflow.nodes)) {
      if (n.type === "event-listener" && (n as EventListenerNode).eventName === node.eventName) {
        localTriggered.push(id);
      }
    }

    return {
      eventName: node.eventName,
      payload,
      triggered: [...result.triggered, ...localTriggered],
    };
  },
  {
    description: "Emits an internal Fabric event and records triggered executions.",
    execution: "external-io",
    sideEffects: ["event-emit", "workflow-dispatch"],
    outputs: [{ id: "default", label: "Event" }],
    errors: ["Internal event dispatch failed"],
  },
);
