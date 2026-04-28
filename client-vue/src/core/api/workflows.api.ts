// ─────────────────────────────────────────────────────────────
//  Workflows API
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './client'
import { ENDPOINTS } from './endpoints'
import { API_BASE_URL } from '../constants/app'
import type { WorkflowItem } from '../types/workflow.types'
import type { ExecutionLog, WorkflowExecutionStatus } from '../types/execution.types'

// ── Production Status Shape ───────────────────────────────

export interface ProductionWorkflowStatus {
  id: string
  name: string
  triggerType: 'manual' | 'webhook' | 'cron' | 'event'
  publishedAt: string | null
  lastExecution: {
    id: string
    status: string
    startTime: number
    endTime: number | null
  } | null
}

// ── Server response shape (snake_case from SQLite row) ────────

/**
 * Raw execution log as returned by the server before field mapping.
 * The backend stores and returns snake_case column names directly.
 */
interface ServerExecutionLog {
  id: string
  workflow_id: string
  status: string
  start_time: number
  end_time: number | null
  context_state: {
    trigger?: unknown
    steps?: Record<string, { status: string; output?: unknown; error?: string }>
    variables?: Record<string, unknown>
  }
}

/** Maps a raw server execution log to the camelCase ExecutionLog type. */
function mapExecutionLog(raw: ServerExecutionLog): ExecutionLog {
  return {
    id: raw.id,
    workflowId: raw.workflow_id,
    status: raw.status as WorkflowExecutionStatus,
    startedAt: raw.start_time,
    endedAt: raw.end_time,
    // context_state can be null when the workflow fails before the engine
    // initialises (e.g. invalid content type). Default to an empty object so
    // the detail view can always safely access context.trigger / context.steps.
    context: raw.context_state ?? {},
  }
}

// ── API ───────────────────────────────────────────────────────

export const workflowsApi = {
  /** Get all workflows */
  getAll: () => apiRequest<WorkflowItem[]>(ENDPOINTS.WORKFLOWS),

  /** Get a specific workflow by ID */
  getById: (id: string) => apiRequest<WorkflowItem>(ENDPOINTS.WORKFLOW_BY_ID(id)),

  /** Get a workflow schema (includes resolved plugin definitions) */
  getSchema: (id: string) => apiRequest<unknown>(ENDPOINTS.WORKFLOW_SCHEMA(id)),

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

  /** Publish a workflow to active/production status */
  publish: (id: string) =>
    apiRequest<WorkflowItem>(ENDPOINTS.WORKFLOW_PUBLISH(id), { method: 'POST' }),

  /** Unpublish a workflow — removes it from production */
  unpublish: (id: string) =>
    apiRequest<WorkflowItem>(ENDPOINTS.WORKFLOW_UNPUBLISH(id), { method: 'POST' }),

  /** Get all published workflows with their last execution status */
  getProductionStatus: () =>
    apiRequest<ProductionWorkflowStatus[]>(ENDPOINTS.WORKFLOW_PRODUCTION_STATUS),

  /** Delete a workflow */
  delete: (id: string) =>
    apiRequest<null>(ENDPOINTS.WORKFLOW_BY_ID(id), {
      method: 'DELETE',
    }),

  // ── Executions ──────────────────────────────────────────────

  /**
   * Get execution history for a workflow.
   *
   * The server stores and returns executions with snake_case column names
   * (start_time, end_time, workflow_id, context_state). This method maps
   * those to the camelCase ExecutionLog shape expected by the frontend so
   * that callers never have to deal with the raw server format.
   */
  getExecutions: async (id: string): Promise<ExecutionLog[]> => {
    const raw = await apiRequest<ServerExecutionLog[]>(ENDPOINTS.EXECUTIONS_BY_WORKFLOW(id))
    return raw.map(mapExecutionLog)
  },

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

    // If the payload contains any File objects, send as multipart/form-data so
    // the binary data is preserved. JSON.stringify() silently converts Files to
    // `{}`, which causes "Invalid content type" errors in upload plugins.
    const hasFiles = payload && Object.values(payload).some((v) => v instanceof File)

    let body: FormData | Record<string, unknown>
    if (hasFiles && payload) {
      const form = new FormData()
      for (const [key, value] of Object.entries(payload)) {
        if (value instanceof File) {
          form.append(key, value, value.name)
        } else if (value !== undefined && value !== null) {
          form.append(key, typeof value === 'string' ? value : JSON.stringify(value))
        }
      }
      body = form
    } else {
      body = payload ?? {}
    }

    return apiRequest<{ executionId: string }>(ENDPOINTS.EXECUTE_WORKFLOW(id), {
      method: 'POST',
      body,
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
   *
   * NOTE: The server writes all events as bare `data:` lines with no
   * `event:` name. Consumers must use `eventSource.onmessage` and dispatch
   * on the `type` field inside the parsed payload — not named addEventListener
   * calls like addEventListener('node:start', ...).
   */
  createExecutionStream: (executionId: string): EventSource => {
    return new EventSource(`${API_BASE_URL}${ENDPOINTS.STREAM_EXECUTION(executionId)}`)
  },
}
