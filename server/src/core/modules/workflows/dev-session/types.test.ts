import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertValidJobTransition,
  assertValidSessionTransition,
  canTransitionJob,
  canTransitionSession,
} from "./types.ts";

describe("dev workflow session contracts", () => {
  it("allows only valid session status transitions", () => {
    assert.equal(canTransitionSession("starting", "running"), true);
    assert.equal(canTransitionSession("running", "stopping"), true);
    assert.equal(canTransitionSession("stopping", "stopped"), true);
    assert.equal(canTransitionSession("starting", "failed"), true);

    assert.equal(canTransitionSession("stopped", "running"), false);
    assert.equal(canTransitionSession("failed", "running"), false);
    assert.throws(
      () => assertValidSessionTransition("stopped", "running"),
      /Invalid dev workflow session transition: stopped -> running/,
    );
  });

  it("allows only valid workflow job status transitions", () => {
    assert.equal(canTransitionJob("queued", "running"), true);
    assert.equal(canTransitionJob("running", "success"), true);
    assert.equal(canTransitionJob("running", "failed"), true);
    assert.equal(canTransitionJob("queued", "cancelled"), true);

    assert.equal(canTransitionJob("success", "running"), false);
    assert.equal(canTransitionJob("cancelled", "success"), false);
    assert.throws(
      () => assertValidJobTransition("success", "running"),
      /Invalid workflow job transition: success -> running/,
    );
  });
});
