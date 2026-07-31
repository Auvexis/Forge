import { describe, expect, it } from "vitest";
import { AgentProviderContinuationRegistry } from "./agent-provider-continuation-registry.ts";

describe("provider continuation adapters", () => {
  const cases = [
    ["ollama", { context: [1, 2, 3] }],
    ["openai", {
      id: "resp_1",
      previous_response_id: "resp_0",
      output: [{ encrypted_content: "encrypted-reasoning" }],
    }],
    ["anthropic", {
      container: "container_1",
      content: [{ type: "thinking", signature: "thinking-signature" }],
    }],
    ["gemini", {
      candidates: [{ content: { parts: [{ thoughtSignature: "thought-signature" }] } }],
    }],
    ["deepseek", {
      id: "chat_1",
      choices: [{ message: { reasoning_content: "private-reasoning" } }],
    }],
  ] as const;

  it.each(cases)("round-trips opaque %s continuation metadata", (provider, response) => {
    const adapter = new AgentProviderContinuationRegistry().get(provider);
    const captured = adapter.capture(response);
    expect(captured).toMatchObject({ provider, formatVersion: 1 });
    expect(adapter.restore(captured!)).toEqual(captured!.payload);
  });

  it.each(cases)("does not expose %s reasoning metadata to model context", (provider, response) => {
    const adapter = new AgentProviderContinuationRegistry().get(provider);
    const captured = adapter.capture(response)!;
    const visible = adapter.modelVisibleContext(captured);
    expect(visible).toEqual({});
    expect(JSON.stringify(visible)).not.toMatch(/reason|thinking|signature|encrypted/i);
  });

  it("rejects cross-provider metadata restoration", () => {
    const registry = new AgentProviderContinuationRegistry();
    const metadata = registry.get("ollama").capture({ context: [1] })!;
    expect(() => registry.get("openai").restore(metadata)).toThrow("Incompatible openai");
  });
});
