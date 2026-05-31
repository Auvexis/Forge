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
  PUBLISHED_PAGE: (slug: string) => `/p/${encodeURIComponent(slug)}`,
  PUBLISHED_PAGE_ACTION: (slug: string, actionId: string) =>
    `/p/${encodeURIComponent(slug)}/actions/${encodeURIComponent(actionId)}`,

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

  // Plugin Dynamic Options (for x-dynamic-options in manifests)
  PLUGIN_DYNAMIC_OPTIONS: (id: string, method: string) => `/plugins/${encodeURIComponent(id)}/dynamic-options/${encodeURIComponent(method)}`,

  // Plugin Creator
  PLUGIN_CREATOR_BLUEPRINTS: '/plugin-creator/blueprints',
  PLUGIN_CREATOR_BLUEPRINT: (id: string) => `/plugin-creator/blueprints/${encodeURIComponent(id)}`,
  PLUGIN_CREATOR_ICON_ASSET: (id: string, slot: string) =>
    `/plugin-creator/blueprints/${encodeURIComponent(id)}/assets/icons/${encodeURIComponent(slot)}`,
  PLUGIN_CREATOR_TEST_METHOD: (id: string) =>
    `/plugin-creator/blueprints/${encodeURIComponent(id)}/test-method`,
  PLUGIN_CREATOR_GENERATE_PREVIEW: (id: string) =>
    `/plugin-creator/blueprints/${encodeURIComponent(id)}/generate-preview`,
  PLUGIN_CREATOR_PREVIEW_CODE: '/plugin-creator/blueprints/preview-code',
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

  // Agent Runtime
  AGENT_CHAT_MESSAGES: (chatSlug: string) =>
    `/agent-chat/${encodeURIComponent(chatSlug)}/messages`,
  AGENT_CHAT_SESSION_MESSAGES: (sessionId: string) =>
    `/agent-chat/sessions/${encodeURIComponent(sessionId)}/messages`,
  AGENT_PANEL_AGENTS: '/agent-panel/agents',
  AGENT_PANEL_AGENT_SESSIONS: (agentKey: string) =>
    `/agent-panel/agents/${encodeURIComponent(agentKey)}/sessions`,
  AGENT_PANEL_AGENT_MESSAGES: (agentKey: string) =>
    `/agent-panel/agents/${encodeURIComponent(agentKey)}/messages`,
  AGENT_PANEL_SESSION_MESSAGES: (sessionId: string) =>
    `/agent-panel/sessions/${encodeURIComponent(sessionId)}/messages`,
  AGENT_PANEL_SESSION_MESSAGES_STREAM: (sessionId: string) =>
    `/agent-panel/sessions/${encodeURIComponent(sessionId)}/messages/stream`,
  AGENT_PANEL_SESSION: (sessionId: string) =>
    `/agent-panel/sessions/${encodeURIComponent(sessionId)}`,
  AGENT_TOOLS: '/agent-tools',
  AGENT_MEMORY: '/agent-memory',
  AGENT_MEMORY_BY_ID: (memoryId: string) => `/agent-memory/${encodeURIComponent(memoryId)}`,
  AGENT_APPROVAL_APPROVE: (approvalId: string) =>
    `/agent-approvals/${encodeURIComponent(approvalId)}/approve`,
  AGENT_APPROVAL_REJECT: (approvalId: string) =>
    `/agent-approvals/${encodeURIComponent(approvalId)}/reject`,
} as const
