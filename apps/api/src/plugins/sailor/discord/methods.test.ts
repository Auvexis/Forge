import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import plugin from "./index.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("discord plugin", () => {
  it("exports default Sailor plugin contract", () => {
    const auth = plugin.auth as any;
    const methodNames = [
      "sendMessage",
      "editMessage",
      "deleteMessage",
      "getMessage",
      "listChannelMessages",
      "createThread",
      "addReaction",
      "getGuildMember",
    ];

    assert.equal(plugin.id, "discord");
    assert.equal(plugin.manifest.metadata.id, "discord");
    assert.equal(auth.type, "api_key");
    assert.equal(auth.credentialSchema.bot_token.inputType, "password");

    for (const methodName of methodNames) {
      assert.equal(typeof plugin.methods[methodName], "function");
      assert.ok(plugin.manifest.methods[methodName], `${methodName} must be declared in manifest`);
    }
  });

  it("sends bot authenticated requests to Discord", async () => {
    const calls: any[] = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ id: "message-1", content: "hello" }), { status: 200 });
    };

    const result = await plugin.methods.sendMessage(
      { channelId: "channel-1", content: "hello" },
      { credentials: { bot_token: "token-1" } },
    );

    assert.equal(result.id, "message-1");
    assert.equal(calls[0].url, "https://discord.com/api/v10/channels/channel-1/messages");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bot token-1");
    assert.deepEqual(JSON.parse(calls[0].init.body), { content: "hello" });
  });

  it("requires explicit confirmation before deleting a message", async () => {
    await assert.rejects(
      plugin.methods.deleteMessage(
        { channelId: "channel-1", messageId: "message-1", confirm: false },
        { credentials: { bot_token: "token-1" } },
      ),
      /confirm/,
    );
  });

  it("throws clear Discord API errors", async () => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "Missing Permissions", code: 50013 }), { status: 403 });

    await assert.rejects(
      plugin.methods.getMessage(
        { channelId: "channel-1", messageId: "message-1" },
        { credentials: { bot_token: "token-1" } },
      ),
      /Discord API error on '\/channels\/channel-1\/messages\/message-1': Missing Permissions/,
    );
  });
});
