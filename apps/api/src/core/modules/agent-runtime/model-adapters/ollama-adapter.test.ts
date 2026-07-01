import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentRuntimeError } from "../agent-errors.ts";
import { OllamaAdapter } from "./ollama-adapter.ts";

describe("OllamaAdapter", () => {
  it("invokes Ollama chat with JSON format and parses the message content", async () => {
    const requests: Array<{ url: string; body: any; headers: Record<string, string> }> = [];
    const adapter = new OllamaAdapter({
      fetch: async (url, init) => {
        requests.push({
          url: String(url),
          body: JSON.parse(String(init?.body)),
          headers: init?.headers as Record<string, string>,
        });
        return response({
          message: {
            role: "assistant",
            content: "{\"fileId\":\"drive_123\"}",
          },
        });
      },
    });

    const result = await adapter.invokeJson<{ fileId: string }>({
      model: "llama3.2",
      baseUrl: "http://localhost:11434/v1",
      messages: [{ role: "user", content: "Return file args" }],
    });

    assert.deepEqual(result, { fileId: "drive_123" });
    assert.equal(requests[0].url, "http://localhost:11434/api/chat");
    assert.equal(requests[0].body.format, "json");
    assert.equal(requests[0].body.stream, false);
    assert.equal(Object.hasOwn(requests[0].body, "keep_alive"), false);
    assert.deepEqual(requests[0].body.messages, [{ role: "user", content: "Return file args" }]);
  });

  it("allows Ollama keep_alive to be configured for model residency", async () => {
    const requests: Array<{ body: any }> = [];
    const adapter = new OllamaAdapter({
      keepAlive: "30s",
      fetch: async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return response({ message: { content: "{\"ok\":true}" } });
      },
    });

    await adapter.invokeJson({
      model: "llama3.2",
      messages: [{ role: "user", content: "json" }],
    });

    assert.equal(requests[0].body.keep_alive, "30s");
  });

  it("passes abort signals to Ollama chat requests", async () => {
    const controller = new AbortController();
    const signals: Array<AbortSignal | null | undefined> = [];
    const adapter = new OllamaAdapter({
      fetch: async (_url, init) => {
        signals.push(init?.signal);
        return response({ message: { content: "{\"ok\":true}" } });
      },
    });

    await adapter.invokeJson({
      model: "llama3.2",
      messages: [{ role: "user", content: "json" }],
      abortSignal: controller.signal,
    });

    assert.equal(signals[0], controller.signal);
  });

  it("disables Ollama thinking by default on every chat request", async () => {
    const requests: Array<{ body: any }> = [];
    const adapter = new OllamaAdapter({
      fetch: async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return response({ message: { content: "done" } });
      },
    });

    await adapter.invokeText({
      model: "qwen3.5:4b",
      messages: [{ role: "user", content: "Boa noite" }],
    });

    assert.equal(requests[0].body.think, false);
  });

  it("preserves Ollama thinking when explicitly enabled", async () => {
    const requests: Array<{ body: any }> = [];
    const adapter = new OllamaAdapter({
      fetch: async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return response({ message: { content: "done" } });
      },
    });

    await adapter.invokeText({
      model: "qwen3.5:4b",
      messages: [{ role: "user", content: "Think deeply" }],
      thinkingEnabled: true,
    });

    assert.equal(requests[0].body.think, true);
  });

  it("sends advanced Ollama model options from AI model configuration", async () => {
    const requests: Array<{ body: any }> = [];
    const adapter = new OllamaAdapter({
      fetch: async (_url, init) => {
        requests.push({ body: JSON.parse(String(init?.body)) });
        return response({ message: { content: "done" } });
      },
    });

    await adapter.invokeText({
      model: "qwen3.5:4b",
      messages: [{ role: "user", content: "Tune this" }],
      thinkingEnabled: true,
      thinkingRequest: { think: "high" },
      temperature: 0.3,
      maxTokens: 512,
      numCtx: 8192,
      topP: 0.85,
      topK: 50,
      repeatPenalty: 1.15,
      seed: 456,
      keepAlive: "20m",
      ollamaOptions: { mirostat: 2 },
    });

    assert.equal(requests[0].body.think, "high");
    assert.equal(requests[0].body.keep_alive, "20m");
    assert.deepEqual(requests[0].body.options, {
      mirostat: 2,
      temperature: 0.3,
      num_predict: 512,
      num_ctx: 8192,
      top_p: 0.85,
      top_k: 50,
      repeat_penalty: 1.15,
      seed: 456,
    });
  });

  it("sends bearer auth only when credentials provide an api key", async () => {
    const headers: Record<string, string>[] = [];
    const adapter = new OllamaAdapter({
      fetch: async (_url, init) => {
        headers.push(init?.headers as Record<string, string>);
        return response({ message: { content: "{\"ok\":true}" } });
      },
    });

    await adapter.invokeJson({
      model: "llama3.2",
      baseUrl: "https://ollama.example.test",
      credentials: { api_key: "ollama-secret" },
      messages: [{ role: "user", content: "json" }],
    });

    assert.equal(headers[0].Authorization, "Bearer ollama-secret");
  });

  it("rejects invalid JSON returned by Ollama", async () => {
    const adapter = new OllamaAdapter({
      fetch: async () => response({ message: { content: "not json" } }),
    });

    await assert.rejects(
      adapter.invokeJson({
        model: "llama3.2",
        messages: [{ role: "user", content: "json" }],
      }),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_MODEL_JSON_INVALID",
    );
  });

  it("generates plans with the provided JSON schema format", async () => {
    const requests: any[] = [];
    const adapter = new OllamaAdapter({
      fetch: async (_url, init) => {
        requests.push(JSON.parse(String(init?.body)));
        return response({ message: { content: "{\"steps\":[]}" } });
      },
    });

    const result = await adapter.generatePlan({
      model: "llama3.2",
      messages: [{ role: "user", content: "plan" }],
    }, {
      type: "object",
      properties: { steps: { type: "array" } },
    });

    assert.deepEqual(result, { steps: [] });
    assert.deepEqual(requests[0].format, {
      type: "object",
      properties: { steps: { type: "array" } },
    });
  });

  it("repairs plan steps and rejects invalid repair JSON", async () => {
    const adapter = new OllamaAdapter({
      fetch: async () => response({ message: { content: "not json" } }),
    });

    await assert.rejects(
      adapter.repairPlanStep({
        model: "llama3.2",
        messages: [{ role: "user", content: "repair" }],
      }, {
        type: "object",
        properties: { params: { type: "object" } },
      }),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_MODEL_JSON_INVALID",
    );
  });

  it("generates final responses as text", async () => {
    const adapter = new OllamaAdapter({
      fetch: async () => response({ message: { content: "done" } }),
    });

    const result = await adapter.generateFinalResponse({
      model: "llama3.2",
      messages: [{ role: "user", content: "final" }],
    });

    assert.equal(result, "done");
  });
});

function response(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  } as Response;
}
