import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { waitFormNodeHandler } from "./wait-form.ts";
import { submitTemporaryFormSession } from "../../modules/forms/temporary-form-session.ts";
import type { NodeHandlerInput, NodeHandlerServices } from "../types.ts";
import type { WaitFormNode, WorkflowItem } from "../../../shared/models/workflow-types.ts";

function input(
  node: WaitFormNode,
  services: Partial<NodeHandlerServices> = {},
): NodeHandlerInput<WaitFormNode> {
  const workflow: WorkflowItem = {
    metadata: {
      id: "workflow-1",
      name: "Workflow",
      version: "1.0.0",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: "2026-05-09T00:00:00.000Z",
    },
    trigger: { type: "manual" },
    nodes: { "wait-form-1": node },
    edges: [],
  };

  return {
    nodeId: "wait-form-1",
    node,
    workflow,
    edges: [],
    executionId: "exec-1",
    context: { trigger: { uuid: "candidate-123", ttl: 12 }, steps: {}, variables: {} },
    services: {
      executeNode: async () => undefined,
      executeWorkflow: async () => undefined,
      getWorkflowById: () => null,
      emitInternalEvent: async () => ({ triggered: [] }),
      resolvePendingWebhookResponse: () => false,
      emitNodeStart: () => undefined,
      emitNodeSuccess: () => undefined,
      emitNodeFailure: () => undefined,
      emitWorkflowEvent: () => undefined,
      ...services,
    },
  };
}

describe("wait-form utility node", () => {
  it("emits the temporary form URL and resolves with submitted fields", async () => {
    let formId = "";
    const emitted: any[] = [];
    const execution = waitFormNodeHandler.execute(
      input(
        {
          type: "wait-form",
          name: "Candidate Form",
          title: "Candidate",
          fields: [{ name: "email", label: "Email", type: "email" }],
          expiresInSeconds: 5,
        },
        {
          emitWorkflowEvent: (event) => {
            emitted.push(event);
            formId = event.data?.formId ?? formId;
          },
        },
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.match(emitted[0].data.formUrl, /temporary-forms/);

    submitTemporaryFormSession(formId, { email: "ada@example.com" });
    const result = await execution;

    assert.deepEqual(result.fields, { email: "ada@example.com" });
    assert.equal(result.formId, formId);
  });

  it("uses a templated publicSlug as the temporary form URL id", async () => {
    let formId = "";
    const execution = waitFormNodeHandler.execute(
      input(
        {
          type: "wait-form",
          name: "Candidate Form",
          title: "Candidate",
          publicSlug: "vaga-{{ trigger.uuid }}",
          fields: [{ name: "email", label: "Email", type: "email" }],
          expiresInSeconds: 5,
        },
        {
          emitWorkflowEvent: (event) => {
            formId = event.data?.formId ?? formId;
          },
        },
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(formId, "vaga-candidate-123");
    submitTemporaryFormSession(formId, { email: "ada@example.com" });
    await execution;
  });

  it("resolves a templated expiration before creating the temporary form", async () => {
    let formId = "";
    let expiresAt = 0;
    const startedAt = Date.now();
    const execution = waitFormNodeHandler.execute(
      input(
        {
          type: "wait-form",
          name: "Candidate Form",
          title: "Candidate",
          publicSlug: "candidate-expiration",
          fields: [{ name: "email", label: "Email", type: "email" }],
          expiresInSeconds: "{{ trigger.ttl }}" as unknown as number,
        },
        {
          emitWorkflowEvent: (event) => {
            formId = event.data?.formId ?? formId;
            expiresAt = event.data?.expiresAt ?? expiresAt;
          },
        },
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.ok(expiresAt - startedAt >= 11_000);
    assert.ok(expiresAt - startedAt <= 13_000);
    submitTemporaryFormSession(formId, { email: "ada@example.com" });
    await execution;
  });
});
