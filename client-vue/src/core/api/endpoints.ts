// ─────────────────────────────────────────────────────────────
//  API Endpoint Constants
// ─────────────────────────────────────────────────────────────

export const ENDPOINTS = {
  // Workflows
  WORKFLOWS: '/workflows',
  WORKFLOW_BY_ID: (id: string) => `/workflows/${id}`,
  WORKFLOW_SCHEMA: (id: string) => `/workflows/${id}/schema`,
  WORKFLOW_PUBLISH: (id: string) => `/workflows/${id}/publish`,
  WORKFLOW_UNPUBLISH: (id: string) => `/workflows/${id}/unpublish`,
  WORKFLOW_PRODUCTION_STATUS: '/workflows/production-status',

  // Executions
  EXECUTIONS_BY_WORKFLOW: (id: string) => `/workflows/${id}/executions`,
  EXECUTE_WORKFLOW: (id: string) => `/workflows/${id}/execute`,
  CANCEL_EXECUTION: (execId: string) => `/workflows/executions/${execId}/cancel`,
  STREAM_EXECUTION: (execId: string) => `/workflows/executions/${execId}/stream`,

  // Plugins
  PLUGINS: '/plugins',
  PLUGIN_BY_ID: (id: string) => `/plugins/${id}`,
  PLUGIN_STATUS: (id: string) => `/plugins/${id}/status`,
  PLUGIN_CREDENTIALS: (id: string) => `/plugins/${id}/credentials`,
  PLUGIN_EXECUTE: (id: string) => `/plugins/${id}/execute`,

  // Plugin OAuth
  PLUGIN_AUTH_CONNECT: (id: string) => `/plugins/${id}/auth/connect`,
  PLUGIN_AUTH_DISCONNECT: (id: string) => `/plugins/${id}/auth/disconnect`,

  // Events
  EVENTS_EMIT: '/events/emit',
} as const
