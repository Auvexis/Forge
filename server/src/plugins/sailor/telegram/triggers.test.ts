import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeTelegramEvent } from "./triggers.ts";

describe("telegram triggers", () => {
  it("normalizes message updates", () => {
    const payload = normalizeTelegramEvent("onMessage", {
      update_id: 10,
      message: {
        message_id: 20,
        text: "hello",
        chat: { id: 30 },
        from: { id: 40 },
      },
    });

    assert.deepEqual(payload, {
      eventId: "10",
      messageId: "20",
      channelId: "30",
      userId: "40",
      text: "hello",
      raw: {
        update_id: 10,
        message: {
          message_id: 20,
          text: "hello",
          chat: { id: 30 },
          from: { id: 40 },
        },
      },
    });
  });

  it("normalizes command updates", () => {
    const payload = normalizeTelegramEvent("onCommand", {
      update_id: 11,
      message: {
        message_id: 21,
        text: "/start demo",
        chat: { id: 31 },
        from: { id: 41 },
      },
    });

    assert.equal(payload.command, "/start");
    assert.equal(payload.text, "/start demo");
  });

  it("normalizes callback query updates", () => {
    const payload = normalizeTelegramEvent("onCallbackQuery", {
      update_id: 12,
      callback_query: {
        id: "cb-1",
        data: "approve",
        from: { id: 42 },
        message: { message_id: 22, chat: { id: 32 } },
      },
    });

    assert.equal(payload.eventId, "12");
    assert.equal(payload.messageId, "22");
    assert.equal(payload.channelId, "32");
    assert.equal(payload.userId, "42");
    assert.equal(payload.text, "approve");
  });
});
