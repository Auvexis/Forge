import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ExternalIOError,
  runExternalIO,
} from "./external-io-runner.ts";

describe("ExternalIORunner", () => {
  it("retries failed operations with normalized attempt metadata", async () => {
    let attempts = 0;

    const result = await runExternalIO({
      label: "test operation",
      retryPolicy: { maxRetries: 2, intervalMs: 1, backoffStrategy: "fixed" },
      operation: async () => {
        attempts++;
        if (attempts < 3) throw new Error("temporary");
        return "ok";
      },
    });

    assert.equal(result, "ok");
    assert.equal(attempts, 3);
  });

  it("throws ExternalIOError after timeout", async () => {
    await assert.rejects(
      runExternalIO({
        label: "slow operation",
        timeoutMs: 5,
        operation: async ({ signal }) => new Promise((resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
          setTimeout(() => resolve("late"), 50);
        }),
      }),
      (error) => {
        assert.ok(error instanceof ExternalIOError);
        assert.equal(error.code, "EXTERNAL_IO_TIMEOUT");
        return true;
      },
    );
  });
});
