import { describe, expect, it, vi } from "vitest";
import { OpenRouterAdapter } from "./openrouter-adapter.ts";

const input = {
  model: "inclusionai/ling-3.0-flash:free",
  credentials: { api_key: "secret", http_referer: "https://fabric.test" },
  messages: [{ role: "user" as const, content: "hello" }],
};

describe("OpenRouterAdapter", () => {
  it("uses the native chat completions endpoint and OpenRouter headers", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }));
    const adapter = new OpenRouterAdapter({ fetch });

    await expect(adapter.invokeText(input)).resolves.toBe("ok");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers).toMatchObject({ Authorization: "Bearer secret", "HTTP-Referer": "https://fabric.test", "X-Title": "Fabric" });
    expect(JSON.parse(init.body)).toMatchObject({ model: input.model, messages: input.messages });
  });

  it("sends structured output and parses the model decision", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"mode":"action"}' } }] }), { status: 200 }));
    const adapter = new OpenRouterAdapter({ fetch });

    await expect(adapter.invokeJson(input, { type: "object" })).resolves.toEqual({ mode: "action" });
    expect(JSON.parse(fetch.mock.calls[0][1].body).response_format).toEqual({ type: "json_object" });
  });

  it("exposes the sanitized provider error instead of an OpenAI error", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "No endpoints found for this model" } }), { status: 404, statusText: "Not Found" }));
    const adapter = new OpenRouterAdapter({ fetch });

    await expect(adapter.invokeText(input)).rejects.toMatchObject({
      code: "AGENT_MODEL_PROVIDER_ERROR",
      publicMessage: "OpenRouter model request failed: No endpoints found for this model",
    });
  });

  it("does not enable reasoning when the node switch is off", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }));
    const adapter = new OpenRouterAdapter({ fetch });
    await adapter.invokeText({ ...input, thinkingEnabled: false, thinkingRequest: { reasoning: { enabled: true } } });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty("reasoning");
  });
});
