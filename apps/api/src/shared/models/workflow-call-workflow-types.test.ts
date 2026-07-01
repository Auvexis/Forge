import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

const workflowTypesPath = path.resolve("src/shared/models/workflow-types.ts");

describe("call workflow node contracts", () => {
  const source = fs.readFileSync(workflowTypesPath, "utf8");

  it("replaces subworkflow with call-workflow in workflow node types", () => {
    assert.match(source, /"call-workflow"/);
    assert.doesNotMatch(source, /"subworkflow"/);
    assert.match(source, /export interface CallWorkflowNode/);
    assert.match(source, /\| CallWorkflowNode/);
    assert.doesNotMatch(source, /export interface SubWorkflowNode/);
    assert.doesNotMatch(source, /\| SubWorkflowNode/);
  });

  it("defines callable trigger metadata for manual, form, and webhook triggers", () => {
    assert.match(source, /export type CallableWorkflowTriggerType = "manual" \| "form" \| "webhook"/);
    assert.match(source, /export interface CallableWorkflowTriggerMetadata/);
    assert.match(source, /id: string/);
    assert.match(source, /name: string/);
    assert.match(source, /type: CallableWorkflowTriggerType/);
    assert.match(source, /icon\?: string/);
    assert.match(source, /schema\?: Record<string, any>/);
  });

  it("keeps workflow and trigger ids out of the public agent tool contract", () => {
    assert.match(source, /toolName: string/);
    assert.match(source, /toolDescription\?: string/);
    assert.match(source, /inputDefaults\?: Record<string, any>/);
    assert.match(source, /targetWorkflowId: string/);
    assert.match(source, /targetTriggerId: string/);
  });
});
