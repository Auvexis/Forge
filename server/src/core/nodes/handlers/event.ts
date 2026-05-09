import type { EventNode } from "../../../shared/models/workflow-types.ts";
import { WorkflowParser } from "../../modules/workflows/parser.ts";
import { createNodeHandler } from "../handler.ts";

export const eventNodeHandler = createNodeHandler<EventNode>(
  "event",
  async ({ node, context, services }) => {
    const payload = WorkflowParser.evalParams(node.payloadMapping ?? {}, context);

    const result = await services.emitInternalEvent({
      name: node.eventName,
      payload,
      emittedBy: context._workflowId,
      timestamp: Date.now(),
    });

    return {
      eventName: node.eventName,
      payload,
      triggered: result.triggered,
    };
  },
  {
    description: "Emits an internal Nod8 event and records triggered executions.",
    execution: "external-io",
    sideEffects: ["event-emit", "workflow-dispatch"],
    outputs: [{ id: "default", label: "Event" }],
    errors: ["Internal event dispatch failed"],
  },
);
