import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluatePluginTriggerFilters } from "./plugin-trigger-filter.ts";

describe("evaluatePluginTriggerFilters", () => {
  it("accepts payloads that match exact id filters", () => {
    const result = evaluatePluginTriggerFilters(
      { channelId: "C1", userId: "U1" },
      { channelId: "C1", userId: "U1", text: "ship it" },
    );

    assert.deepEqual(result, { accepted: true });
  });

  it("ignores payloads that do not match exact id filters", () => {
    const result = evaluatePluginTriggerFilters(
      { channelId: "C1" },
      { channelId: "C2", text: "ship it" },
    );

    assert.deepEqual(result, {
      accepted: false,
      reason: "channelId did not match",
    });
  });

  it("matches textContains case-insensitively", () => {
    const result = evaluatePluginTriggerFilters(
      { textContains: "Deploy" },
      { text: "please deploy prod" },
    );

    assert.deepEqual(result, { accepted: true });
  });

  it("matches textRegex against payload text", () => {
    const result = evaluatePluginTriggerFilters(
      { textRegex: "^/deploy\\s+prod$" },
      { text: "/deploy prod" },
    );

    assert.deepEqual(result, { accepted: true });
  });

  it("fails closed for invalid regex filters", () => {
    const result = evaluatePluginTriggerFilters(
      { textRegex: "[" },
      { text: "anything" },
    );

    assert.deepEqual(result, {
      accepted: false,
      reason: "textRegex is invalid",
    });
  });

  it("ignores bot events when ignoreBots is true", () => {
    const result = evaluatePluginTriggerFilters(
      { ignoreBots: "true" },
      { text: "hello", authorBot: true },
    );

    assert.deepEqual(result, {
      accepted: false,
      reason: "bot event ignored",
    });
  });
});
