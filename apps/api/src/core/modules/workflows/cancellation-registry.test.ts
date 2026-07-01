import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CancellationRegistry } from "./cancellation-registry.ts";

describe("CancellationRegistry", () => {
  it("aborts execution signals when cancellation is requested", () => {
    const signal = CancellationRegistry.signal("exec_abort_signal");

    assert.equal(signal.aborted, false);

    CancellationRegistry.cancel("exec_abort_signal");

    assert.equal(signal.aborted, true);
    assert.equal(CancellationRegistry.consume("exec_abort_signal"), true);
  });

  it("clears execution signal controllers after completion", () => {
    const first = CancellationRegistry.signal("exec_abort_clear");
    CancellationRegistry.clear("exec_abort_clear");
    const next = CancellationRegistry.signal("exec_abort_clear");

    assert.notEqual(first, next);
    CancellationRegistry.clear("exec_abort_clear");
  });
});
