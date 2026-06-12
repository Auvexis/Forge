import type { TriggerNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const triggerNodeHandler = createNodeHandler<TriggerNode>(
  "trigger",
  () => ({ type: "trigger" }),
  {
    description: "Represents a workflow entry point, including manual, webhook, form, event, and chat triggers.",
    execution: "stateless",
    sideEffects: ["none"],
    outputs: [{ id: "default", label: "Start" }],
    errors: [],
  },
);
