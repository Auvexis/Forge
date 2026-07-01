import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AgentBinaryRefStore } from "./agent-binary-ref-store.ts";

describe("AgentBinaryRefStore", () => {
  it("expires refs after the configured ttl", () => {
    let now = 1_000;
    const store = new AgentBinaryRefStore({ ttlMs: 100, now: () => now });
    const ref = store.put({
      toolCallId: "call_1",
      path: "download/content",
      type: "Buffer",
      value: Buffer.from("ok"),
    });

    now = 1_101;

    assert.equal(store.get(ref.ref), null);
  });

  it("rejects refs above the configured limit", () => {
    const store = new AgentBinaryRefStore({ maxRefs: 1 });
    store.put({
      toolCallId: "call_1",
      path: "download/content",
      type: "Buffer",
      value: Buffer.from("ok"),
    });

    assert.throws(
      () => store.put({
        toolCallId: "call_2",
        path: "download/content",
        type: "Buffer",
        value: Buffer.from("ok"),
      }),
      /Agent binary ref limit exceeded/,
    );
  });
});
