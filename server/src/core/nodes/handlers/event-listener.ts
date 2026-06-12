import type { EventListenerNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const eventListenerNodeHandler = createNodeHandler<EventListenerNode>(
  "event-listener",
  ({ node, context }) => context._event_payloads?.[node.eventName] ?? {},
  {
    description: "Reads a payload emitted by an internal event node in the same execution.",
    execution: "stateless",
    sideEffects: ["none"],
    outputs: [{ id: "default", label: "Payload" }],
    errors: [],
  },
);
