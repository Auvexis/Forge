// ─────────────────────────────────────────────────────────────
//  API Endpoint Constants
// ─────────────────────────────────────────────────────────────

export const ENDPOINTS = {
  // App
  APP_INFO: '/app/info',

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
  CREATE_DEV_SESSION: (id: string) => `/workflows/${id}/dev-sessions`,
  STOP_DEV_SESSION: (sessionId: string) => `/workflows/dev-sessions/${sessionId}/stop`,
  STREAM_DEV_SESSION: (sessionId: string) => `/workflows/dev-sessions/${sessionId}/stream`,
  EXECUTE_DEV_SESSION_TRIGGER: (sessionId: string, triggerNodeId: string) =>
    `/workflows/dev-sessions/${sessionId}/triggers/${triggerNodeId}/execute`,

  // Trigger
  TRIGGER_LISTEN: (id: string) => `/workflows/${id}/trigger/listen`,
  TRIGGER_LAST_PAYLOAD: (id: string) => `/workflows/${id}/trigger/last-payload`,

  // Forms
  FORM_DEFINITION: (id: string) => `/forms-api/${id}`,
  FORM_SUBMIT: (id: string) => `/forms-api/${id}/submit`,
  TEMPORARY_FORM_DEFINITION: (id: string) => `/temporary-forms-api/${id}`,
  TEMPORARY_FORM_SUBMIT: (id: string) => `/temporary-forms-api/${id}/submit`,

  // Plugins
  PLUGINS: '/plugins',
  PLUGIN_BY_ID: (id: string) => `/plugins/${id}`,
  PLUGIN_STATUS: (id: string) => `/plugins/${id}/status`,
  PLUGIN_CREDENTIALS: (id: string) => `/plugins/${id}/credentials`,
  PLUGIN_EXECUTE: (id: string) => `/plugins/${id}/execute`,

  // Plugin OAuth
  PLUGIN_AUTH_CONNECT: (id: string) => `/plugins/${id}/auth/connect`,
  PLUGIN_AUTH_DISCONNECT: (id: string) => `/plugins/${id}/auth/disconnect`,

  // Plugin Dynamic Options (for x-dynamic-options in manifests)
  PLUGIN_DYNAMIC_OPTIONS: (id: string, method: string) => `/plugins/${id}/dynamic-options/${method}`,

  // Command Palette
  COMMAND_PALETTE_COMMANDS: '/command-palette/commands',
  COMMAND_PALETTE_SEARCH: '/command-palette/search',
  COMMAND_PALETTE_EXECUTE: (id: string) => `/command-palette/commands/${id}/execute`,

  // Events
  EVENTS_EMIT: '/events/emit',
} as const
