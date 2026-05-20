// ─────────────────────────────────────────────────────────────
//  API Endpoint Constants
// ─────────────────────────────────────────────────────────────

export const ENDPOINTS = {
  // App
  APP_INFO: '/app/info',

  // Profiles
  PROFILES: '/profiles',
  PROFILES_CURRENT: '/profiles/current',
  PROFILE_BY_ID: (id: string) => `/profiles/${encodeURIComponent(id)}`,
  PROFILE_PASSWORD: (id: string) => `/profiles/${encodeURIComponent(id)}/password`,
  PROFILE_VERIFY_PASSWORD: (id: string) => `/profiles/${encodeURIComponent(id)}/verify-password`,
  PROFILE_SWITCH: (id: string) => `/profiles/${encodeURIComponent(id)}/switch`,

  // Workflows
  WORKFLOWS: '/workflows',
  WORKFLOW_BY_ID: (id: string) => `/workflows/${encodeURIComponent(id)}`,
  WORKFLOW_SCHEMA: (id: string) => `/workflows/${encodeURIComponent(id)}/schema`,
  WORKFLOW_PUBLISH: (id: string) => `/workflows/${encodeURIComponent(id)}/publish`,
  WORKFLOW_UNPUBLISH: (id: string) => `/workflows/${encodeURIComponent(id)}/unpublish`,
  WORKFLOW_PRODUCTION_STATUS: '/workflows/production-status',
  WORKFLOW_GLOBAL_PRODUCTION_STATUS: '/workflows/production-status/global',

  // Executions
  EXECUTIONS_BY_WORKFLOW: (id: string) => `/workflows/${encodeURIComponent(id)}/executions`,
  PROFILE_WORKFLOW_EXECUTIONS: (profileId: string, id: string) =>
    `/p/${encodeURIComponent(profileId)}/workflows/${encodeURIComponent(id)}/executions`,
  EXECUTE_WORKFLOW: (id: string) => `/workflows/${encodeURIComponent(id)}/execute`,
  CANCEL_EXECUTION: (execId: string) => `/workflows/executions/${encodeURIComponent(execId)}/cancel`,
  STREAM_EXECUTION: (execId: string) => `/workflows/executions/${encodeURIComponent(execId)}/stream`,
  CREATE_DEV_SESSION: (id: string) => `/workflows/${encodeURIComponent(id)}/dev-sessions`,
  STOP_DEV_SESSION: (sessionId: string) => `/workflows/dev-sessions/${encodeURIComponent(sessionId)}/stop`,
  STREAM_DEV_SESSION: (sessionId: string) => `/workflows/dev-sessions/${encodeURIComponent(sessionId)}/stream`,
  EXECUTE_DEV_SESSION_TRIGGER: (sessionId: string, triggerNodeId: string) =>
    `/workflows/dev-sessions/${encodeURIComponent(sessionId)}/triggers/${encodeURIComponent(triggerNodeId)}/execute`,

  // Trigger
  TRIGGER_LISTEN: (id: string) => `/workflows/${encodeURIComponent(id)}/trigger/listen`,
  TRIGGER_LAST_PAYLOAD: (id: string) => `/workflows/${encodeURIComponent(id)}/trigger/last-payload`,

  // Forms
  FORM_DEFINITION: (id: string) => `/forms-api/${encodeURIComponent(id)}`,
  PROFILE_FORM_DEFINITION: (profileId: string, id: string) =>
    `/p/${encodeURIComponent(profileId)}/forms-api/${encodeURIComponent(id)}`,
  FORM_SUBMIT: (id: string) => `/forms-api/${encodeURIComponent(id)}/submit`,
  PROFILE_FORM_SUBMIT: (profileId: string, id: string) =>
    `/p/${encodeURIComponent(profileId)}/forms-api/${encodeURIComponent(id)}/submit`,
  TEMPORARY_FORM_DEFINITION: (id: string) => `/temporary-forms-api/${encodeURIComponent(id)}`,
  TEMPORARY_FORM_SUBMIT: (id: string) => `/temporary-forms-api/${encodeURIComponent(id)}/submit`,

  // Plugins
  PLUGINS: '/plugins',
  PLUGIN_BY_ID: (id: string) => `/plugins/${encodeURIComponent(id)}`,
  PLUGIN_STATUS: (id: string) => `/plugins/${encodeURIComponent(id)}/status`,
  PLUGIN_CREDENTIALS: (id: string) => `/plugins/${encodeURIComponent(id)}/credentials`,
  PLUGIN_EXECUTE: (id: string) => `/plugins/${encodeURIComponent(id)}/execute`,
  PLUGIN_EXTERNAL_PREVIEW_URL: '/plugins/external/preview-url',
  PLUGIN_EXTERNAL_PREVIEW_FOLDER: '/plugins/external/preview-folder',
  PLUGIN_EXTERNAL_PREVIEW_UPLOAD: '/plugins/external/preview-upload',
  PLUGIN_EXTERNAL_INSTALL: '/plugins/external/install',
  PLUGIN_EXTERNAL_PREVIEW: (id: string) => `/plugins/external/previews/${encodeURIComponent(id)}`,

  // Plugin OAuth
  PLUGIN_AUTH_CONNECT: (id: string) => `/plugins/${encodeURIComponent(id)}/auth/connect`,
  PLUGIN_AUTH_DISCONNECT: (id: string) => `/plugins/${encodeURIComponent(id)}/auth/disconnect`,

  // Plugin Dynamic Options (for x-dynamic-options in manifests)
  PLUGIN_DYNAMIC_OPTIONS: (id: string, method: string) => `/plugins/${encodeURIComponent(id)}/dynamic-options/${encodeURIComponent(method)}`,

  // Plugin Creator
  PLUGIN_CREATOR_BLUEPRINTS: '/plugin-creator/blueprints',
  PLUGIN_CREATOR_BLUEPRINT: (id: string) => `/plugin-creator/blueprints/${encodeURIComponent(id)}`,
  PLUGIN_CREATOR_TEST_METHOD: (id: string) =>
    `/plugin-creator/blueprints/${encodeURIComponent(id)}/test-method`,
  PLUGIN_CREATOR_GENERATE_PREVIEW: (id: string) =>
    `/plugin-creator/blueprints/${encodeURIComponent(id)}/generate-preview`,
  PLUGIN_CREATOR_PUBLISH: (id: string) =>
    `/plugin-creator/blueprints/${encodeURIComponent(id)}/publish`,
  PLUGIN_CREATOR_VERSIONS: (id: string) =>
    `/plugin-creator/blueprints/${encodeURIComponent(id)}/versions`,
  PLUGIN_CREATOR_ROLLBACK: (id: string) =>
    `/plugin-creator/blueprints/${encodeURIComponent(id)}/rollback`,
  PLUGIN_CREATOR_EXPORT_ZIP: (id: string) =>
    `/plugin-creator/blueprints/${encodeURIComponent(id)}/export.zip`,

  // Command Palette
  COMMAND_PALETTE_COMMANDS: '/command-palette/commands',
  COMMAND_PALETTE_SEARCH: '/command-palette/search',
  COMMAND_PALETTE_EXECUTE: (id: string) => `/command-palette/commands/${encodeURIComponent(id)}/execute`,

  // Events
  EVENTS_EMIT: '/events/emit',
} as const
