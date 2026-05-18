import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { createMigrationEngine } from "../../database/migration-engine.ts";
import {
  resetWorkflowDatabaseProvider,
  setWorkflowDatabaseProvider,
  WorkflowRepository,
} from "../workflows/repository.ts";
import { Scheduler } from "./scheduler.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

async function createWorkflowDb(): Promise<Database.Database> {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  await createMigrationEngine(db, "workflows").up();
  return db;
}

function cronWorkflow(id: string, name: string): WorkflowItem {
  return {
    metadata: {
      id,
      name,
      version: "1.0.0",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: "2026-05-18T00:00:00.000Z",
    },
    trigger: { type: "cron", cronExpression: "*/1 * * * *" },
    nodes: {},
    edges: [],
    variables: [],
  };
}

describe("Scheduler", () => {
  afterEach(() => {
    Scheduler.resetProfileScope();
    Scheduler.stopAll();
    resetWorkflowDatabaseProvider();
  });

  it("keeps cron jobs from every profile when the active profile changes", async () => {
    const dbs = {
      andre: await createWorkflowDb(),
      bruno: await createWorkflowDb(),
    };
    let currentDb = dbs.andre;
    setWorkflowDatabaseProvider(() => currentDb);

    currentDb = dbs.andre;
    WorkflowRepository.saveWorkflow(cronWorkflow("wf-andre", "Andre cron"));
    currentDb = dbs.bruno;
    WorkflowRepository.saveWorkflow(cronWorkflow("wf-bruno", "Bruno cron"));

    Scheduler.configureProfileScope({
      listProfileIds: () => ["andre", "bruno"],
      runWithProfile: (profileId, callback) => {
        currentDb = dbs[profileId as keyof typeof dbs];
        return callback();
      },
    });

    Scheduler.resync();

    assert.deepEqual(Scheduler.getActiveJobs().sort(), [
      "andre:wf-andre:trigger",
      "bruno:wf-bruno:trigger",
    ]);

    dbs.andre.close();
    dbs.bruno.close();
  });

  it("removes every scheduled job that belongs to a deleted profile", async () => {
    const dbs = {
      andre: await createWorkflowDb(),
      bruno: await createWorkflowDb(),
    };
    let currentDb = dbs.andre;
    setWorkflowDatabaseProvider(() => currentDb);

    currentDb = dbs.andre;
    WorkflowRepository.saveWorkflow(cronWorkflow("wf-andre", "Andre cron"));
    currentDb = dbs.bruno;
    WorkflowRepository.saveWorkflow(cronWorkflow("wf-bruno", "Bruno cron"));

    Scheduler.configureProfileScope({
      listProfileIds: () => ["andre", "bruno"],
      runWithProfile: (profileId, callback) => {
        currentDb = dbs[profileId as keyof typeof dbs];
        return callback();
      },
    });

    Scheduler.resync();
    Scheduler.unscheduleProfile("bruno");

    assert.deepEqual(Scheduler.getActiveJobs(), ["andre:wf-andre:trigger"]);

    dbs.andre.close();
    dbs.bruno.close();
  });
});
