import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentRuntimeError } from "../agent-errors.ts";
import { OpenAiAdapter } from "./openai-adapter.ts";

describe("OpenAiAdapter", () => {
  it("sends text requests to the OpenAI Responses API without thinking fields", async () => {
    const calls: Array<{ url: string; body: any; headers: Record<string, string> }> = [];
    const adapter = new OpenAiAdapter({
      fetch: async (url, init) => {
        calls.push({
          url: String(url),
          body: JSON.parse(String(init?.body)),
          headers: init?.headers as Record<string, string>,
        });
        return response({ output_text: "hello" });
      },
    });

    const result = await adapter.invokeText({
      model: "gpt-4.1-mini",
      credentials: { api_key: "sk-test" },
      messages: [{ role: "user", content: "oi" }],
      thinkingEnabled: true,
    });

    assert.equal(result, "hello");
    assert.equal(calls[0].url, "https://api.openai.com/v1/responses");
    assert.equal(calls[0].body.model, "gpt-4.1-mini");
    assert.equal(calls[0].headers.Authorization, "Bearer sk-test");
    assert.equal("think" in calls[0].body, false);
    assert.equal("thinking" in calls[0].body, false);
  });

  it("sends json schema format and parses valid JSON objects", async () => {
    const calls: Array<{ body: any }> = [];
    const adapter = new OpenAiAdapter({
      fetch: async (_url, init) => {
        calls.push({ body: JSON.parse(String(init?.body)) });
        return response({ output_text: "{\"action\":\"continue\"}" });
      },
    });

    const result = await adapter.invokeJson<{ action: string }>({
      model: "gpt-4.1-mini",
      credentials: { api_key: "sk-test" },
      messages: [{ role: "user", content: "decide" }],
    }, {
      type: "object",
      properties: { action: { type: "string" } },
      required: ["action"],
    });

    assert.deepEqual(result, { action: "continue" });
    assert.deepEqual(calls[0].body.text.format, {
      type: "json_schema",
      name: "agent_json",
      schema: {
        type: "object",
        properties: { action: { type: "string" } },
        required: ["action"],
      },
      strict: false,
    });
  });

  it("moves system messages into instructions and preserves non-system order", async () => {
    const calls: Array<{ body: any }> = [];
    const adapter = new OpenAiAdapter({
      fetch: async (_url, init) => {
        calls.push({ body: JSON.parse(String(init?.body)) });
        return response({ output_text: "ok" });
      },
    });

    await adapter.invokeText({
      model: "gpt-4.1-mini",
      credentials: { api_key: "sk-test" },
      messages: [
        { role: "system", content: "You are concise." },
        { role: "user", content: "first" },
        { role: "assistant", content: "second" },
        { role: "user", content: "third" },
      ],
    });

    assert.equal(calls[0].body.instructions, "You are concise.");
    assert.deepEqual(calls[0].body.input, [
      { role: "user", content: "first" },
      { role: "assistant", content: "second" },
      { role: "user", content: "third" },
    ]);
  });

  it("sends canonical tool history as native Responses function items", async () => {
    const calls: Array<{ body: any }> = [];
    const adapter = new OpenAiAdapter({
      fetch: async (_url, init) => {
        calls.push({ body: JSON.parse(String(init?.body)) });
        return response({ output_text: "ok" });
      },
    });

    await adapter.invokeText({
      model: "gpt-4.1-mini",
      credentials: { api_key: "sk-test" },
      messages: [
        { role: "user", content: "Find file" },
        {
          role: "assistant",
          content: "",
          tool_calls: [{
            id: "call_search",
            name: "drive_search",
            arguments: { query: "file.pdf" },
          }],
        },
        {
          role: "tool",
          tool_call_id: "call_search",
          name: "drive_search",
          content: "[{\"name\":\"file.pdf\"}]",
        },
      ],
    });

    assert.deepEqual(calls[0].body.input, [
      { role: "user", content: "Find file" },
      {
        type: "function_call",
        call_id: "call_search",
        name: "drive_search",
        arguments: "{\"query\":\"file.pdf\"}",
      },
      {
        type: "function_call_output",
        call_id: "call_search",
        output: "[{\"name\":\"file.pdf\"}]",
      },
    ]);
  });

  it("uses JSON object mode when no schema is provided", async () => {
    const calls: Array<{ body: any }> = [];
    const adapter = new OpenAiAdapter({
      fetch: async (_url, init) => {
        calls.push({ body: JSON.parse(String(init?.body)) });
        return response({ output_text: "{\"ok\":true}" });
      },
    });

    await adapter.invokeJson({
      model: "gpt-4.1-mini",
      credentials: { api_key: "sk-test" },
      messages: [{ role: "user", content: "json" }],
    });

    assert.deepEqual(calls[0].body.text.format, { type: "json_object" });
  });

  it("rejects invalid JSON with a runtime error", async () => {
    const adapter = new OpenAiAdapter({
      fetch: async () => response({ output_text: "not json" }),
    });

    await assert.rejects(
      adapter.invokeJson({
        model: "gpt-4.1-mini",
        credentials: { api_key: "sk-test" },
        messages: [{ role: "user", content: "json" }],
      }),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_MODEL_JSON_INVALID" &&
        error.publicMessage === "Model returned invalid JSON",
    );
  });

  it("reports API errors without exposing API keys", async () => {
    const adapter = new OpenAiAdapter({
      fetch: async () => response({ error: { message: "bad key sk-secret-value" } }, 500, "Internal Server Error"),
    });

    await assert.rejects(
      adapter.invokeText({
        model: "gpt-4.1-mini",
        credentials: { api_key: "sk-secret-value" },
        messages: [{ role: "user", content: "hello" }],
      }),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_MODEL_PROVIDER_ERROR" &&
        /500 Internal Server Error/.test(error.message) &&
        !/sk-secret-value/.test(error.message),
    );
  });

  it("uses custom base URL and passes abort signals", async () => {
    const controller = new AbortController();
    const calls: Array<{ url: string; signal: AbortSignal | null | undefined }> = [];
    const adapter = new OpenAiAdapter({
      fetch: async (url, init) => {
        calls.push({ url: String(url), signal: init?.signal });
        return response({ output_text: "ok" });
      },
    });

    await adapter.invokeText({
      model: "gpt-4.1-mini",
      baseUrl: "https://gateway.example.test/v1",
      credentials: { api_key: "sk-test" },
      messages: [{ role: "user", content: "hello" }],
      abortSignal: controller.signal,
    });

    assert.equal(calls[0].url, "https://gateway.example.test/v1/responses");
    assert.equal(calls[0].signal, controller.signal);
  });

  it("creates runtime chat model wrappers", async () => {
    const adapter = new OpenAiAdapter({
      fetch: async () => response({ output_text: "{\"steps\":[]}" }),
    });
    const model = adapter.createChatModel({
      model: "gpt-4.1-mini",
      credentials: { api_key: "sk-test" },
    });

    assert.equal((await model.invoke([{ role: "user", content: "hi" }])).content, "{\"steps\":[]}");
    assert.deepEqual(await model.invokeJson({ messages: [{ role: "user", content: "json" }] }), { steps: [] });
    assert.equal(await model.generateFinalResponse({ messages: [{ role: "user", content: "final" }] }), "{\"steps\":[]}");
  });
});

function response(body: unknown, status = 200, statusText = "OK"): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}
