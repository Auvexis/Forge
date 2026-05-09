import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildWorkflowSchema } from "./workflow-schema.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

describe("workflow schema builder", () => {
  it("describes utility node handles without route coupling", () => {
    const workflow: WorkflowItem = {
      metadata: {
        id: "wf-1",
        name: "Workflow",
        version: "1.0.0",
        isActive: true,
        isDraft: false,
        public: false,
        createdAt: "2026-05-09T00:00:00.000Z",
      },
      trigger: { type: "manual" },
      nodes: {
        decision: { type: "if", name: "Decision", condition: "trigger.ok" },
      },
      edges: [],
      variables: [],
    };

    const schema = buildWorkflowSchema(workflow);

    assert.deepEqual(schema.nodes.decision.handles, ["then", "else"]);
    assert.deepEqual(schema.availableNodeTypes.includes("if"), true);
  });
});
