import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OutputParserExecutionService } from "../../modules/ai-services/output-parser-execution-service.ts";

describe("Structured JSON Parser", () => {
  const schema = {
    type: "object",
    required: ["category"],
    properties: { category: { type: "string" } },
    additionalProperties: false,
  };

  it("parses plain and fenced JSON", async () => {
    const parser = new OutputParserExecutionService(schema, true);
    assert.deepEqual(await parser.parse('{"category":"billing"}'), { category: "billing" });
    assert.deepEqual(await parser.parse('```json\n{"category":"support"}\n```'), { category: "support" });
  });

  it("reports exact AJV validation paths", async () => {
    const parser = new OutputParserExecutionService(schema, true);
    await assert.rejects(
      parser.parse('{"category":42}'),
      /Structured JSON Parser validation failed at \/category: must be string/,
    );
  });

  it("rejects malformed JSON without repair", async () => {
    const parser = new OutputParserExecutionService(schema, true);
    await assert.rejects(parser.parse('{"category":'), /Structured JSON Parser could not parse JSON/);
  });
});
