import { describe, expect, it } from "vitest";
import {
  boundedModelContext,
  modelCapabilities,
} from "./agent-model-capabilities.ts";

describe("agent model capability matrix", () => {
  it("declares structured-output and history support per provider", () => {
    expect(modelCapabilities("openai-compatible")).toMatchObject({
      structuredOutput: "json-schema",
      nativeToolHistory: true,
    });
    expect(modelCapabilities("generic")).toMatchObject({
      structuredOutput: "json-schema",
      nativeToolHistory: false,
    });
    expect(modelCapabilities("ollama")).toMatchObject({
      structuredOutput: "json-schema",
      nativeToolHistory: true,
    });
  });

  it("uses provider defaults and clamps excessive context requests", () => {
    expect(boundedModelContext("ollama")).toBe(8_192);
    expect(boundedModelContext("ollama", 4_096)).toBe(4_096);
    expect(boundedModelContext("ollama", 1_000_000)).toBe(131_072);
    expect(boundedModelContext("openai-compatible", 1_000_000)).toBe(400_000);
  });

  it("returns capability copies that cannot mutate the matrix", () => {
    const capabilities = modelCapabilities("ollama");
    capabilities.maxContextTokens = 1;

    expect(modelCapabilities("ollama").maxContextTokens).toBe(131_072);
  });
});
