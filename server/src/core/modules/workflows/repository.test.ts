import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import Database from "better-sqlite3";

import { createMigrationEngine } from "../../database/migration-engine.ts";
import {
  resetWorkflowDatabaseProvider,
  resetWorkflowGitSnapshotWriter,
  setWorkflowGitSnapshotFileReader,
  setWorkflowDatabaseProvider,
  setWorkflowGitSnapshotRepositoryDeleter,
  setWorkflowGitSnapshotWriter,
  migrateWorkflow,
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
    setWorkflowGitSnapshotWriter((item) => {
      snapshots.push(item);
    });
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

  it("migrates legacy File Dataset document edges through a Default Data Loader", () => {
    const legacy = workflow("wf-loader-migration", "Loader Migration") as any;
    legacy.nodes = {
      files: {
        type: "file-dataset",
        name: "Files",
        format: "auto",
        files: [{ filename: "guide.md", content: "U2FpbG9y" }],
        chunking: {
          enabled: true,
          chunkSize: 1200,
          chunkOverlap: 200,
          contextualOverlapEnabled: true,
          maxPreviousContextChars: 300,
        },
        ui: { positionX: 100, positionY: 320 },
      },
      store: {
        type: "vector-store",
        name: "Store",
        pluginId: "qdrant",
        ensureCollectionMethodId: "ensure",
        upsertMethodId: "upsert",
        queryMethodId: "query",
        collectionName: "docs",
        dimension: 1536,
        metric: "cosine",
        config: {},
        ui: { positionX: 500, positionY: 120 },
      },
    };
    legacy.edges = [{ id: "files-store", source: "files", target: "store", targetHandle: "document" }];

    const migrated = migrateWorkflow(legacy);
    const loader = migrated.nodes.files_document_loader as any;

    assert.equal(loader.type, "document-loader");
    assert.equal(loader.name, "Default Data Loader");
    assert.equal(loader.dataType, "file");
    assert.equal(loader.dataMode, "all");
    assert.deepEqual(loader.chunking, legacy.nodes.files.chunking);
    assert.deepEqual(loader.ui, { positionX: 300, positionY: 220 });
    assert.deepEqual(migrated.edges, [
      { id: "files-store:data", source: "files", target: "files_document_loader", targetHandle: "data" },
      { id: "files-store", source: "files_document_loader", target: "store", targetHandle: "document" },
    ]);
    assert.equal(migrated.metadata.migrationVersion, "document-loader-v1");
    assert.deepEqual(migrated.metadata.migrationNotes, [
      "Inserted Default Data Loader between legacy dataset document sources and Vector Store.",
    ]);
  });

  it("does not duplicate Document Loader nodes when migration runs more than once", () => {
    const legacy = workflow("wf-loader-idempotent", "Loader Migration") as any;
    legacy.nodes = {
      files: {
        type: "file-dataset",
        name: "Files",
        format: "auto",
        chunking: { enabled: false, chunkSize: 800, chunkOverlap: 0, contextualOverlapEnabled: false },
      },
      store: {
        type: "vector-store",
        name: "Store",
        pluginId: "qdrant",
        ensureCollectionMethodId: "ensure",
        upsertMethodId: "upsert",
        queryMethodId: "query",
        collectionName: "docs",
        dimension: 1536,
        metric: "cosine",
        config: {},
      },
    };
    legacy.edges = [{ id: "files-store", source: "files", target: "store", targetHandle: "document" }];

    const once = migrateWorkflow(legacy);
    const twice = migrateWorkflow(once);

    assert.equal(Object.values(twice.nodes).filter((node: any) => node.type === "document-loader").length, 1);
    assert.deepEqual(twice.edges, once.edges);
  });

  it("persists migrated workflow definitions on save", async () => {
    const db = await createWorkflowDb();
    setWorkflowDatabaseProvider(() => db);
    const legacy = workflow("wf-loader-save", "Loader Save") as any;
    legacy.nodes = {
      files: {
        type: "file-dataset",
        name: "Files",
        format: "auto",
        chunking: { enabled: false, chunkSize: 800, chunkOverlap: 0, contextualOverlapEnabled: false },
      },
      store: {
        type: "vector-store",
        name: "Store",
        pluginId: "qdrant",
        ensureCollectionMethodId: "ensure",
        upsertMethodId: "upsert",
        queryMethodId: "query",
        collectionName: "docs",
        dimension: 1536,
        metric: "cosine",
        config: {},
      },
    };
    legacy.edges = [{ id: "files-store", source: "files", target: "store", targetHandle: "document" }];

    const saved = WorkflowRepository.saveWorkflow(legacy);
    const raw = db.prepare("SELECT definition FROM workflows WHERE id = ?").get("wf-loader-save") as { definition: string };
    const stored = JSON.parse(raw.definition) as WorkflowItem;

    assert.equal(saved.nodes.files_document_loader?.type, "document-loader");
    assert.equal(stored.nodes.files_document_loader?.type, "document-loader");
    assert.equal(stored.edges[0]?.target, "files_document_loader");
    db.close();
  });

  it("deletes the workflow git repository folder when deleting a workflow", async () => {
    const db = await createWorkflowDb();
    const deletedWorkflowIds: string[] = [];
    setWorkflowDatabaseProvider(() => db);
    setWorkflowGitSnapshotRepositoryDeleter((workflowId) => {
      deletedWorkflowIds.push(workflowId);
    });
    WorkflowRepository.saveWorkflow(workflow("wf-delete", "Delete Me"));

    WorkflowRepository.deleteWorkflow("wf-delete");

    assert.equal(WorkflowRepository.getWorkflowById("wf-delete"), null);
    assert.deepEqual(deletedWorkflowIds, ["wf-delete"]);
    db.close();
  });
});
