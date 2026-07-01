import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import plugin from "./index.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("slack plugin", () => {
  it("exports default Sailor plugin contract", () => {
    const auth = plugin.auth as any;
    const methodNames = [
      "postMessage",
      "updateMessage",
      "deleteMessage",
      "listChannels",
      "getChannelHistory",
      "addReaction",
      "openConversation",
      "uploadFile",
    ];

    assert.equal(plugin.id, "slack");
    assert.equal(plugin.manifest.metadata.id, "slack");
    assert.equal(auth.type, "api_key");
    assert.equal(auth.credentialSchema.bot_token.inputType, "password");

    for (const methodName of methodNames) {
      assert.equal(typeof plugin.methods[methodName], "function");
      assert.ok(plugin.manifest.methods[methodName], `${methodName} must be declared in manifest`);
    }
  });

  it("sends bearer authenticated requests to Slack", async () => {
    const calls: any[] = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ ok: true, channel: "C1", ts: "123.456" }), { status: 200 });
    };

    const result = await plugin.methods.postMessage(
      { channel: "C1", text: "hello" },
      { credentials: { bot_token: "xoxb-token" } },
    );

    assert.equal(result.channel, "C1");
    assert.equal(calls[0].url, "https://slack.com/api/chat.postMessage");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bearer xoxb-token");
    assert.deepEqual(JSON.parse(calls[0].init.body), { channel: "C1", text: "hello" });
  });

  it("requires explicit confirmation before deleting a message", async () => {
    await assert.rejects(
      plugin.methods.deleteMessage(
        { channel: "C1", ts: "123.456", confirm: false },
        { credentials: { bot_token: "xoxb-token" } },
      ),
      /confirm/,
    );
  });

  it("throws clear Slack API errors", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ok: false, error: "channel_not_found" }), { status: 200 });

    await assert.rejects(
      plugin.methods.getChannelHistory(
        { channel: "missing", limit: 10 },
        { credentials: { bot_token: "xoxb-token" } },
      ),
      /Slack API error on 'conversations.history': channel_not_found/,
    );
  });
});
