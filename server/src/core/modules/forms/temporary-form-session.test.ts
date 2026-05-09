import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createTemporaryFormSession,
  resetTemporaryFormSessionsForTests,
  submitTemporaryFormSession,
} from "./temporary-form-session.ts";

describe("temporary form sessions", () => {
  it("waits until a form session is submitted", async () => {
    resetTemporaryFormSessionsForTests();

    const session = createTemporaryFormSession({
      workflowId: "workflow-1",
      executionId: "exec-1",
      nodeId: "wait-form-1",
      title: "Apply",
      fields: [{ name: "email", label: "Email", type: "email" }],
      expiresInSeconds: 5,
    });

    submitTemporaryFormSession(session.id, { email: "ada@example.com" });

    await assert.doesNotReject(async () => {
      const result = await session.result;
      assert.deepEqual(result.fields, { email: "ada@example.com" });
      assert.equal(result.formId, session.id);
    });
  });

  it("rejects when a form session expires", async () => {
    resetTemporaryFormSessionsForTests();

    const session = createTemporaryFormSession({
      workflowId: "workflow-1",
      executionId: "exec-1",
      nodeId: "wait-form-1",
      title: "Apply",
      fields: [{ name: "name", label: "Name", type: "text" }],
      expiresInSeconds: 0.01,
    });

    await assert.rejects(session.result, /expired/i);
  });
});
