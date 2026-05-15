// ─────────────────────────────────────────────────────────────
//  Plugins API
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './client'
import { ENDPOINTS } from './endpoints'
import type {
  ExternalPluginInstallResult,
  ExternalPluginInstallScope,
  ExternalPluginPreview,
  PluginSummary,
  PluginStatusResponse,
} from '../types/plugin.types'

export const pluginsApi = {
  /** Get all plugins and their statuses */
  getAll: () => apiRequest<PluginSummary[]>(ENDPOINTS.PLUGINS),

  /** Get a single plugin's details */
  getById: (id: string) => apiRequest<PluginSummary>(ENDPOINTS.PLUGIN_BY_ID(id)),

  /** Get live status/credentials for a plugin */
  getStatus: (id: string) => apiRequest<PluginStatusResponse>(ENDPOINTS.PLUGIN_STATUS(id)),

  /** Save credentials for a plugin (e.g. API keys or OAuth secrets) */
  saveCredentials: (id: string, credentials: Record<string, string>) =>
    apiRequest<any>(ENDPOINTS.PLUGIN_CREDENTIALS(id), {
      method: 'POST',
      body: credentials,
    }),

  /** Execute a specific plugin method remotely */
  executeMethod: (id: string, method: string, params: Record<string, unknown> = {}) =>
    apiRequest<any>(ENDPOINTS.PLUGIN_EXECUTE(id), {
      method: 'POST',
      body: { method, params },
    }),

  /**
   * Fetch dynamic options for a field declared with `x-dynamic-options` in the manifest.
   * Uses a dedicated GET endpoint that runs the method with no user-supplied params.
   * Returns a flat array guaranteed to be usable by select components.
   */
  getDynamicOptions: (pluginId: string, method: string) =>
    apiRequest<any[]>(ENDPOINTS.PLUGIN_DYNAMIC_OPTIONS(pluginId, method)),

  previewExternalUrl: (repositoryUrl: string) =>
    apiRequest<ExternalPluginPreview>(ENDPOINTS.PLUGIN_EXTERNAL_PREVIEW_URL, {
      method: 'POST',
      body: { repositoryUrl },
    }),

  previewExternalFolder: (folderPath: string, files?: string[]) =>
    apiRequest<ExternalPluginPreview>(ENDPOINTS.PLUGIN_EXTERNAL_PREVIEW_FOLDER, {
      method: 'POST',
      body: { folderPath, files },
    }),

  installExternal: (previewId: string, scope: ExternalPluginInstallScope) =>
    apiRequest<ExternalPluginInstallResult>(ENDPOINTS.PLUGIN_EXTERNAL_INSTALL, {
      method: 'POST',
      body: { previewId, scope },
    }),

  cancelExternalPreview: (previewId: string) =>
    apiRequest<null>(ENDPOINTS.PLUGIN_EXTERNAL_PREVIEW(previewId), {
      method: 'DELETE',
    }),

  // ── OAuth specific endpoints ─────────────────────────

  /** Generate an OAuth connection URL for a plugin */
  getAuthUrl: (id: string) =>
    apiRequest<{ url: string }>(ENDPOINTS.PLUGIN_AUTH_CONNECT(id), {
      method: 'POST',
    }),

  /** Disconnect an OAuth plugin */
  disconnectAuth: (id: string) =>
    apiRequest<null>(ENDPOINTS.PLUGIN_AUTH_DISCONNECT(id), {
      method: 'POST',
    }),
}
