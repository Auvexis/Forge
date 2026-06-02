import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiAgentNodeConfig } from "./agent-types.ts";
import { buildAgentGraph, extractStreamDelta, extractThinkingDelta } from "./agent-graph-builder.ts";

describe("agent graph builder", () => {
  it("builds a graph with a model and no tools", async () => {
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakeModel([{ content: "hello from model" }]),
      tools: [],
    });

    const result = await graph.invoke({ userMessage: "hello" });

    assert.equal(result.status, "success");
    assert.equal(result.output, "hello from model");
    assert.equal(result.iterationCount, 1);
    assert.equal(result.toolCallCount, 0);
  });

  it("consumes streamable model text chunks as a final text response", async () => {
    const events: Array<{ type: string; payload?: unknown }> = [];
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakeStreamModel(["hel", { content: "lo" }]),
      tools: [],
      onEvent: (event) => events.push(event),
    });

    const result = await graph.invoke({ userMessage: "hello" });

    assert.equal(result.status, "success");
    assert.equal(result.output, "hello");
    assert.equal(result.iterationCount, 1);
    assert.equal(result.toolCallCount, 0);
    assert.deepEqual(events.map((event) => event.type), [
      "agent:model-start",
      "agent:output-delta",
      "agent:output-delta",
      "agent:model-end",
    ]);
    assert.deepEqual(events.map((event) => event.payload), [
      {
        iteration: 1,
        input: {
          messages: [
            { role: "system", content: "You are helpful." },
            { role: "user", content: "hello" },
          ],
        },
      },
      { delta: "hel" },
      { delta: "lo" },
      { iteration: 1, toolCallCount: 0, output: "hello" },
    ]);
  });

  it("emits thinking deltas from stream chunks before output deltas", async () => {
    const events: Array<{ type: string; payload?: unknown }> = [];
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakeStreamModel([
        { additional_kwargs: { reasoning_content: "thinking " } },
        { content: "answer" },
      ]),
      tools: [],
      onEvent: (event) => events.push(event),
    });

    const result = await graph.invoke({ userMessage: "hello" });

    assert.equal(result.output, "answer");
    assert.deepEqual(events.map((event) => event.type), [
      "agent:model-start",
      "agent:thinking-delta",
      "agent:output-delta",
      "agent:model-end",
    ]);
    assert.deepEqual(events[1].payload, { delta: "thinking " });
  });

  it("consumes promised stream iterables from LangChain-compatible models", async () => {
    const events: Array<{ type: string; payload?: unknown }> = [];
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakePromisedStreamModel(["ol", { content: "lama" }]),
      tools: [],
      onEvent: (event) => events.push(event),
    });

    const result = await graph.invoke({ userMessage: "hello" });

    assert.equal(result.status, "success");
    assert.equal(result.output, "ollama");
    assert.deepEqual(events.map((event) => event.type), [
      "agent:model-start",
      "agent:output-delta",
      "agent:output-delta",
      "agent:model-end",
    ]);
  });

  it("falls back to invoke when stream returns a non-iterable value", async () => {
    const model = fakeBadStreamModel({ invokeContent: "fallback ok" });
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [],
    });

    const result = await graph.invoke({ userMessage: "hello" });

    assert.equal(result.output, "fallback ok");
    assert.equal(model.invokeCalls.length, 1);
    assert.equal(model.streamCalls.length, 1);
  });

  it("extracts stream deltas from generic and LangChain chunk shapes", () => {
    assert.equal(extractStreamDelta("hi"), "hi");
    assert.equal(extractStreamDelta({ content: "hi" }), "hi");
    assert.equal(extractStreamDelta({ message: { content: "hi" } }), "hi");
    assert.equal(extractStreamDelta({ choices: [{ delta: { content: "hi" } }] }), "hi");
    assert.equal(extractStreamDelta({ content: [{ type: "text", text: "hi" }] }), "hi");
    assert.equal(extractStreamDelta({ content: [{ text: "hi" }, { type: "image", url: "x" }] }), "hi");
    assert.equal(extractStreamDelta({ content: [{ type: "text", text: "" }] }), "");
    assert.equal(extractStreamDelta({ notContent: "ignored" }), "");
  });

  it("extracts thinking deltas from provider-specific chunk shapes", () => {
    assert.equal(extractThinkingDelta({ thinking: "hmm" }), "hmm");
    assert.equal(extractThinkingDelta({ reasoning: "hmm" }), "hmm");
    assert.equal(extractThinkingDelta({ reasoning_content: "hmm" }), "hmm");
    assert.equal(extractThinkingDelta({ additional_kwargs: { reasoning_content: "hmm" } }), "hmm");
    assert.equal(extractThinkingDelta({ response_metadata: { reasoning: "hmm" } }), "hmm");
    assert.equal(extractThinkingDelta({ message: { thinking: "hmm" } }), "hmm");
    assert.equal(extractThinkingDelta({ choices: [{ delta: { reasoning: "hmm" } }] }), "hmm");
    assert.equal(extractThinkingDelta({ content: [{ type: "reasoning", text: "hmm" }] }), "hmm");
    assert.equal(extractThinkingDelta({ content: "answer" }), "");
  });

  it("builds a graph that executes requested tools", async () => {
    const toolCalls = [{ id: "call_1", name: "lookup", args: { query: "sailor" } }];
    const tool = fakeTool("lookup", async (args) => ({ result: `found ${args.query}` }));
    const model = fakeModel([
      { content: "", toolCalls },
      { content: "tool result applied" },
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [tool],
    });

    const result = await graph.invoke({ userMessage: "lookup sailor" });

    assert.equal(result.status, "success");
    assert.equal(result.output, "tool result applied");
    assert.equal(result.iterationCount, 2);
    assert.equal(result.toolCallCount, 1);
    assert.deepEqual(result.toolCalls, [{
      toolCallId: "call_1",
      name: "lookup",
      status: "success",
    }]);
    assert.deepEqual(tool.calls, [{ query: "sailor" }]);
    const secondModelCall = model.calls[1] as Array<Record<string, unknown>>;
    const toolMessage = secondModelCall.find((message) => message.role === "tool");
    assert.equal(toolMessage?.tool_call_id, "call_1");
    assert.equal(Object.hasOwn(toolMessage ?? {}, "toolCallId"), false);
  });

  it("sends binary tool results to the model as lightweight refs", async () => {
    const toolCalls = [{ id: "call_1", name: "download", args: { fileId: "video_1" } }];
    const file = Buffer.from("video");
    const tool = fakeTool("download", async () => ({
      download: {
        fileName: "video.mp4",
        mimeType: "video/mp4",
        content: file,
      },
    }));
    const model = fakeModel([
      { content: "", toolCalls },
      { content: "uploaded" },
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [tool],
    });

    await graph.invoke({ userMessage: "download video" });

    const secondModelCall = model.calls[1] as Array<Record<string, unknown>>;
    const toolMessage = secondModelCall.find((message) => message.role === "tool");
    const toolContent = JSON.parse(String(toolMessage?.content));

    assert.deepEqual(toolContent, {
      download: {
        fileName: "video.mp4",
        mimeType: "video/mp4",
        content: {
          type: "Buffer",
          ref: "agent-ref://call_1/download/content",
          size: 5,
          mimeType: "video/mp4",
        },
      },
    });
  });

  it("resolves binary refs in later tool args before invoking the next tool", async () => {
    const file = Buffer.from("video");
    const download = fakeTool("download", async () => ({
      download: {
        fileName: "video.mp4",
        mimeType: "video/mp4",
        content: file,
      },
    }));
    const upload = fakeTool("upload", async () => ({ ok: true }));
    const model = fakeModel([
      { content: "", toolCalls: [{ id: "call_1", name: "download", args: { fileId: "video_1" } }] },
      {
        content: "",
        toolCalls: [{
          id: "call_2",
          name: "upload",
          args: {
            title: "video",
            content: { ref: "agent-ref://call_1/download/content" },
            mimeType: "video/mp4",
          },
        }],
      },
      { content: "done" },
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [download, upload],
    });

    await graph.invoke({ userMessage: "download and upload video" });

    assert.equal((upload.calls[0] as { content?: unknown }).content, file);
  });

  it("emits lightweight refs instead of raw binary tool outputs", async () => {
    const events: Array<{ type: string; payload?: unknown }> = [];
    const file = Buffer.from("video");
    const tool = fakeTool("download", async () => ({
      download: {
        fileName: "video.mp4",
        mimeType: "video/mp4",
        content: file,
      },
    }));
    const model = fakeModel([
      { content: "", toolCalls: [{ id: "call_1", name: "download", args: { fileId: "video_1" } }] },
      { content: "done" },
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [tool],
      onEvent: (event) => events.push(event),
    });

    await graph.invoke({ userMessage: "download video" });

    const toolEnd = events.find((event) => event.type === "agent:tool-end");
    assert.deepEqual((toolEnd?.payload as { output?: unknown }).output, {
      download: {
        fileName: "video.mp4",
        mimeType: "video/mp4",
        content: {
          type: "Buffer",
          ref: "agent-ref://call_1/download/content",
          size: 5,
          mimeType: "video/mp4",
        },
      },
    });
  });

  it("stores large base64 tool results behind refs before sending them to the model", async () => {
    const contentBase64 = Buffer.alloc(192_000, "a").toString("base64");
    const tool = fakeTool("download", async () => ({
      download: {
        fileName: "video.mp4",
        mimeType: "video/mp4",
        contentBase64,
      },
    }));
    const model = fakeModel([
      { content: "", toolCalls: [{ id: "call_1", name: "download", args: { fileId: "video_1" } }] },
      { content: "done" },
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [tool],
    });

    await graph.invoke({ userMessage: "download video" });

    const secondModelCall = model.calls[1] as Array<Record<string, unknown>>;
    const toolMessage = secondModelCall.find((message) => message.role === "tool");
    const toolContent = JSON.parse(String(toolMessage?.content));

    assert.deepEqual(toolContent, {
      download: {
        fileName: "video.mp4",
        mimeType: "video/mp4",
        contentBase64: {
          type: "Base64",
          ref: "agent-ref://call_1/download/contentBase64",
          size: contentBase64.length,
          mimeType: "video/mp4",
        },
      },
    });
  });

  it("compacts large non-binary tool results before sending them to the model", async () => {
    const logs = Array.from({ length: 120 }, (_, index) => ({
      id: `file_${index}`,
      name: `curriculo-${index}.pdf`,
      mimeType: "application/pdf",
      webViewLink: `https://drive.example/files/${index}`,
      description: "x".repeat(4_000),
    }));
    const tool = fakeTool("google_drive_list_files", async () => ({ logs }));
    const model = fakeModel([
      { content: "", toolCalls: [{ id: "call_1", name: "google_drive_list_files", args: { query: "curriculo fullstack" } }] },
      { content: "done" },
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [tool],
    });

    await graph.invoke({ userMessage: "procure meu curriculo" });

    const secondModelCall = model.calls[1] as Array<Record<string, unknown>>;
    const toolMessage = secondModelCall.find((message) => message.role === "tool");
    const toolContent = String(toolMessage?.content);

    assert.ok(Buffer.byteLength(toolContent, "utf8") < 70_000);
    assert.match(toolContent, /"__truncatedItems":95/);
    assert.match(toolContent, /curriculo-0\.pdf/);
    assert.doesNotMatch(toolContent, /curriculo-119\.pdf/);
    assert.doesNotMatch(toolContent, /x{1000}/);
  });

  it("destroys unread binary refs when the agent stops after a download", async () => {
    let destroyed = false;
    const readable = {
      pipe() {
        return this;
      },
      on() {
        return this;
      },
      destroy() {
        destroyed = true;
      },
    };
    const download = fakeTool("download", async () => ({
      download: {
        fileName: "curriculo.pdf",
        mimeType: "application/pdf",
        content: readable,
      },
    }));
    const model = fakeModel([
      { content: "", toolCalls: [{ id: "call_1", name: "download", args: { fileId: "file_1" } }] },
      { content: "downloaded" },
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [download],
    });

    await graph.invoke({ userMessage: "download resume" });

    assert.equal(destroyed, true);
  });

  it("returns waiting-user when the model asks a structured follow-up question", async () => {
    const model = fakeModel([{
      content: JSON.stringify({
        status: "waiting-user",
        reason: "not_found",
        question: "Nao encontrei esse arquivo. Quer tentar outro nome?",
        options: [],
      }),
    }]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [],
    });

    const result = await graph.invoke({ userMessage: "busque video.mp4" });

    assert.equal(result.status, "waiting-user");
    assert.deepEqual(result.output, {
      status: "waiting-user",
      reason: "not_found",
      question: "Nao encontrei esse arquivo. Quer tentar outro nome?",
      options: [],
    });
  });

  it("stops repeated empty tool calls and asks the user instead of looping", async () => {
    const tool = fakeTool("drive_search", async () => ({ files: [] }));
    const repeatedCall = { name: "drive_search", args: { query: "video.mp4" } };
    const model = fakeModel([
      { content: "", toolCalls: [{ id: "call_1", ...repeatedCall }] },
      { content: "", toolCalls: [{ id: "call_2", ...repeatedCall }] },
      { content: "should not be reached" },
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [tool],
    });

    const result = await graph.invoke({ userMessage: "busque video.mp4" });

    assert.equal(result.status, "waiting-user");
    assert.deepEqual(result.output, {
      status: "waiting-user",
      reason: "not_found",
      question: "Nao encontrei resultado para essa busca. Quer tentar outro nome ou ajustar os criterios?",
      repeatedTool: "drive_search",
    });
    assert.equal(tool.calls.length, 1);
  });

  it("turns unrecoverable permission and credential tool errors into waiting-user", async () => {
    const events: Array<{ type: string; payload?: unknown }> = [];
    const tool = fakeTool("youtube_upload", async () => {
      throw new Error("Missing credentials for YouTube");
    });
    const model = fakeModel([
      { content: "", toolCalls: [{ id: "call_1", name: "youtube_upload", args: { title: "video" } }] },
      { content: "should not be reached" },
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [tool],
      onEvent: (event) => events.push(event),
    });

    const result = await graph.invoke({ userMessage: "upload video" });

    assert.equal(result.status, "waiting-user");
    assert.deepEqual(result.output, {
      status: "waiting-user",
      reason: "credential_required",
      question: "Preciso de permissao ou credenciais validas para continuar. Ajuste o acesso e me avise para tentar novamente.",
      repeatedTool: "youtube_upload",
    });
    assert.deepEqual(result.toolCalls, [{
      toolCallId: "call_1",
      name: "youtube_upload",
      status: "failed",
    }]);
    const toolEnd = events.find((event) => event.type === "agent:tool-end");
    assert.deepEqual(toolEnd?.payload, {
      name: "youtube_upload",
      callId: "call_1",
      status: "failed",
      error: "Missing credentials for YouTube",
    });
  });

  it("does not treat ordinary words containing auth as permission errors", async () => {
    const tool = fakeTool("book_lookup", async () => {
      throw new Error("Author not found");
    });
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakeModel([
        { content: "", toolCalls: [{ id: "call_1", name: "book_lookup", args: { title: "Sailor" } }] },
      ]),
      tools: [tool],
    });

    await assert.rejects(
      () => graph.invoke({ userMessage: "find author" }),
      /Author not found/,
    );
  });

  it("keeps explicit permission and credential errors as waiting-user", async () => {
    const cases = [
      { message: "Unauthorized", reason: "permission_required" },
      { message: "Forbidden", reason: "permission_required" },
      { message: "Missing credentials", reason: "credential_required" },
      { message: "API key missing", reason: "credential_required" },
      { message: "OAuth token expired", reason: "credential_required" },
    ];

    for (const item of cases) {
      const tool = fakeTool(`access_check_${item.reason}_${item.message.replace(/\W+/g, "_")}`, async () => {
        throw new Error(item.message);
      });
      const graph = buildAgentGraph({
        agent: agentConfig(),
        model: fakeModel([
          { content: "", toolCalls: [{ id: "call_1", name: tool.name, args: {} }] },
        ]),
        tools: [tool],
      });

      const result = await graph.invoke({ userMessage: "check access" });

      assert.equal(result.status, "waiting-user");
      assert.equal((result.output as Record<string, unknown>).reason, item.reason);
    }
  });

  it("keeps ordinary tool failures as runtime errors", async () => {
    const tool = fakeTool("unstable_tool", async () => {
      throw new Error("temporary network timeout");
    });
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakeModel([
        { content: "", toolCalls: [{ id: "call_1", name: "unstable_tool", args: {} }] },
      ]),
      tools: [tool],
    });

    await assert.rejects(
      () => graph.invoke({ userMessage: "try tool" }),
      /temporary network timeout/,
    );
  });

  it("returns ambiguous repeated tool results as waiting-user with selectable options", async () => {
    const files = [
      { id: "file_1", name: "video final.mp4" },
      { id: "file_2", name: "video draft.mp4" },
    ];
    const tool = fakeTool("drive_search", async () => ({ files }));
    const repeatedCall = { name: "drive_search", args: { query: "video.mp4" } };
    const model = fakeModel([
      { content: "", toolCalls: [{ id: "call_1", ...repeatedCall }] },
      { content: "", toolCalls: [{ id: "call_2", ...repeatedCall }] },
      { content: "should not be reached" },
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [tool],
    });

    const result = await graph.invoke({ userMessage: "busque video.mp4" });

    assert.equal(result.status, "waiting-user");
    assert.deepEqual(result.output, {
      status: "waiting-user",
      reason: "ambiguous_result",
      question: "Encontrei mais de uma opcao. Qual delas devo usar?",
      repeatedTool: "drive_search",
      options: files,
    });
    assert.equal(tool.calls.length, 1);
  });

  it("returns waiting-user immediately when a tool result has multiple options", async () => {
    const files = [
      { id: "file_1", name: "curriculo antigo.pdf" },
      { id: "file_2", name: "curriculo fullstack.pdf" },
    ];
    const search = fakeTool("search_files", async () => ({ files }));
    const download = fakeTool("download_file", async () => ({ ok: true }));
    const model = fakeModel([
      { content: "", toolCalls: [{ id: "call_1", name: "search_files", args: { query: "curriculo" } }] },
      { content: "", toolCalls: [{ id: "call_2", name: "download_file", args: { fileId: "file_1" } }] },
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [search, download],
    });

    const result = await graph.invoke({ userMessage: "procure meu curriculo" });

    assert.equal(result.status, "waiting-user");
    assert.deepEqual(result.output, {
      status: "waiting-user",
      reason: "ambiguous_result",
      question: "Encontrei mais de uma opcao. Qual delas devo usar?",
      repeatedTool: "search_files",
      options: files,
    });
    assert.equal(download.calls.length, 0);
  });

  it("can stop after tool execution without asking the model for a final answer", async () => {
    const toolCalls = [{ id: "call_1", name: "send_message", args: { text: "done" } }];
    const tool = fakeTool("send_message", async (args) => ({ sent: true, args }));
    const model = fakeModel([
      { content: "", toolCalls },
      { content: "expensive final answer that should not be generated" },
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [tool],
      skipFinalResponseAfterToolUse: true,
    });

    const result = await graph.invoke({ userMessage: "send it" });

    assert.equal(result.status, "success");
    assert.equal(result.output, "");
    assert.equal(result.iterationCount, 1);
    assert.equal(result.toolCallCount, 1);
    assert.deepEqual(result.toolCalls, [{
      toolCallId: "call_1",
      name: "send_message",
      status: "success",
    }]);
    assert.equal(model.calls.length, 1);
    assert.deepEqual(tool.calls, [{ text: "done" }]);
  });

  it("yields after tool lifecycle events before invoking and continuing", async () => {
    const toolCalls = [{ id: "call_1", name: "lookup", args: { query: "sailor" } }];
    const model = fakeModel([
      { content: "", toolCalls },
      { content: "tool result applied" },
    ]);
    let startEventFlushed = false;
    let endEventFlushed = false;
    const tool = fakeTool("lookup", async () => {
      assert.equal(startEventFlushed, true);
      return { result: "found sailor" };
    });
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [tool],
      onEvent(event) {
        if (event.type === "agent:tool-start") {
          queueMicrotask(() => {
            startEventFlushed = true;
          });
        }
        if (event.type === "agent:tool-end") {
          queueMicrotask(() => {
            endEventFlushed = true;
          });
        }
        if (event.type === "agent:model-start" && (event.payload as { iteration?: number })?.iteration === 2) {
          assert.equal(endEventFlushed, true);
        }
      },
    });

    await graph.invoke({ userMessage: "lookup sailor" });
  });

  it("binds tool schemas to models that support function calling", async () => {
    const model = fakeToolBindingModel([
      { content: "", toolCalls: [{ id: "call_1", name: "lookup", args: { query: "sailor" } }] },
      { content: "tool result applied" },
    ]);
    const tool = fakeTool("lookup", async (args) => ({ result: `found ${args.query}` }));
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [{
        ...tool,
        description: "Search indexed records.",
        inputSchema: {
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string" },
          },
        },
      }],
    });

    const result = await graph.invoke({ userMessage: "lookup sailor" });

    assert.equal(result.output, "tool result applied");
    assert.deepEqual(model.boundTools, [{
      type: "function",
      function: {
        name: "lookup",
        description: "Search indexed records.",
        parameters: {
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string" },
          },
        },
      },
    }]);
  });

  it("streams text responses when tools are configured but no tool call is emitted", async () => {
    const model = fakeStreamModel(["he", { content: "llo" }], { invokeContent: "done" });
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [fakeTool("lookup", async () => ({ ok: true }))],
    });

    const result = await graph.invoke({ userMessage: "hello" });

    assert.equal(result.output, "hello");
    assert.equal(model.invokeCalls.length, 0);
    assert.equal(model.streamCalls.length, 1);
  });

  it("executes complete tool calls emitted by streamable models", async () => {
    const tool = fakeTool("lookup", async () => ({ result: "found sailor" }));
    const model = fakeSequentialStreamModel([
      [{ toolCalls: [{ id: "call_1", name: "lookup", args: { query: "sailor" } }] }],
      ["done"],
    ]);
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model,
      tools: [tool],
    });

    const result = await graph.invoke({ userMessage: "lookup sailor" });

    assert.equal(result.output, "done");
    assert.equal(result.toolCallCount, 1);
    assert.deepEqual(tool.calls, [{ query: "sailor" }]);
    assert.equal(model.streamCalls.length, 2);
  });

  it("includes short-term memory checkpointer config when provided", async () => {
    const checkpointer = { tag: "profile-db-checkpointer" };
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakeModel([{ content: "remembered" }]),
      tools: [],
      checkpointer,
    });

    assert.equal(graph.checkpointer, checkpointer);
    await graph.invoke({ userMessage: "hello", sessionId: "session_1" });
  });

  it("limits tool loops by max iterations", async () => {
    const graph = buildAgentGraph({
      agent: agentConfig({ maxIterations: 2 }),
      model: fakeModel([
        { content: "", toolCalls: [{ id: "call_1", name: "lookup", args: {} }] },
        { content: "", toolCalls: [{ id: "call_2", name: "lookup", args: {} }] },
        { content: "should not be reached" },
      ]),
      tools: [fakeTool("lookup", async () => ({ ok: true }))],
    });

    await assert.rejects(
      graph.invoke({ userMessage: "loop" }),
      /max iterations/i,
    );
  });

  it("returns final JSON output only when schema validates", async () => {
    const graph = buildAgentGraph({
      agent: agentConfig({
        outputMode: "json",
        outputSchema: {
          type: "object",
          required: ["answer"],
          properties: { answer: { type: "string" } },
          additionalProperties: false,
        },
      }),
      model: fakeModel([{ content: JSON.stringify({ answer: "ok" }) }]),
      tools: [],
    });

    assert.deepEqual((await graph.invoke({ userMessage: "json" })).output, { answer: "ok" });

    const invalidGraph = buildAgentGraph({
      agent: agentConfig({
        outputMode: "json",
        outputSchema: {
          type: "object",
          required: ["answer"],
          properties: { answer: { type: "string" } },
        },
      }),
      model: fakeModel([{ content: JSON.stringify({ answer: 42 }) }]),
      tools: [],
    });

    await assert.rejects(invalidGraph.invoke({ userMessage: "json" }), /schema/i);
  });

  it("adds strict JSON response instructions for JSON output mode", async () => {
    const model = fakeModel([{ content: JSON.stringify({ answer: "ok" }) }]);
    const graph = buildAgentGraph({
      agent: agentConfig({ outputMode: "json" }),
      model,
      tools: [],
    });

    await graph.invoke({ userMessage: "json" });

    const messages = model.calls[0] as Array<{ role: string; content: string }>;
    assert.match(messages[0].content, /Return only one valid JSON object/i);
  });

  it("parses JSON output wrapped in a markdown json fence", async () => {
    const graph = buildAgentGraph({
      agent: agentConfig({ outputMode: "json" }),
      model: fakeModel([{ content: "```json\n{\"answer\":\"ok\"}\n```" }]),
      tools: [],
    });

    const result = await graph.invoke({ userMessage: "json" });

    assert.deepEqual(result.output, { answer: "ok" });
  });

  it("uses invoke instead of stream for JSON output mode", async () => {
    const model = fakeStreamModel(["bad partial json"], { invokeContent: JSON.stringify({ answer: "ok" }) });
    const graph = buildAgentGraph({
      agent: agentConfig({ outputMode: "json" }),
      model,
      tools: [],
    });

    const result = await graph.invoke({ userMessage: "json" });

    assert.deepEqual(result.output, { answer: "ok" });
    assert.equal(model.invokeCalls.length, 1);
    assert.equal(model.streamCalls.length, 0);
  });

  it("emits model and tool events through injected callbacks", async () => {
    const events: string[] = [];
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakeModel([
        { content: "", toolCalls: [{ id: "call_1", name: "lookup", args: {} }] },
        { content: "done" },
      ]),
      tools: [fakeTool("lookup", async () => ({ ok: true }))],
      onEvent: (event) => events.push(event.type),
    });

    await graph.invoke({ userMessage: "events" });

    assert.deepEqual(events, [
      "agent:model-start",
      "agent:model-end",
      "agent:tool-intent",
      "agent:tool-start",
      "agent:tool-end",
      "agent:model-start",
      "agent:model-end",
    ]);
  });

  it("emits one structured tool lifecycle around each requested tool", async () => {
    const events: Array<{ type: string; payload?: any }> = [];
    const graph = buildAgentGraph({
      agent: agentConfig(),
      model: fakeModel([
        { content: "", toolCalls: [{ id: "call_1", name: "lookup", args: { query: "sailor" } }] },
        { content: "done" },
      ]),
      approvalToken: "approved",
      tools: [{
        ...fakeTool("lookup", async () => ({ ok: true })),
        pluginId: "search-plugin",
        pluginName: "Search Plugin",
        requiresApproval: true,
      }],
      onEvent: (event) => events.push(event),
    });

    await graph.invoke({ userMessage: "lookup sailor" });

    assert.deepEqual(
      events
        .filter((event) => event.type.startsWith("agent:tool-"))
        .map((event) => [event.type, event.payload]),
      [
        [
          "agent:tool-intent",
          {
            name: "lookup",
            callId: "call_1",
            input: { query: "sailor" },
            pluginId: "search-plugin",
            pluginName: "Search Plugin",
            requiresApproval: true,
          },
        ],
        [
          "agent:tool-start",
          {
            name: "lookup",
            callId: "call_1",
            input: { query: "sailor" },
            pluginId: "search-plugin",
            pluginName: "Search Plugin",
          },
        ],
        [
          "agent:tool-end",
          {
            name: "lookup",
            callId: "call_1",
            output: { ok: true },
            pluginId: "search-plugin",
            pluginName: "Search Plugin",
            status: "success",
          },
        ],
      ],
    );
  });
});

function agentConfig(overrides: Partial<AiAgentNodeConfig> = {}): AiAgentNodeConfig {
  return {
    type: "ai-agent",
    name: "Agent",
    prompt: "You are helpful.",
    maxIterations: 4,
    maxToolCalls: 4,
    timeoutMs: 30000,
    requireApprovalForSideEffects: ["write", "delete", "external-message", "external-payment"],
    outputMode: "text",
    ...overrides,
  };
}

function fakeModel(responses: Array<{ content: string; toolCalls?: unknown[] }>) {
  let index = 0;
  return {
    calls: [] as unknown[],
    async invoke(messages: unknown[]) {
      this.calls.push(messages);
      return responses[Math.min(index++, responses.length - 1)];
    },
  };
}

function fakeToolBindingModel(responses: Array<{ content: string; toolCalls?: unknown[] }>) {
  const model = fakeModel(responses) as ReturnType<typeof fakeModel> & {
    boundTools: unknown[];
    bindTools: (tools: unknown[]) => ReturnType<typeof fakeModel>;
  };
  model.boundTools = [];
  model.bindTools = (tools) => {
    model.boundTools = tools;
    return model;
  };
  return model;
}

function fakeStreamModel(chunks: unknown[], options: { invokeContent?: string } = {}) {
  return {
    invokeCalls: [] as unknown[],
    streamCalls: [] as unknown[],
    async invoke(messages: unknown[]) {
      this.invokeCalls.push(messages);
      return { content: options.invokeContent ?? "" };
    },
    async *stream(messages: unknown[]) {
      this.streamCalls.push(messages);
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}

function fakePromisedStreamModel(chunks: unknown[], options: { invokeContent?: string } = {}) {
  return {
    invokeCalls: [] as unknown[],
    streamCalls: [] as unknown[],
    async invoke(messages: unknown[]) {
      this.invokeCalls.push(messages);
      return { content: options.invokeContent ?? "" };
    },
    stream(messages: unknown[]) {
      this.streamCalls.push(messages);
      return Promise.resolve((async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
      })());
    },
  };
}

function fakeBadStreamModel(options: { invokeContent?: string } = {}) {
  return {
    invokeCalls: [] as unknown[],
    streamCalls: [] as unknown[],
    async invoke(messages: unknown[]) {
      this.invokeCalls.push(messages);
      return { content: options.invokeContent ?? "" };
    },
    stream(messages: unknown[]) {
      this.streamCalls.push(messages);
      return undefined;
    },
  };
}

function fakeSequentialStreamModel(chunksByCall: unknown[][]) {
  let index = 0;
  return {
    invokeCalls: [] as unknown[],
    streamCalls: [] as unknown[],
    async invoke(messages: unknown[]) {
      this.invokeCalls.push(messages);
      return { content: "" };
    },
    async *stream(messages: unknown[]) {
      this.streamCalls.push(messages);
      const chunks = chunksByCall[Math.min(index++, chunksByCall.length - 1)] ?? [];
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}

function fakeTool(name: string, invoke: (args: any) => Promise<unknown>) {
  return {
    name,
    calls: [] as unknown[],
    async invoke(args: unknown) {
      this.calls.push(args);
      return invoke(args);
    },
  };
}
