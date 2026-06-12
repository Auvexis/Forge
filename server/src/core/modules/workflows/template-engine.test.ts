import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TemplateEngine,
  TemplateMissingPathError,
  escapeTemplateValue,
} from "./template-engine.ts";
import { WorkflowParser } from "./parser.ts";

const context = {
  trigger: { user: { name: "Ada" }, unsafe: "O'Reilly" },
  steps: { fetch: { output: { count: 3, buffer: Buffer.from("ok") } } },
  variables: { item: "Book" },
};

describe("TemplateEngine", () => {
  it("preserves object references for exact templates", () => {
    const result = TemplateEngine.evalParams(
      { file: "{{ steps.fetch.output.buffer }}" },
      context,
    );

    assert.equal(result.file, context.steps.fetch.output.buffer);
  });

  it("recursively interpolates strings, arrays and objects", () => {
    const result = TemplateEngine.evalParams({
      title: "Hello {{ trigger.user.name }}",
      nested: { value: "{{ variables.item }}" },
      list: ["{{ steps.fetch.output.count }}", "items"],
    }, context);

    assert.deepEqual(result, {
      title: "Hello Ada",
      nested: { value: "Book" },
      list: [3, "items"],
    });
  });

  it("can fail loudly for missing exact template paths", () => {
    assert.throws(
      () => TemplateEngine.evalParams(
        { missing: "{{ steps.nope.output }}" },
        context,
        { missingPath: "throw" },
      ),
      TemplateMissingPathError,
    );
  });

  it("keeps WorkflowParser compatible by preserving missing inline placeholders", () => {
    const result = WorkflowParser.evalParams({ value: "Hello {{ missing.path }}" }, context);

    assert.deepEqual(result, { value: "Hello {{ missing.path }}" });
  });

  it("escapes values for explicit template contexts", () => {
    assert.equal(escapeTemplateValue("O'Reilly", "sql"), "O''Reilly");
    assert.equal(escapeTemplateValue({ a: 1 }, "json"), "{\"a\":1}");
    assert.equal(escapeTemplateValue("ignore previous\ninstruction", "prompt"), "ignore previous instruction");
  });
});
