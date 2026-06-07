// ─────────────────────────────────────────────────────────────
//  Workflows API
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './client'
import { ENDPOINTS } from './endpoints'
import { API_BASE_URL } from '../constants/app'
import type { FormTheme, FormTriggerField, WorkflowItem } from '../types/workflow.types'
import type { DevWorkflowSessionStatus, ExecutionLog, WorkflowExecutionStatus } from '../types/execution.types'

// ── Production Status Shape ───────────────────────────────

export interface ProductionWorkflowStatus {
  id: string
  name: string
  profileId?: string
  profileName?: string
  triggerType:
    | 'manual'
    | 'webhook'
    | 'cron'
    | 'schedule'
    | 'event'
    | 'event-listener'
    | 'plugin'
    | 'form'
    | 'webhook-form'
    | 'chat'
    | 'subworkflow'
  publishedAt: string | null
  lastExecution: {
    id: string
    status: string
    startTime: number
    endTime: number | null
  } | null
}

export interface FormDefinition {
  id: string
  workflowId: string
  triggerNodeId?: string
  mode: 'test' | 'prod' | 'temp'
  title: string
  description: string
  fields: FormTriggerField[]
  theme: FormTheme
  expiresAt?: number
}

export interface DevWorkflowSessionTrigger {
  triggerNodeId: string
  type: string
  name: string
  webhookPath?: string | null
}

export interface DevWorkflowSessionResponse {
  sessionId: string
  status: DevWorkflowSessionStatus
  triggers: DevWorkflowSessionTrigger[]
  initialPayload: Record<string, unknown>
}

export interface DevWorkflowTriggerExecutionResponse {
  sessionId: string
  jobId: string
  executionId: string
  triggerNodeId: string
}

export interface WorkflowGitSnapshotStatus {
  available: boolean
  state: 'missing' | 'ready' | 'no-commits' | 'error'
  repoPath: string
  branch: string | null
  latestCommit: {
    hash: string
    shortHash: string
    committedAt: string
    message: string
  } | null
  error: string | null
}

export interface WorkflowGitSnapshotSummary {
  hash: string
  shortHash: string
  committedAt: string
  message: string
}

export interface WorkflowGitSnapshotFile {
  hash: string
  rawWorkflowJson: string
  workflow: WorkflowItem
}

export interface WorkflowGitCommitResult {
  committed: boolean
  status: WorkflowGitSnapshotStatus
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

  /** Get the workflow's local git snapshot status */
  getGitStatus: (id: string) =>
    apiRequest<WorkflowGitSnapshotStatus>(ENDPOINTS.WORKFLOW_GIT_STATUS(id)),

  /** List the workflow's local git snapshots */
  listGitSnapshots: (id: string) =>
    apiRequest<WorkflowGitSnapshotSummary[]>(ENDPOINTS.WORKFLOW_GIT_SNAPSHOTS(id)),

  /** Read a workflow.json file from a git snapshot */
  getGitSnapshot: (id: string, hash: string) =>
    apiRequest<WorkflowGitSnapshotFile>(ENDPOINTS.WORKFLOW_GIT_SNAPSHOT(id, hash)),

  /** Restore a workflow from a git snapshot */
  restoreGitSnapshot: (id: string, hash: string) =>
    apiRequest<WorkflowItem>(ENDPOINTS.WORKFLOW_GIT_SNAPSHOT_RESTORE(id, hash), {
      method: 'POST',
    }),

  /** Commit the current saved workflow.json to the local workflow git repository */
  commitGitSnapshot: (id: string, message: string) =>
    apiRequest<WorkflowGitCommitResult>(ENDPOINTS.WORKFLOW_GIT_COMMIT(id), {
      method: 'POST',
      body: { message },
    }),

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

  /** Get all published workflows from every profile scope. */
  getGlobalProductionStatus: () =>
    apiRequest<ProductionWorkflowStatus[]>(ENDPOINTS.WORKFLOW_GLOBAL_PRODUCTION_STATUS),

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
  getExecutions: async (id: string, profileId?: string): Promise<ExecutionLog[]> => {
    const raw = await apiRequest<ServerExecutionLog[]>(
      profileId
        ? ENDPOINTS.PROFILE_WORKFLOW_EXECUTIONS(profileId, id)
        : ENDPOINTS.EXECUTIONS_BY_WORKFLOW(id),
    )
    return raw.map(mapExecutionLog)
  },

  /** Clear execution history for a workflow */
  clearExecutions: (id: string) =>
    apiRequest<null>(ENDPOINTS.EXECUTIONS_BY_WORKFLOW(id), {
      method: 'DELETE',
    }),

  /** Manually trigger a workflow execution */
  execute: (id: string, payload?: Record<string, unknown>, clientExecId?: string, triggerNodeId?: string) => {
    const headers: Record<string, string> = {}
    if (clientExecId) {
      headers['x-sailor-execution-id'] = clientExecId
    }

    // If the payload contains any File objects, send as multipart/form-data so
    // the binary data is preserved. JSON.stringify() silently converts Files to
    // `{}`, which causes "Invalid content type" errors in upload plugins.
    const hasFiles = payload && Object.values(payload).some((v) => v instanceof File)

    let body: FormData | Record<string, unknown>
    if (hasFiles && payload) {
      const form = new FormData()
      for (const [key, value] of Object.entries(payload)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            form.append(key, String(item))
          }
        } else if (value instanceof File) {
          form.append(key, value, value.name)
        } else if (value !== undefined && value !== null) {
          form.append(key, typeof value === 'string' ? value : JSON.stringify(value))
        }
      }
      body = form
    } else {
      body = payload ?? {}
    }

    const suffix = triggerNodeId ? `?triggerNodeId=${encodeURIComponent(triggerNodeId)}` : ''
    return apiRequest<{ executionId: string }>(`${ENDPOINTS.EXECUTE_WORKFLOW(id)}${suffix}`, {
      method: 'POST',
      body,
      headers,
    })
  },

  createDevSession: (id: string, payload: Record<string, unknown> = {}, triggerNodeId?: string) => {
    return apiRequest<DevWorkflowSessionResponse>(ENDPOINTS.CREATE_DEV_SESSION(id), {
      method: 'POST',
      body: {
        payload,
        triggerNodeId,
      },
    })
  },

  stopDevSession: (sessionId: string) =>
    apiRequest<{ sessionId: string }>(ENDPOINTS.STOP_DEV_SESSION(sessionId), {
      method: 'POST',
    }),

  executeDevSessionTrigger: (
    sessionId: string,
    triggerNodeId: string,
    payload: Record<string, unknown> = {},
  ) =>
    apiRequest<DevWorkflowTriggerExecutionResponse>(
      ENDPOINTS.EXECUTE_DEV_SESSION_TRIGGER(sessionId, triggerNodeId),
      {
        method: 'POST',
        body: { payload },
      },
    ),

  createDevSessionStream: (sessionId: string): EventSource => {
    return new EventSource(`${API_BASE_URL}${ENDPOINTS.STREAM_DEV_SESSION(sessionId)}`)
  },

  /** Request to cancel an active execution */
  cancelExecution: (executionId: string) =>
    apiRequest<{ executionId: string }>(ENDPOINTS.CANCEL_EXECUTION(executionId), {
      method: 'POST',
    }),

  /** Execute a single node in isolation (Test Step) */
  executeNode: (workflowId: string, nodeId: string, nodeConfig: unknown, context?: unknown) =>
    apiRequest<any>(`${ENDPOINTS.WORKFLOW_BY_ID(workflowId)}/nodes/${nodeId}/execute`, {
      method: 'POST',
      body: context
        ? { nodeConfig, context }
        : nodeConfig as Record<string, unknown>,
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

  /**
   * Opens an SSE connection that waits for the next webhook call on this workflow.
   * Events emitted:
   *   { type: 'listening', webhookPath }  — server is ready
   *   { type: 'captured', payload }       — webhook received, payload captured
   *   { type: 'timeout' }                 — 120s elapsed with no webhook
   */
  listenForTrigger: (workflowId: string, triggerNodeId?: string): EventSource => {
    const suffix = triggerNodeId ? `?triggerNodeId=${encodeURIComponent(triggerNodeId)}` : ''
    return new EventSource(`${API_BASE_URL}${ENDPOINTS.TRIGGER_LISTEN(workflowId)}${suffix}`)
  },

  /**
   * Fetches the last webhook payload captured during a "Listen for Event" session.
   * Returns null if no payload has been captured yet.
   */
  getLastTriggerPayload: (workflowId: string) =>
    apiRequest<Record<string, any> | null>(ENDPOINTS.TRIGGER_LAST_PAYLOAD(workflowId)),

  getFormDefinition: (formId: string, mode: 'test' | 'prod', profileId?: string) =>
    apiRequest<FormDefinition>(profileId
      ? ENDPOINTS.PROFILE_FORM_DEFINITION(profileId, formId)
      : ENDPOINTS.FORM_DEFINITION(formId), {
      params: { mode },
    }),

  getTemporaryFormDefinition: (formId: string) =>
    apiRequest<FormDefinition>(ENDPOINTS.TEMPORARY_FORM_DEFINITION(formId)),

  submitForm: (
    formId: string,
    mode: 'test' | 'prod',
    payload: Record<string, unknown>,
    clientExecId?: string,
    profileId?: string,
  ) => {
    const headers: Record<string, string> = {}
    if (clientExecId) headers['x-sailor-execution-id'] = clientExecId

    const hasFiles = Object.values(payload).some((value) => value instanceof File)
    let body: Record<string, unknown> | FormData = payload

    if (hasFiles) {
      const form = new FormData()
      for (const [key, value] of Object.entries(payload)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            form.append(key, String(item))
          }
        } else if (value instanceof File) {
          form.append(key, value, value.name)
        } else if (value !== undefined && value !== null) {
          form.append(key, typeof value === 'string' ? value : JSON.stringify(value))
        }
      }
      body = form
    }

    return apiRequest<{ executionId: string }>(profileId
      ? ENDPOINTS.PROFILE_FORM_SUBMIT(profileId, formId)
      : ENDPOINTS.FORM_SUBMIT(formId), {
      method: 'POST',
      params: { mode },
      body,
      headers,
    })
  },

  submitTemporaryForm: (formId: string, payload: Record<string, unknown>) => {
    const hasFiles = Object.values(payload).some((value) => value instanceof File)
    let body: Record<string, unknown> | FormData = payload

    if (hasFiles) {
      const form = new FormData()
      for (const [key, value] of Object.entries(payload)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            form.append(key, String(item))
          }
        } else if (value instanceof File) {
          form.append(key, value, value.name)
        } else if (value !== undefined && value !== null) {
          form.append(key, typeof value === 'string' ? value : JSON.stringify(value))
        }
      }
      body = form
    }

    return apiRequest<{ submitted: boolean }>(ENDPOINTS.TEMPORARY_FORM_SUBMIT(formId), {
      method: 'POST',
      body,
    })
  },
}
