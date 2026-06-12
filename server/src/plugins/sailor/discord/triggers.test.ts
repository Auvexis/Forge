import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDiscordGatewayTrigger, normalizeDiscordEvent } from "./triggers.ts";

describe("discord triggers", () => {
  it("normalizes message create events", () => {
    const payload = normalizeDiscordEvent("onMessage", {
      id: "msg-1",
      channel_id: "chan-1",
      author: { id: "user-1" },
      content: "hello",
    });

    assert.equal(payload.eventId, "msg-1");
    assert.equal(payload.messageId, "msg-1");
    assert.equal(payload.channelId, "chan-1");
    assert.equal(payload.userId, "user-1");
    assert.equal(payload.text, "hello");
  });

  it("normalizes slash command events", () => {
    const payload = normalizeDiscordEvent("onSlashCommand", {
      id: "interaction-1",
      channel_id: "chan-2",
      member: { user: { id: "user-2" } },
      data: { name: "ship" },
    });

    assert.equal(payload.eventId, "interaction-1");
    assert.equal(payload.command, "/ship");
    assert.equal(payload.channelId, "chan-2");
    assert.equal(payload.userId, "user-2");
  });

  it("normalizes bot authors to the shared isBot field", () => {
    const payload = normalizeDiscordEvent("onMessage", {
      id: "msg-bot",
      author: { id: "bot-1", bot: true },
    });

    assert.equal(payload.isBot, true);
    assert.equal("authorIsBot" in payload, false);
  });

  it("connects to Discord Gateway and forwards normalized message events", async () => {
    const originalFetch = globalThis.fetch;
    const originalWebSocket = globalThis.WebSocket;
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
    const sockets: FakeWebSocket[] = [];

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ url: String(url), init });
      if (String(url).includes("/gateway/bot")) {
        return jsonResponse({ url: "wss://gateway.discord.test" });
      }
      return jsonResponse({ ok: true });
    }) as typeof fetch;
    globalThis.WebSocket = class extends FakeWebSocket {
      constructor(url: string) {
        super(url);
        sockets.push(this);
      }
    } as any;

    try {
      const trigger = createDiscordGatewayTrigger("onMessage");
      await trigger.setup({
        webhookUrl: "https://sailor.test/plugin-events/wf/trigger/discord/onMessage",
        credentials: { bot_token: "bot-token" },
        params: { channelId: "chan-1" },
        workflowId: "wf",
      });

      assert.equal(sockets.length, 1);
      sockets[0].emitMessage({ op: 10, d: { heartbeat_interval: 60_000 } });
      assert.match(sockets[0].sent[0], /"op":2/);

      sockets[0].emitMessage({
        op: 0,
        t: "MESSAGE_CREATE",
        s: 1,
        d: {
          id: "msg-1",
          channel_id: "chan-1",
          author: { id: "user-1", bot: false },
          content: "hello",
        },
      });
      await new Promise((resolve) => setImmediate(resolve));

      const forwarded = fetchCalls.find((call) => call.url === "https://sailor.test/plugin-events/wf/trigger/discord/onMessage");
      assert.ok(forwarded);
      assert.equal(forwarded?.init?.method, "POST");
      assert.deepEqual(JSON.parse(String(forwarded?.init?.body)), {
        eventId: "msg-1",
        messageId: "msg-1",
        channelId: "chan-1",
        userId: "user-1",
        text: "hello",
        isBot: false,
        raw: {
          id: "msg-1",
          channel_id: "chan-1",
          author: { id: "user-1", bot: false },
          content: "hello",
        },
      });

      await trigger.teardown({
        webhookUrl: "https://sailor.test/plugin-events/wf/trigger/discord/onMessage",
        credentials: { bot_token: "bot-token" },
        params: { channelId: "chan-1" },
        workflowId: "wf",
      });
      assert.equal(sockets[0].closed, true);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.WebSocket = originalWebSocket;
    }
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

class FakeWebSocket {
  static OPEN = 1;
  readonly url: string;
  readyState = FakeWebSocket.OPEN;
  sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setImmediate(() => this.onopen?.());
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
    this.onclose?.();
  }

  emitMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}
