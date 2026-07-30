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

  // Notifications
  NOTIFICATIONS: '/notifications',
  NOTIFICATIONS_SUMMARY: '/notifications/summary',
  NOTIFICATION_READ: (id: string) => `/notifications/${encodeURIComponent(id)}/read`,
  NOTIFICATIONS_READ_ALL: '/notifications/read-all',
  NOTIFICATION_BY_ID: (id: string) => `/notifications/${encodeURIComponent(id)}`,

  // Workflows
  WORKFLOWS: '/workflows',
  WORKFLOWS_CALLABLE: '/workflows/callable',
  WORKFLOW_BY_ID: (id: string) => `/workflows/${encodeURIComponent(id)}`,
  WORKFLOW_GIT_STATUS: (id: string) => `/workflows/${encodeURIComponent(id)}/git/status`,
  WORKFLOW_GIT_SNAPSHOTS: (id: string) => `/workflows/${encodeURIComponent(id)}/git/snapshots`,
  WORKFLOW_GIT_SNAPSHOT: (id: string, hash: string) =>
    `/workflows/${encodeURIComponent(id)}/git/snapshots/${encodeURIComponent(hash)}`,
  WORKFLOW_GIT_SNAPSHOT_RESTORE: (id: string, hash: string) =>
    `/workflows/${encodeURIComponent(id)}/git/snapshots/${encodeURIComponent(hash)}/restore`,
  WORKFLOW_GIT_COMMIT: (id: string) => `/workflows/${encodeURIComponent(id)}/git/commit`,
  WORKFLOW_SCHEMA: (id: string) => `/workflows/${encodeURIComponent(id)}/schema`,
  WORKFLOW_NODE_CATALOG: '/workflow-nodes/catalog',
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

  // Pages
  SITES: '/sites',
  SITE_BY_ID: (id: string) => `/sites/${encodeURIComponent(id)}`,
  SITE_PAGES: (siteId: string) => `/sites/${encodeURIComponent(siteId)}/pages`,
  SITE_PAGE_BY_ID: (siteId: string, pageId: string) =>
    `/sites/${encodeURIComponent(siteId)}/pages/${encodeURIComponent(pageId)}`,
  SITE_FILES: (siteId: string) => `/sites/${encodeURIComponent(siteId)}/files`,
  SITE_ASSETS: (siteId: string) => `/sites/${encodeURIComponent(siteId)}/assets`,
  SITE_ASSET: (siteId: string, assetPath: string) =>
    `/sites/${encodeURIComponent(siteId)}/assets/${assetPath.split('/').map(encodeURIComponent).join('/')}`,
  SITE_EXPORT: (siteId: string) => `/sites/${encodeURIComponent(siteId)}/export`,
  SITE_IMPORT: '/sites/import',
  PAGES: '/pages',
  PAGE_BY_ID: (id: string) => `/pages/${encodeURIComponent(id)}`,
  PAGE_PUBLISH: (id: string) => `/pages/${encodeURIComponent(id)}/publish`,
  PAGE_UNPUBLISH: (id: string) => `/pages/${encodeURIComponent(id)}/unpublish`,
  PAGE_PREVIEW: (id: string) => `/pages/${encodeURIComponent(id)}/preview`,
  PUBLISHED_PAGE: (projectPublicId: string, slug: string) => `/p/${encodeURIComponent(projectPublicId)}/${encodePublishedPath(slug)}`,
  PUBLISHED_PAGE_ACTION: (projectPublicId: string, slug: string, actionId: string) =>
    `/p/${encodeURIComponent(projectPublicId)}/actions/${encodeURIComponent(actionId)}/${encodePublishedPath(slug)}`,

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
  PLUGIN_AUTH_CONNECT_OPEN: (id: string) => `/plugins/${encodeURIComponent(id)}/auth/connect/open`,
  PLUGIN_AUTH_DISCONNECT: (id: string) => `/plugins/${encodeURIComponent(id)}/auth/disconnect`,

  // Auvexis Account
  AUVEXIS_ACCOUNT: '/auvexis/account',
  AUVEXIS_ACCOUNT_CONNECT_START: '/auvexis/account/connect/start',
  AUVEXIS_ACCOUNT_LOGOUT: '/auvexis/account/logout',
  AUVEXIS_ACCOUNT_REVOKE: '/auvexis/account/revoke',
  AUVEXIS_EVENTS: '/auvexis/events',

  // Plugin Dynamic Options (for x-dynamic-options in manifests)
  PLUGIN_DYNAMIC_OPTIONS: (id: string, method: string) => `/plugins/${encodeURIComponent(id)}/dynamic-options/${encodeURIComponent(method)}`,

  // Command Palette
  COMMAND_PALETTE_COMMANDS: '/command-palette/commands',
  COMMAND_PALETTE_SEARCH: '/command-palette/search',
  COMMAND_PALETTE_EXECUTE: (id: string) => `/command-palette/commands/${encodeURIComponent(id)}/execute`,

  // Events
  EVENTS_EMIT: '/events/emit',

  // Agent Runtime
  AGENT_CHAT_MESSAGES: (chatSlug: string) =>
    `/agent-chat/${encodeURIComponent(chatSlug)}/messages`,
  AGENT_CHAT_SESSION_MESSAGES: (sessionId: string) =>
    `/agent-chat/sessions/${encodeURIComponent(sessionId)}/messages`,
  AGENT_SESSION_SNAPSHOT: (sessionId: string) =>
    `/agent-sessions/${encodeURIComponent(sessionId)}/snapshot`,
  AGENT_TOOLS: '/agent-tools',
  AGENT_MEMORY: '/agent-memory',
  AGENT_MEMORY_BY_ID: (memoryId: string) => `/agent-memory/${encodeURIComponent(memoryId)}`,
  AGENT_APPROVAL_APPROVE: (approvalId: string) =>
    `/agent-approvals/${encodeURIComponent(approvalId)}/approve`,
  AGENT_APPROVAL_REJECT: (approvalId: string) =>
    `/agent-approvals/${encodeURIComponent(approvalId)}/reject`,
} as const

function encodePublishedPath(path: string) {
  return path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')
}
