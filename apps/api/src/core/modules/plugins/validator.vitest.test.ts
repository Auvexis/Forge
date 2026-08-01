import { describe, expect, it } from "vitest";
import { validateParams } from "./validator.ts";

describe("plugin parameter validation", () => {
  it("validates canonical base64 fields without unknown-format warnings", () => {
    const schema = {
      type: "object" as const,
      properties: { content: { type: "string" as const, format: "base64" } },
      required: ["content"],
    };

    expect(() => validateParams("base64-test", "valid", schema, { content: "SGVsbG8=" })).not.toThrow();
    expect(() => validateParams("base64-test", "invalid", schema, { content: "not base64!" })).toThrow();
  });
});
