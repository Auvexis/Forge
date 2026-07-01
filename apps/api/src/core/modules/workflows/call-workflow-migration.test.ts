import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { migrateWorkflow } from "./repository.ts";

describe("call workflow node migration", () => {
  it("migrates legacy subworkflow nodes to call-workflow nodes", () => {
    const workflow = migrateWorkflow({
      metadata: {
        id: "parent",
        name: "Parent",
        version: "1",
        isActive: false,
        isDraft: true,
        public: false,
        createdAt: "2026-06-30T00:00:00.000Z",
      },
      trigger: { type: "manual" },
      nodes: {
        child: {
          type: "subworkflow",
          name: "Legacy child",
          workflowId: "child-workflow",
          inputMapping: {
            email: "{{ trigger.email }}",
          },
        },
      },
      edges: [],
    });

    assert.equal(workflow.nodes.child.type, "call-workflow");
    assert.equal((workflow.nodes.child as any).targetWorkflowId, "child-workflow");
    assert.equal((workflow.nodes.child as any).targetTriggerId, "manual");
    assert.deepEqual((workflow.nodes.child as any).inputDefaults, {
      email: "{{ trigger.email }}",
    });
  });
});
