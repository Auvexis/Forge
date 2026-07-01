import type { StructuredJsonParserNode } from "../../../shared/models/workflow-types.ts";
import { createNodeHandler } from "../handler.ts";

export const structuredJsonParserNodeHandler = createNodeHandler<StructuredJsonParserNode>(
  "structured-json-parser",
  ({ node }) => ({ schema: node.schema, strict: node.strict, failurePolicy: node.failurePolicy }),
  {
    description: "Parse and validate model output against a JSON schema.",
    execution: "stateless",
    sideEffects: ["none"],
    outputs: [{ id: "source", label: "Output Parser" }],
    errors: ["Malformed JSON", "Schema validation failed"],
  },
);
