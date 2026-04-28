import { DatabaseManager } from "../../database/index.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

const db = DatabaseManager.workflows;

export const WorkflowRepository = {
  saveWorkflow: (workflow: WorkflowItem) => {
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO workflows (id, name, description, version, is_active, is_public, is_draft, created_at, definition)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      JSON.stringify(workflow)
    );
    return workflow;
  },

  getWorkflows: (): WorkflowItem[] => {
    const stmt = db.prepare(`SELECT definition FROM workflows`);
    const rows = stmt.all() as { definition: string }[];
    return rows.map((row) => migrateWorkflow(JSON.parse(row.definition)));
  },

  getActiveWorkflows: (): WorkflowItem[] => {
    const stmt = db.prepare(
      `SELECT definition FROM workflows WHERE is_active = 1 AND is_draft = 0`
    );
    const rows = stmt.all() as { definition: string }[];
    return rows.map((row) => migrateWorkflow(JSON.parse(row.definition)));
  },

  getDrafts: (): WorkflowItem[] => {
    const stmt = db.prepare(
      `SELECT definition FROM workflows WHERE is_draft = 1`
    );
    const rows = stmt.all() as { definition: string }[];
    return rows.map((row) => migrateWorkflow(JSON.parse(row.definition)));
  },

  getWorkflowById: (id: string): WorkflowItem | null => {
    const stmt = db.prepare(`SELECT definition FROM workflows WHERE id = ?`);
    const row = stmt.get(id) as { definition: string } | undefined;
    if (!row) return null;
    return migrateWorkflow(JSON.parse(row.definition));
  },

  deleteWorkflow: (id: string) => {
    const stmt = db.prepare(`DELETE FROM workflows WHERE id = ?`);
    stmt.run(id);
  },

  deleteWorkflowExecutions: (workflowId: string) => {
    const stmt = db.prepare(`DELETE FROM workflow_executions WHERE workflow_id = ?`);
    stmt.run(workflowId);
  },

  /**
   * Publish a draft: set isDraft=false and update the persisted definition
   */
  publishDraft: (id: string): WorkflowItem | null => {
    const workflow = WorkflowRepository.getWorkflowById(id);
    if (!workflow) return null;

    workflow.metadata.isDraft = false;
    workflow.metadata.updatedAt = new Date().toISOString();
    WorkflowRepository.saveWorkflow(workflow);
    return workflow;
  },

  saveExecutionLog: (
    executionId: string,
    workflowId: string,
    status: string,
    startTime: number,
    endTime: number | null,
    contextState: any
  ) => {
    const stmt = db.prepare(
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
    const stmt = db.prepare(
      `SELECT * FROM workflow_executions WHERE workflow_id = ? ORDER BY start_time DESC`
    );
    const rows = stmt.all(workflowId);
    return rows.map((row: any) => ({
      ...row,
      context_state: JSON.parse(row.context_state),
    }));
  },
};

// ──────────── Migration ────────────

/**
 * Migrates legacy workflows (pre-discriminated-union) to the new format.
 * Legacy nodes have no `type` field — they are implicitly "plugin" nodes.
 * Also ensures `isDraft` exists on metadata.
 */
function migrateWorkflow(workflow: any): WorkflowItem {
  // Ensure metadata has isDraft
  if (workflow.metadata && workflow.metadata.isDraft === undefined) {
    workflow.metadata.isDraft = false;
  }

  // Ensure metadata has updatedAt
  if (workflow.metadata && !workflow.metadata.updatedAt) {
    workflow.metadata.updatedAt = workflow.metadata.createdAt;
  }

  // Migrate nodes: add type="plugin" if missing
  if (workflow.nodes) {
    for (const [_id, node] of Object.entries(workflow.nodes)) {
      const n = node as any;
      if (!n.type) {
        n.type = "plugin";
      }
    }
  }

  // Ensure edges have sourceHandle/targetHandle (default undefined is fine)
  // Ensure variables array exists
  if (!workflow.variables) {
    workflow.variables = [];
  }

  return workflow as WorkflowItem;
}
