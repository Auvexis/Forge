import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";

const workflowTypesPath = path.resolve("src/shared/models/workflow-types.ts");
const nodeTypesPath = path.resolve("src/core/nodes/types.ts");

describe("workflow return contracts", () => {
  const workflowTypes = fs.readFileSync(workflowTypesPath, "utf8");
  const nodeTypes = fs.readFileSync(nodeTypesPath, "utf8");

  it("defines the return workflow node and return modes", () => {
    assert.match(workflowTypes, /"return"/);
    assert.match(workflowTypes, /export type WorkflowReturnMode = "all-steps" \| "fields" \| "expression"/);
    assert.match(workflowTypes, /export interface ReturnNode/);
    assert.match(workflowTypes, /type: "return"/);
    assert.match(workflowTypes, /mode: WorkflowReturnMode/);
    assert.match(workflowTypes, /fields\?: ReturnNodeField\[\]/);
    assert.match(workflowTypes, /expression\?: string/);
    assert.match(workflowTypes, /\| ReturnNode/);
  });

  it("defines workflow result metadata on execution context", () => {
    assert.match(workflowTypes, /export type WorkflowResultSourceType = "return" \| "fallback-steps"/);
    assert.match(workflowTypes, /export interface WorkflowResultSource/);
    assert.match(workflowTypes, /type: WorkflowResultSourceType/);
    assert.match(workflowTypes, /nodeId\?: string/);
    assert.match(nodeTypes, /result\?: unknown/);
    assert.match(nodeTypes, /resultSource\?: WorkflowResultSource/);
  });
});
