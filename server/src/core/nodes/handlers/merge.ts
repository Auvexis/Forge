import type { MergeNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const mergeNodeHandler = createNodeHandler<MergeNode>("merge", () => ({}));
