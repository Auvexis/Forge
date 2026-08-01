import { describe, expect, it, vi } from "vitest";
import { OpenRouterAdapter, parseOpenRouterJson } from "./openrouter-adapter.ts";

const input = {
  model: "inclusionai/ling-3.0-flash:free",
  credentials: { api_key: "secret", http_referer: "https://fabric.test" },
  messages: [{ role: "user" as const, content: "hello" }],
};

describe("OpenRouterAdapter", () => {
  it("parses JSON wrapped in markdown fences", () => {
    expect(parseOpenRouterJson('```json\n{"tool":"drive_list"}\n```')).toEqual({ tool: "drive_list" });
  });

  it("takes one next action from a model-generated JSON plan", () => {
    expect(parseOpenRouterJson('[{"tool":"drive_list"},{"tool":"drive_download"}]')).toEqual({
      tool: "drive_list",
    });
  });

  it("rejects empty arrays and primitive JSON", () => {
    expect(() => parseOpenRouterJson("[]")).toThrow("Expected a JSON object");
    expect(() => parseOpenRouterJson('"answer"')).toThrow("Expected a JSON object");
  });

  it("extracts JSON from XML-style native tool-call envelopes", () => {
    expect(parseOpenRouterJson([
      "<tool_call>",
      '{"name":"drive_download","arguments":{"fileId":"file_1"}}',
      "</tool_call>",
    ].join("\n"))).toEqual({
      name: "drive_download",
      arguments: { fileId: "file_1" },
    });
  });

  it("extracts balanced JSON around prose and escaped braces", () => {
    expect(parseOpenRouterJson('I will call it: {"tool":"drive_list","query":"a } \\\"quoted\\\" value"} done.')).toEqual({
      tool: "drive_list",
      query: 'a } "quoted" value',
    });
  });

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
    expect(JSON.parse(fetch.mock.calls[0][1].body).response_format).toMatchObject({
      type: "json_schema",
      json_schema: { strict: true, schema: { type: "object" } },
    });
  });

  it("retries JSON decisions without response_format for incompatible routed models", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Provider returned error" } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"tool":"drive_list"}' } }] }), { status: 200 }));
    const adapter = new OpenRouterAdapter({ fetch });

    await expect(adapter.invokeJson(input, { type: "object" })).resolves.toEqual({ tool: "drive_list" });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toHaveProperty("response_format");
    expect(JSON.parse(fetch.mock.calls[1][1].body).response_format).toEqual({ type: "json_object" });
  });

  it("falls back to prompt-only JSON when both structured modes are unsupported", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response("unsupported schema", { status: 400 }))
      .mockResolvedValueOnce(new Response("unsupported JSON mode", { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"mode":"chat"}' } }] }), { status: 200 }));
    const adapter = new OpenRouterAdapter({ fetch });

    await expect(adapter.invokeJson(input, { type: "object" })).resolves.toEqual({ mode: "chat" });
    expect(JSON.parse(fetch.mock.calls[2][1].body)).not.toHaveProperty("response_format");
  });

  it("remembers the compatible structured mode for subsequent decisions", async () => {
    const success = () => new Response(JSON.stringify({ choices: [{ message: { content: '{"mode":"chat"}' } }] }), { status: 200 });
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response("schema unsupported", { status: 400 }))
      .mockResolvedValueOnce(success())
      .mockResolvedValueOnce(success());
    const adapter = new OpenRouterAdapter({ fetch });

    await adapter.invokeJson(input, { type: "object" });
    await adapter.invokeJson(input, { type: "object" });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetch.mock.calls[2][1].body).response_format).toEqual({ type: "json_object" });
  });

  it("exposes the sanitized provider error instead of an OpenAI error", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "No endpoints found for this model" } }), { status: 404, statusText: "Not Found" }));
    const adapter = new OpenRouterAdapter({ fetch });

    await expect(adapter.invokeText(input)).rejects.toMatchObject({
      code: "AGENT_MODEL_PROVIDER_ERROR",
      publicMessage: "OpenRouter model request failed: No endpoints found for this model",
    });
  });

  it("preserves nested upstream errors returned by OpenRouter", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: {
        message: "Provider returned error",
        metadata: {
          provider_name: "Example Provider",
          raw: JSON.stringify({ error: { message: "response_format is not supported" } }),
        },
      },
    }), { status: 400 }));
    const adapter = new OpenRouterAdapter({ fetch });

    await expect(adapter.invokeText(input)).rejects.toMatchObject({
      publicMessage: "OpenRouter model request failed: response_format is not supported; provider: Example Provider",
    });
  });

  it("does not enable reasoning when the node switch is off", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }));
    const adapter = new OpenRouterAdapter({ fetch });
    await adapter.invokeText({ ...input, thinkingEnabled: false, thinkingRequest: { reasoning: { enabled: true } } });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty("reasoning");
  });
});
