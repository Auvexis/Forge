import type { MergeNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../registry.ts";

export const mergeNodeHandler = createNodeHandler<MergeNode>("merge", () => ({}));
