import { DatabaseManager } from "../../database/index.ts";
import { listTriggerEntries } from "./workflow-triggers.ts";
import {
  WorkflowGitSnapshotService,
  type WorkflowGitCommitResult,
  type WorkflowGitSnapshotFile,
  type WorkflowGitSnapshotSummary,
  type WorkflowGitSnapshotStatus,
} from "./workflow-git-snapshot-service.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import type Database from "better-sqlite3";

type WorkflowDatabaseProvider = () => Database.Database;
type WorkflowGitSnapshotWriter = (workflow: WorkflowItem, message?: string) => WorkflowGitCommitResult | void;
type WorkflowGitSnapshotStatusReader = (workflowId: string) => WorkflowGitSnapshotStatus;
type WorkflowGitSnapshotListReader = (workflowId: string) => WorkflowGitSnapshotSummary[];
type WorkflowGitSnapshotFileReader = (workflowId: string, hash: string) => WorkflowGitSnapshotFile;
type WorkflowGitSnapshotRepositoryDeleter = (workflowId: string) => void;

let workflowDatabaseProvider: WorkflowDatabaseProvider = () => DatabaseManager.workflows;
let workflowGitSnapshotWriter: WorkflowGitSnapshotWriter | null = null;
let workflowGitSnapshotStatusReader: WorkflowGitSnapshotStatusReader | null = null;
let workflowGitSnapshotListReader: WorkflowGitSnapshotListReader | null = null;
let workflowGitSnapshotFileReader: WorkflowGitSnapshotFileReader | null = null;
let workflowGitSnapshotRepositoryDeleter: WorkflowGitSnapshotRepositoryDeleter | null = null;

export function setWorkflowDatabaseProvider(provider: WorkflowDatabaseProvider): void {
  workflowDatabaseProvider = provider;
}

export function resetWorkflowDatabaseProvider(): void {
  workflowDatabaseProvider = () => DatabaseManager.workflows;
}

export function setWorkflowGitSnapshotDataDir(dataDir: string): void {
  const service = new WorkflowGitSnapshotService({ dataDir });
  workflowGitSnapshotWriter = (workflow, message) => service.save(workflow, message);
  workflowGitSnapshotStatusReader = (workflowId) => service.status(workflowId);
  workflowGitSnapshotListReader = (workflowId) => service.listSnapshots(workflowId);
  workflowGitSnapshotFileReader = (workflowId, hash) => service.readSnapshot(workflowId, hash);
  workflowGitSnapshotRepositoryDeleter = (workflowId) => service.deleteRepository(workflowId);
}

export function setWorkflowGitSnapshotWriter(writer: WorkflowGitSnapshotWriter | null): void {
  workflowGitSnapshotWriter = writer;
}

export function setWorkflowGitSnapshotStatusReader(reader: WorkflowGitSnapshotStatusReader | null): void {
  workflowGitSnapshotStatusReader = reader;
}

export function setWorkflowGitSnapshotFileReader(reader: WorkflowGitSnapshotFileReader | null): void {
  workflowGitSnapshotFileReader = reader;
}

export function setWorkflowGitSnapshotRepositoryDeleter(deleter: WorkflowGitSnapshotRepositoryDeleter | null): void {
  workflowGitSnapshotRepositoryDeleter = deleter;
}

export function resetWorkflowGitSnapshotWriter(): void {
  workflowGitSnapshotWriter = null;
  workflowGitSnapshotStatusReader = null;
  workflowGitSnapshotListReader = null;
  workflowGitSnapshotFileReader = null;
  workflowGitSnapshotRepositoryDeleter = null;
}

function getWorkflowDatabase(): Database.Database {
  return workflowDatabaseProvider();
}

function getWorkflowGitSnapshotStatus(workflowId: string): WorkflowGitSnapshotStatus {
  return workflowGitSnapshotStatusReader?.(workflowId) ?? {
    available: false,
    state: "missing",
    repoPath: "",
    branch: null,
    latestCommit: null,
    error: null,
  };
}

function commitWorkflowGitSnapshot(workflowId: string, message?: string): WorkflowGitCommitResult {
  if (!workflowGitSnapshotWriter) {
    throw new Error("Workflow git snapshot writer is not configured");
  }

  const workflow = WorkflowRepository.getWorkflowById(workflowId);
  if (!workflow) {
    throw new Error("Workflow not found");
  }

  const result = workflowGitSnapshotWriter(workflow, message);
  return result ?? {
    committed: false,
    status: getWorkflowGitSnapshotStatus(workflowId),
  };
}

function listWorkflowGitSnapshots(workflowId: string): WorkflowGitSnapshotSummary[] {
  return workflowGitSnapshotListReader?.(workflowId) ?? [];
}

function readWorkflowGitSnapshot(workflowId: string, hash: string): WorkflowGitSnapshotFile {
  if (!workflowGitSnapshotFileReader) {
    throw new Error("Workflow git snapshot reader is not configured");
  }
  return workflowGitSnapshotFileReader(workflowId, hash);
}

function restoreWorkflowGitSnapshot(workflowId: string, hash: string): WorkflowItem {
  const snapshot = readWorkflowGitSnapshot(workflowId, hash);
  const restored: WorkflowItem = {
    ...snapshot.workflow,
    metadata: {
      ...snapshot.workflow.metadata,
      id: workflowId,
      updatedAt: new Date().toISOString(),
    },
  };
  return WorkflowRepository.saveWorkflow(restored);
}

export const WorkflowRepository = {
  database: () => getWorkflowDatabase(),

  getWorkflowGitSnapshotStatus,
  commitWorkflowGitSnapshot,
  listWorkflowGitSnapshots,
  readWorkflowGitSnapshot,
  restoreWorkflowGitSnapshot,

  saveWorkflow: (workflow: WorkflowItem) => {
    const stmt = getWorkflowDatabase().prepare(
      `INSERT INTO workflows (id, name, description, version, is_active, is_public, is_draft, created_at, published_at, definition)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         version = excluded.version,
         is_active = excluded.is_active,
         is_public = excluded.is_public,
         is_draft = excluded.is_draft,
         published_at = excluded.published_at,
         definition = excluded.definition`
    );
    stmt.run(
      workflow.metadata.id,
      workflow.metadata.name,
      workflow.metadata.description || null,
      workflow.metadata.version,
      workflow.metadata.isActive ? 1 : 0,
      workflow.metadata.public ? 1 : 0,
      workflow.metadata.isDraft ? 1 : 0,
      workflow.metadata.createdAt,
      workflow.metadata.publishedAt || null,
      JSON.stringify(workflow)
    );
    return workflow;
  },

  getWorkflows: (): WorkflowItem[] => {
    const stmt = getWorkflowDatabase().prepare(`SELECT definition FROM workflows`);
    const rows = stmt.all() as { definition: string }[];
    return rows.map((row) => migrateWorkflow(JSON.parse(row.definition)));
  },

  getActiveWorkflows: (): WorkflowItem[] => {
    const stmt = getWorkflowDatabase().prepare(
      `SELECT definition FROM workflows WHERE is_active = 1 AND is_draft = 0`
    );
    const rows = stmt.all() as { definition: string }[];
    return rows.map((row) => migrateWorkflow(JSON.parse(row.definition)));
  },

  getDrafts: (): WorkflowItem[] => {
    const stmt = getWorkflowDatabase().prepare(
      `SELECT definition FROM workflows WHERE is_draft = 1`
    );
    const rows = stmt.all() as { definition: string }[];
    return rows.map((row) => migrateWorkflow(JSON.parse(row.definition)));
  },

  getWorkflowById: (id: string): WorkflowItem | null => {
    const stmt = getWorkflowDatabase().prepare(`SELECT definition FROM workflows WHERE id = ?`);
    const row = stmt.get(id) as { definition: string } | undefined;
    if (!row) return null;
    return migrateWorkflow(JSON.parse(row.definition));
  },

  deleteWorkflow: (id: string) => {
    const stmt = getWorkflowDatabase().prepare(`DELETE FROM workflows WHERE id = ?`);
    stmt.run(id);
    workflowGitSnapshotRepositoryDeleter?.(id);
  },

  deleteWorkflowExecutions: (workflowId: string) => {
    const stmt = getWorkflowDatabase().prepare(`DELETE FROM workflow_executions WHERE workflow_id = ?`);
    stmt.run(workflowId);
  },

  /**
   * Publish: sets is_active=1, is_draft=0, published_at=now.
   * Returns the updated workflow or null if not found.
   */
  publishWorkflow: (id: string): WorkflowItem | null => {
    const now = new Date().toISOString();
    getWorkflowDatabase().prepare(
      `UPDATE workflows SET is_active=1, is_draft=0, published_at=? WHERE id=?`
    ).run(now, id);

    const workflow = WorkflowRepository.getWorkflowById(id);
    if (!workflow) return null;

    workflow.metadata.isActive = true;
    workflow.metadata.isDraft = false;
    workflow.metadata.publishedAt = now;
    workflow.metadata.updatedAt = now;

    // Persist the updated definition blob
    getWorkflowDatabase().prepare(`UPDATE workflows SET definition=? WHERE id=?`).run(
      JSON.stringify(workflow),
      id
    );

    return workflow;
  },

  /**
   * Unpublish: sets is_active=0. Cron/webhook will stop responding.
   * Returns the updated workflow or null if not found.
   */
  unpublishWorkflow: (id: string): WorkflowItem | null => {
    const now = new Date().toISOString();
    getWorkflowDatabase().prepare(`UPDATE workflows SET is_active=0, published_at=NULL WHERE id=?`).run(id);

    const workflow = WorkflowRepository.getWorkflowById(id);
    if (!workflow) return null;

    workflow.metadata.isActive = false;
    workflow.metadata.publishedAt = null;
    workflow.metadata.updatedAt = now;

    getWorkflowDatabase().prepare(`UPDATE workflows SET definition=? WHERE id=?`).run(
      JSON.stringify(workflow),
      id
    );

    return workflow;
  },

  /**
   * Returns all published (is_active=1, is_draft=0) workflows with their
   * last execution row attached (if any). Used by the Production Monitor.
   */
  getProductionStatus: () => {
    const rows = getWorkflowDatabase().prepare(`
      SELECT
        w.id,
        w.name,
        w.definition,
        w.published_at,
        e.id          AS exec_id,
        e.status      AS exec_status,
        e.start_time  AS exec_start,
        e.end_time    AS exec_end
      FROM workflows w
      LEFT JOIN (
        SELECT workflow_id, id, status, start_time, end_time
        FROM workflow_executions
        WHERE (workflow_id, start_time) IN (
          SELECT workflow_id, MAX(start_time)
          FROM workflow_executions
          GROUP BY workflow_id
        )
      ) e ON e.workflow_id = w.id
      WHERE w.is_active = 1 AND w.is_draft = 0
      ORDER BY w.name ASC
    `).all() as any[];

    return rows.map((row) => {
      const def = JSON.parse(row.definition) as WorkflowItem;
      const triggerEntries = listTriggerEntries(def);
      const primaryTrigger = triggerEntries.find((entry) => !entry.disabled) ?? triggerEntries[0];
      return {
        id: row.id as string,
        name: row.name as string,
        triggerType: primaryTrigger?.trigger.type ?? def.trigger.type,
        publishedAt: row.published_at as string | null,
        lastExecution: row.exec_id
          ? {
              id: row.exec_id as string,
              status: row.exec_status as string,
              startTime: row.exec_start as number,
              endTime: row.exec_end as number | null,
            }
          : null,
      };
    });
  },

  /**
   * Validates a webhookSlug: kebab-case format and not already used by another workflow.
   * Returns null if valid, or an error string if invalid.
   */
  validateWebhookSlug: (slug: string, excludeWorkflowId?: string): string | null => {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      return `webhookSlug must be kebab-case (e.g. 'nova-venda'). Got: '${slug}'`;
    }

    const existing = getWorkflowDatabase().prepare(
      `SELECT id FROM workflows WHERE json_extract(definition, '$.trigger.webhookSlug') = ?`
    ).get(slug) as { id: string } | undefined;

    if (existing && existing.id !== excludeWorkflowId) {
      return `webhookSlug '${slug}' is already used by another workflow`;
    }

    return null;
  },

  /**
   * Validates a Form trigger public ID. It shares the same URL-safe shape as
   * webhook slugs, but lives in the form trigger namespace.
   */
  validateFormSlug: (slug: string, excludeWorkflowId?: string): string | null => {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      return `formSlug must be kebab-case (e.g. 'contact-us'). Got: '${slug}'`;
    }

    const existing = getWorkflowDatabase().prepare(
      `SELECT id FROM workflows WHERE json_extract(definition, '$.trigger.formSlug') = ?`
    ).get(slug) as { id: string } | undefined;

    if (existing && existing.id !== excludeWorkflowId) {
      return `formSlug '${slug}' is already used by another workflow`;
    }

    return null;
  },

  saveExecutionLog: (
    executionId: string,
    workflowId: string,
    status: string,
    startTime: number,
    endTime: number | null,
    contextState: any
  ) => {
    const stmt = getWorkflowDatabase().prepare(
      `INSERT OR REPLACE INTO workflow_executions (id, workflow_id, status, start_time, end_time, context_state)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      executionId,
      workflowId,
      status,
      startTime,
      endTime,
      JSON.stringify(contextState)
    );
  },

  getWorkflowExecutions: (workflowId: string) => {
    const stmt = getWorkflowDatabase().prepare(
      `SELECT * FROM workflow_executions WHERE workflow_id = ? ORDER BY start_time DESC`
    );
    const rows = stmt.all(workflowId);
    return rows.map((row: any) => ({
      ...row,
      context_state: JSON.parse(row.context_state),
    }));
  },

  getWorkflowExecutionById: (executionId: string) => {
    const row = getWorkflowDatabase()
      .prepare(`SELECT * FROM workflow_executions WHERE id = ?`)
      .get(executionId) as any;
    if (!row) return null;
    return {
      ...row,
      context_state: JSON.parse(row.context_state),
    };
  },

  // ──────────── Listen for Event payload storage ────────────

  /**
   * Persists the raw webhook payload captured during a "Listen for Event" session.
   * Also updates the workflow definition blob so the trigger.lastTriggerPayload field
   * survives a server restart and is available to the frontend left pane.
   */
  saveLastTriggerPayload: (workflowId: string, payload: Record<string, any>) => {
    // Update the dedicated column for fast retrieval
    getWorkflowDatabase().prepare(`UPDATE workflows SET last_trigger_payload = ? WHERE id = ?`)
      .run(JSON.stringify(payload), workflowId);

    // Also embed it in the definition blob so the WorkflowItem returned by
    // getWorkflowById() already contains the payload without an extra query.
    const workflow = WorkflowRepository.getWorkflowById(workflowId);
    if (workflow) {
      workflow.trigger.lastTriggerPayload = payload;
      getWorkflowDatabase().prepare(`UPDATE workflows SET definition = ? WHERE id = ?`)
        .run(JSON.stringify(workflow), workflowId);
    }
  },

  /**
   * Returns the last captured trigger payload for a workflow, or null.
   */
  getLastTriggerPayload: (workflowId: string): Record<string, any> | null => {
    const row = getWorkflowDatabase().prepare(`SELECT last_trigger_payload FROM workflows WHERE id = ?`)
      .get(workflowId) as { last_trigger_payload: string | null } | undefined;

    if (!row || !row.last_trigger_payload) return null;
    try {
      return JSON.parse(row.last_trigger_payload);
    } catch {
      return null;
    }
  },
};

// ──────────── Runtime migration ────────────

/**
 * Migrates legacy workflows (pre-discriminated-union) to the new format.
 */
function migrateWorkflow(workflow: any): WorkflowItem {
  if (workflow.metadata && workflow.metadata.isDraft === undefined) {
    workflow.metadata.isDraft = false;
  }
  if (workflow.metadata && !workflow.metadata.updatedAt) {
    workflow.metadata.updatedAt = workflow.metadata.createdAt;
  }
  if (workflow.metadata && workflow.metadata.autosaveEnabled === undefined) {
    workflow.metadata.autosaveEnabled = false;
  }
  if (workflow.nodes) {
    for (const [_id, node] of Object.entries(workflow.nodes)) {
      const n = node as any;
      if (!n.type) n.type = "plugin";
    }
  }
  if (!workflow.variables) {
    workflow.variables = [];
  }
  return workflow as WorkflowItem;
}
