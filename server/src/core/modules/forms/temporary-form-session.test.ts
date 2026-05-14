import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cancelTemporaryFormSessionsByExecution,
  createTemporaryFormSession,
  getTemporaryFormSession,
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

  it("uses an explicit public slug when creating the public form id", () => {
    resetTemporaryFormSessionsForTests();

    const session = createTemporaryFormSession({
      workflowId: "workflow-1",
      executionId: "exec-1",
      nodeId: "wait-form-1",
      title: "Apply",
      fields: [{ name: "email", label: "Email", type: "email" }],
      publicSlug: "vaga-dev-123",
      expiresInSeconds: 5,
    });

    assert.equal(session.id, "vaga-dev-123");
    submitTemporaryFormSession(session.id, { email: "ada@example.com" });
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

  it("cancels waiting sessions by execution id", async () => {
    resetTemporaryFormSessionsForTests();

    const session = createTemporaryFormSession({
      workflowId: "workflow-1",
      executionId: "exec-1",
      nodeId: "wait-form-1",
      title: "Apply",
      fields: [{ name: "email", label: "Email", type: "email" }],
      expiresInSeconds: 5,
    });

    const result = session.result.catch((error) => error.message);
    const cancelled = cancelTemporaryFormSessionsByExecution(
      "exec-1",
      "dev session stopped",
    );

    assert.equal(cancelled, 1);
    assert.equal(getTemporaryFormSession(session.id), null);
    assert.equal(
      await result,
      `Temporary form "${session.id}" cancelled: dev session stopped`,
    );
  });
});
