import type { TriggerNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const triggerNodeHandler = createNodeHandler<TriggerNode>(
  "trigger",
  () => ({ type: "trigger" }),
);
