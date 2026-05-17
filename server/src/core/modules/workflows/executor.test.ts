import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { createMigrationEngine } from "../../database/migration-engine.ts";
import { resetAppDatabaseProvider, setAppDatabaseProvider } from "../app/app-repository.ts";
import { WorkflowEngine } from "./executor.ts";
import {
  resetWorkflowDatabaseProvider,
  setWorkflowDatabaseProvider,
  WorkflowRepository,
} from "./repository.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

let db: Database.Database | null = null;
let appDb: Database.Database | null = null;

async function createMigratedDb(kind: "app" | "workflows"): Promise<Database.Database> {
  const database = new Database(":memory:");
  database.pragma("foreign_keys = ON");
  await createMigrationEngine(database, kind).up();
  return database;
}

function baseWorkflow(): WorkflowItem {
  return {
    metadata: {
      id: `wf-executor-${Date.now()}`,
      name: "Executor Test",
      version: "1.0.0",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: "2026-05-13T00:00:00.000Z",
    },
    trigger: { type: "manual" },
    nodes: {
      trigger_a: {
        type: "trigger",
        name: "Trigger A",
        trigger: { type: "manual" },
      },
      trigger_b: {
        type: "trigger",
        name: "Trigger B",
        trigger: { type: "manual" },
      },
      set_a: {
        type: "set",
        name: "Set A",
        assignments: [{ key: "branch", value: "a" }],
      },
      set_b: {
        type: "set",
        name: "Set B",
        assignments: [{ key: "branch", value: "b" }],
      },
    },
    edges: [
      { id: "a-to-set-a", source: "trigger_a", target: "set_a" },
      { id: "b-to-set-b", source: "trigger_b", target: "set_b" },
    ],
    variables: [],
  };
}

describe("WorkflowEngine trigger entry execution", () => {
  beforeEach(async () => {
    appDb = await createMigratedDb("app");
    db = await createMigratedDb("workflows");
    setAppDatabaseProvider(() => appDb!);
    setWorkflowDatabaseProvider(() => db!);
  });

  afterEach(() => {
    resetAppDatabaseProvider();
    resetWorkflowDatabaseProvider();
    appDb?.close();
    db?.close();
    appDb = null;
    db = null;
  });

  it("executes only nodes downstream of the selected trigger", async () => {
    const wf = baseWorkflow();
    WorkflowRepository.saveWorkflow(wf);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_b",
      { source: "test" },
      "exec_multi_trigger_branch",
    );

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.context.steps.set_b.output.branch, "b");
    assert.equal(result.context.steps.set_a, undefined);
  });

  it("records selected trigger payload as trigger node output", async () => {
    const wf = baseWorkflow();
    WorkflowRepository.saveWorkflow(wf);

    const payload = { payload: "any", nested: { ok: true } };
    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_b",
      payload,
      "exec_multi_trigger_payload_output",
    );

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.context.trigger, payload);
    assert.deepEqual(result.context.steps.trigger_b.output, payload);
    assert.equal(result.context.steps.trigger_b.status, "SUCCESS");
  });

  it("passes through disabled normal nodes to their downstream targets", async () => {
    const wf = baseWorkflow();
    wf.nodes.disabled_mid = {
      type: "set",
      name: "Disabled Mid",
      disabled: true,
      assignments: [{ key: "ignored", value: "ignored" }],
    };
    wf.nodes.after_disabled = {
      type: "set",
      name: "After Disabled",
      assignments: [{ key: "continued", value: "yes" }],
    };
    wf.edges = [
      { id: "start-disabled", source: "trigger_a", target: "disabled_mid" },
      { id: "disabled-after", source: "disabled_mid", target: "after_disabled" },
    ];
    WorkflowRepository.saveWorkflow(wf);

    const result = await WorkflowEngine.executeWorkflowFromTrigger(
      wf,
      "trigger_a",
      {},
      "exec_multi_trigger_disabled_pass",
    );

    assert.equal(result.status, "SUCCESS");
    assert.equal(result.context.steps.disabled_mid, undefined);
    assert.equal(result.context.steps.after_disabled.output.continued, "yes");
  });

  it("rejects disabled trigger nodes", async () => {
    const wf = baseWorkflow();
    wf.nodes.trigger_b.disabled = true;

    await assert.rejects(
      WorkflowEngine.executeWorkflowFromTrigger(
        wf,
        "trigger_b",
        {},
        "exec_multi_trigger_disabled_trigger",
      ),
      /disabled/,
    );
  });
});
