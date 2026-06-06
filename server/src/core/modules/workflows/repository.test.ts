import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { createMigrationEngine } from "../../database/migration-engine.ts";
import {
  resetWorkflowDatabaseProvider,
  resetWorkflowGitSnapshotWriter,
  setWorkflowDatabaseProvider,
  setWorkflowGitSnapshotWriter,
  WorkflowRepository,
} from "./repository.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

async function createWorkflowDb(): Promise<Database.Database> {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  await createMigrationEngine(db, "workflows").up();
  return db;
}

function workflow(id: string, name: string): WorkflowItem {
  return {
    metadata: {
      id,
      name,
      version: "1.0.0",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: "2026-05-17T00:00:00.000Z",
    },
    trigger: { type: "manual" },
    nodes: {},
    edges: [],
    variables: [],
  };
}

describe("WorkflowRepository", () => {
  afterEach(() => {
    resetWorkflowDatabaseProvider();
    resetWorkflowGitSnapshotWriter();
  });

  it("uses the active database provider so workflows stay isolated by profile", async () => {
    const profileA = await createWorkflowDb();
    const profileB = await createWorkflowDb();

    setWorkflowDatabaseProvider(() => profileA);
    WorkflowRepository.saveWorkflow(workflow("wf-profile-a", "Profile A"));

    setWorkflowDatabaseProvider(() => profileB);
    assert.equal(WorkflowRepository.getWorkflowById("wf-profile-a"), null);
    WorkflowRepository.saveWorkflow(workflow("wf-profile-b", "Profile B"));
    assert.deepEqual(
      WorkflowRepository.getWorkflows().map((item) => item.metadata.id),
      ["wf-profile-b"],
    );

    setWorkflowDatabaseProvider(() => profileA);
    assert.deepEqual(
      WorkflowRepository.getWorkflows().map((item) => item.metadata.id),
      ["wf-profile-a"],
    );

    profileA.close();
    profileB.close();
  });

  it("records a workflow git snapshot whenever a workflow is saved", async () => {
    const db = await createWorkflowDb();
    const snapshots: WorkflowItem[] = [];
    setWorkflowDatabaseProvider(() => db);
    setWorkflowGitSnapshotWriter((item) => snapshots.push(item));

    const saved = workflow("wf-git", "Git Saved");
    WorkflowRepository.saveWorkflow(saved);

    assert.equal(snapshots.length, 1);
    assert.equal(snapshots[0]?.metadata.id, "wf-git");
    db.close();
  });
});
