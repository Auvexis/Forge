import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { createMigrationEngine } from "../../database/migration-engine.ts";
import {
  resetWorkflowDatabaseProvider,
  resetWorkflowGitSnapshotWriter,
  setWorkflowGitSnapshotFileReader,
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

  it("does not record workflow git snapshots during regular save, publish, or unpublish", async () => {
    const db = await createWorkflowDb();
    const snapshots: WorkflowItem[] = [];
    setWorkflowDatabaseProvider(() => db);
    setWorkflowGitSnapshotWriter((item) => {
      snapshots.push(item);
    });

    const saved = workflow("wf-git", "Git Saved");
    WorkflowRepository.saveWorkflow(saved);
    WorkflowRepository.publishWorkflow(saved.metadata.id);
    WorkflowRepository.unpublishWorkflow(saved.metadata.id);

    assert.equal(snapshots.length, 0);
    db.close();
  });

  it("records a workflow git snapshot only when commit is requested explicitly", async () => {
    const db = await createWorkflowDb();
    const commits: { workflow: WorkflowItem; message: string | undefined }[] = [];
    setWorkflowDatabaseProvider(() => db);
    setWorkflowGitSnapshotWriter((item, message) => {
      commits.push({ workflow: item, message });
      return {
        committed: true,
        status: {
          available: true,
          state: "ready",
          repoPath: "/tmp/wf-git",
          branch: "main",
          latestCommit: {
            hash: "abc123def",
            shortHash: "abc123d",
            committedAt: "2026-06-07T00:00:00.000Z",
            message: message ?? "",
          },
          error: null,
        },
      };
    });

    const saved = workflow("wf-git", "Git Saved");
    WorkflowRepository.saveWorkflow(saved);
    const result = WorkflowRepository.commitWorkflowGitSnapshot(saved.metadata.id, "Manual checkpoint");

    assert.equal(commits.length, 1);
    assert.equal(commits[0]?.workflow.metadata.id, "wf-git");
    assert.equal(commits[0]?.message, "Manual checkpoint");
    assert.equal(result.committed, true);
    assert.equal(result.status.latestCommit?.message, "Manual checkpoint");
    db.close();
  });

  it("restores a workflow git snapshot while preserving the current workflow id", async () => {
    const db = await createWorkflowDb();
    const snapshots: WorkflowItem[] = [];
    setWorkflowDatabaseProvider(() => db);
    setWorkflowGitSnapshotWriter((item) => snapshots.push(item));
    setWorkflowGitSnapshotFileReader((_workflowId, hash) => ({
      hash,
      rawWorkflowJson: JSON.stringify(workflow("old-id", "Old Version")),
      workflow: workflow("old-id", "Old Version"),
    }));
    WorkflowRepository.saveWorkflow(workflow("wf-current", "Current Version"));

    const restored = WorkflowRepository.restoreWorkflowGitSnapshot("wf-current", "abc123def");

    assert.equal(restored.metadata.id, "wf-current");
    assert.equal(restored.metadata.name, "Old Version");
    assert.equal(WorkflowRepository.getWorkflowById("wf-current")?.metadata.name, "Old Version");
    assert.equal(snapshots.length, 0);
    db.close();
  });
});
