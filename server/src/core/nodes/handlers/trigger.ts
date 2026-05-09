import type { TriggerNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const triggerNodeHandler = createNodeHandler<TriggerNode>(
  "trigger",
  () => ({ type: "trigger" }),
  {
    description: "Represents the virtual workflow entry point.",
    execution: "stateless",
    sideEffects: ["none"],
    outputs: [{ id: "default", label: "Start" }],
    errors: [],
  },
);
