// ─────────────────────────────────────────────────────────────
//  Workflows API
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './client'
import { ENDPOINTS } from './endpoints'
import { API_BASE_URL } from '../constants/app'
import type { WorkflowItem, WorkflowMetadata } from '../types/workflow.types'
import type { ExecutionLog } from '../types/execution.types'

export const workflowsApi = {
  /** Get all workflows */
  getAll: () => apiRequest<WorkflowItem[]>(ENDPOINTS.WORKFLOWS),

  /** Get a specific workflow by ID */
  getById: (id: string) => apiRequest<WorkflowItem>(ENDPOINTS.WORKFLOW_BY_ID(id)),

  /** Get a workflow schema (includes resolved plugin definitions) */
  getSchema: (id: string) => apiRequest<any>(ENDPOINTS.WORKFLOW_SCHEMA(id)),

  /** Create a new workflow */
  create: (workflow: WorkflowItem) =>
    apiRequest<WorkflowItem>(ENDPOINTS.WORKFLOWS, {
      method: 'POST',
      body: workflow,
    }),

  /** Update an existing workflow */
  update: (id: string, workflow: WorkflowItem) =>
    apiRequest<WorkflowItem>(ENDPOINTS.WORKFLOW_BY_ID(id), {
      method: 'PUT',
      body: workflow,
    }),

  /** Publish a draft workflow to active status */
  publish: (id: string) =>
    apiRequest<WorkflowItem>(ENDPOINTS.WORKFLOW_PUBLISH(id), {
      method: 'POST',
    }),

  /** Delete a workflow */
  delete: (id: string) =>
    apiRequest<null>(ENDPOINTS.WORKFLOW_BY_ID(id), {
      method: 'DELETE',
    }),

  // ── Executions ──────────────────────────────────────────────

  /** Get execution history for a workflow */
  getExecutions: (id: string) => apiRequest<ExecutionLog[]>(ENDPOINTS.EXECUTIONS_BY_WORKFLOW(id)),

  /** Clear execution history for a workflow */
  clearExecutions: (id: string) =>
    apiRequest<null>(ENDPOINTS.EXECUTIONS_BY_WORKFLOW(id), {
      method: 'DELETE',
    }),

  /** Manually trigger a workflow execution */
  execute: (id: string, payload?: Record<string, unknown>, clientExecId?: string) => {
    const headers: Record<string, string> = {}
    if (clientExecId) {
      headers['x-nod8-execution-id'] = clientExecId
    }

    return apiRequest<{ executionId: string }>(ENDPOINTS.EXECUTE_WORKFLOW(id), {
      method: 'POST',
      body: payload || {},
      headers,
    })
  },

  /** Request to cancel an active execution */
  cancelExecution: (executionId: string) =>
    apiRequest<{ executionId: string }>(ENDPOINTS.CANCEL_EXECUTION(executionId), {
      method: 'POST',
    }),

  /**
   * Create an EventSource for streaming execution status.
   * Note: The execution must have been triggered first to exist.
   */
  createExecutionStream: (executionId: string): EventSource => {
    return new EventSource(`${API_BASE_URL}${ENDPOINTS.STREAM_EXECUTION(executionId)}`)
  },
}
