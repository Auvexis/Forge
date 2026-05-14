import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  VALID_NODE_TYPES,
  validateWorkflowDefinition,
} from "./workflow-validation.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

function baseWorkflow(overrides: Partial<WorkflowItem> = {}): WorkflowItem {
  return {
    metadata: {
      id: "wf-1",
      name: "Workflow",
      version: "1.0.0",
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: "2026-05-09T00:00:00.000Z",
    },
    trigger: { type: "manual" },
    nodes: {},
    edges: [],
    variables: [],
    ...overrides,
  };
}

describe("workflow validation", () => {
  it("exports the first-party node type set used by routes and schemas", () => {
    assert.equal(VALID_NODE_TYPES.has("plugin"), true);
    assert.equal(VALID_NODE_TYPES.has("respond-webhook"), true);
    assert.equal(VALID_NODE_TYPES.has("wait-form"), true);
  });

  it("accepts a minimal valid workflow definition", () => {
    assert.equal(validateWorkflowDefinition(baseWorkflow()), null);
  });

  it("rejects edges that reference missing nodes", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      edges: [{ id: "edge-1", source: "trigger", target: "missing" }],
    }));

    assert.match(error ?? "", /unknown target node "missing"/);
  });

  it("rejects invalid form trigger fields", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      trigger: {
        type: "form",
        formFields: [{ name: "bad name", label: "Bad", type: "text" }],
      },
    }));

    assert.match(error ?? "", /invalid name/);
  });

  it("rejects invalid wait-form node fields", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        "wait-form-1": {
          type: "wait-form",
          name: "Wait Form",
          title: "Apply",
          fields: [{ name: "bad name", label: "Bad", type: "text" }],
        },
      },
    }));

    assert.match(error ?? "", /invalid name/);
  });

  it("rejects invalid form fields on real trigger nodes", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        form_trigger: {
          type: "trigger",
          name: "Form Trigger",
          trigger: {
            type: "form",
            formFields: [{ name: "bad name", label: "Bad", type: "text" }],
          },
        },
      },
    }));

    assert.match(error ?? "", /invalid name/);
  });
});
