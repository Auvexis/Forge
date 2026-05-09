import type { EventListenerNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const eventListenerNodeHandler = createNodeHandler<EventListenerNode>(
  "event-listener",
  ({ node, context }) => context._event_payloads?.[node.eventName] ?? {},
);
