import type { MergeNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const mergeNodeHandler = createNodeHandler<MergeNode>("merge", () => ({}), {
  description: "Passively joins incoming branches according to executor merge policy.",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Output" }],
  errors: [],
});
