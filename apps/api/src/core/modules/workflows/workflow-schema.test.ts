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

  it("adds utility node catalog display metadata without changing plugin metadata", () => {
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
        script: { type: "code", name: "Script", language: "javascript", script: "return {}" },
        pluginStep: {
          type: "plugin",
          name: "Plugin Step",
          pluginId: "demo",
          action: "run",
          params: {},
        },
      },
      edges: [],
      variables: [],
    };

    const schema = buildWorkflowSchema(workflow, {
      getPlugin: () => ({
        id: "demo",
        manifest: {
          metadata: {
            id: "demo",
            name: "Demo Plugin",
            description: "Demo",
            icon: "plug",
            categories: ["Core"],
            author: "Fabric",
            version: "1.0.0",
            repository: "",
          },
          methods: {
            run: {
              metadata: { label: "Run", description: "Run demo action" },
              parameters: { type: "object", properties: {}, additionalProperties: false },
              responseSchema: { type: "object", properties: {} },
              ui: { component: "generic" },
            },
          },
        },
        auth: { type: "none" },
        methods: {},
      } as any),
    });

    assert.equal(schema.nodes.script.nodeLabel, "Code Block");
    assert.equal(schema.nodes.script.nodeIcon, "code-2");
    assert.equal(schema.nodes.script.nodeStyle.iconColor, "var(--fabric-node-codeblock-icon)");
    assert.equal(schema.nodes.pluginStep.pluginName, "Demo Plugin");
    assert.equal(schema.nodes.pluginStep.pluginIcon, "plug");
    assert.equal(schema.nodes.pluginStep.nodeStyle, undefined);
  });

  it("describes Return node result configuration", () => {
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
        return_1: {
          type: "return",
          name: "Return",
          mode: "fields",
          fields: [{ key: "recipe", value: "{{ steps.generate.output.recipe }}" }],
        },
      },
      edges: [],
      variables: [],
    };

    const schema = buildWorkflowSchema(workflow);

    assert.equal(schema.nodes.return_1.nodeLabel, "Return");
    assert.equal(schema.nodes.return_1.nodeIcon, "corner-down-left");
    assert.equal(schema.nodes.return_1.mode, "fields");
    assert.deepEqual(schema.nodes.return_1.fields, [
      { key: "recipe", value: "{{ steps.generate.output.recipe }}" },
    ]);
  });
});
