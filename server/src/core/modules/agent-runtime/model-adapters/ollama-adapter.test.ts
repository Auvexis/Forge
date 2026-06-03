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
});

function response(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  } as Response;
}
