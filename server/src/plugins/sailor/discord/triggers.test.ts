import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeDiscordEvent } from "./triggers.ts";

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
});
