import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeSlackEvent } from "./triggers.ts";

describe("slack triggers", () => {
  it("normalizes message events", () => {
    const payload = normalizeSlackEvent("onMessage", {
      event_id: "evt-1",
      event: {
        ts: "123.456",
        channel: "C1",
        user: "U1",
        text: "hello",
      },
    });

    assert.equal(payload.eventId, "evt-1");
    assert.equal(payload.messageId, "123.456");
    assert.equal(payload.channelId, "C1");
    assert.equal(payload.userId, "U1");
    assert.equal(payload.text, "hello");
  });

  it("normalizes mention events", () => {
    const payload = normalizeSlackEvent("onMention", {
      event_id: "evt-2",
      event: {
        type: "app_mention",
        ts: "223.456",
        channel: "C2",
        user: "U2",
        text: "<@BOT> help",
      },
    });

    assert.equal(payload.eventId, "evt-2");
    assert.equal(payload.text, "<@BOT> help");
  });
});
