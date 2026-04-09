import { db } from "../../database.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

export const WorkflowRepository = {
  saveWorkflow: (workflow: WorkflowItem) => {
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO workflows (id, name, description, version, is_active, is_public, created_at, definition)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run(
      workflow.metadata.id,
      workflow.metadata.name,
      workflow.metadata.description || null,
      workflow.metadata.version,
      workflow.metadata.isActive ? 1 : 0,
      workflow.metadata.public ? 1 : 0,
      workflow.metadata.createdAt,
      JSON.stringify(workflow)
    );
    return workflow;
  },

  getWorkflows: (): WorkflowItem[] => {
    const stmt = db.prepare(`SELECT definition FROM workflows`);
    const rows = stmt.all() as { definition: string }[];
    return rows.map((row) => JSON.parse(row.definition) as WorkflowItem);
  },

  getWorkflowById: (id: string): WorkflowItem | null => {
    const stmt = db.prepare(`SELECT definition FROM workflows WHERE id = ?`);
    const row = stmt.get(id) as { definition: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.definition) as WorkflowItem;
  },

  deleteWorkflow: (id: string) => {
    const stmt = db.prepare(`DELETE FROM workflows WHERE id = ?`);
    stmt.run(id);
  },

  deleteWorkflowExecutions: (workflowId: string) => {
    const stmt = db.prepare(`DELETE FROM workflow_executions WHERE workflow_id = ?`);
    stmt.run(workflowId);
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
    const rows = stmt.all();
    return rows.map((row: any) => ({
      ...row,
      context_state: JSON.parse(row.context_state),
    }));
  },
};
