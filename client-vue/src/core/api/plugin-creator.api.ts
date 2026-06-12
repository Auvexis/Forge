import { API_BASE_URL } from '../constants/app.ts'
import { ApiError } from '../types/api.types.ts'
import type {
  CreatePluginBlueprintPayload,
  PluginBlueprint,
  PluginBlueprintIconSlot,
  PluginCreatorGeneratePreviewResult,
  PluginCreatorRelease,
  PluginCreatorTestMethodPayload,
  PluginCreatorTestResult,
  PluginCreatorVersionsResult,
  RollbackPluginBlueprintPayload,
} from '../types/plugin-creator.types.ts'
import { apiRequest } from './client.ts'
import { ENDPOINTS } from './endpoints.ts'

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

async function downloadZip(path: string): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(buildUrl(path))
  } catch (error) {
    throw new ApiError(
      'Network request failed',
      0,
      error instanceof Error ? error.message : String(error),
    )
  }

  if (!response.ok) {
    throw new ApiError(`HTTP Error ${response.status}: ${response.statusText}`, response.status)
  }

  return response.blob()
}

export const pluginCreatorApi = {
  listBlueprints: () =>
    apiRequest<PluginBlueprint[]>(ENDPOINTS.PLUGIN_CREATOR_BLUEPRINTS),

  createBlueprint: (payload: CreatePluginBlueprintPayload) =>
    apiRequest<PluginBlueprint>(ENDPOINTS.PLUGIN_CREATOR_BLUEPRINTS, {
      method: 'POST',
      body: payload,
    }),

  getBlueprint: (id: string) =>
    apiRequest<PluginBlueprint>(ENDPOINTS.PLUGIN_CREATOR_BLUEPRINT(id)),

  updateBlueprint: (id: string, blueprint: PluginBlueprint) =>
    apiRequest<PluginBlueprint>(ENDPOINTS.PLUGIN_CREATOR_BLUEPRINT(id), {
      method: 'PUT',
      body: blueprint,
    }),

  uploadIcon: (id: string, slot: PluginBlueprintIconSlot, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiRequest<PluginBlueprint>(ENDPOINTS.PLUGIN_CREATOR_ICON_ASSET(id, slot), {
      method: 'POST',
      body: formData,
    })
  },

  testMethod: (id: string, payload: PluginCreatorTestMethodPayload) =>
    apiRequest<PluginCreatorTestResult>(ENDPOINTS.PLUGIN_CREATOR_TEST_METHOD(id), {
      method: 'POST',
      body: payload,
    }),

  generatePreview: (id: string) =>
    apiRequest<PluginCreatorGeneratePreviewResult>(
      ENDPOINTS.PLUGIN_CREATOR_GENERATE_PREVIEW(id),
      { method: 'POST' },
    ),

  previewCode: (blueprint: PluginBlueprint) =>
    apiRequest<PluginCreatorGeneratePreviewResult>(ENDPOINTS.PLUGIN_CREATOR_PREVIEW_CODE, {
      method: 'POST',
      body: { blueprint },
    }),

  publish: (id: string) =>
    apiRequest<PluginCreatorRelease>(ENDPOINTS.PLUGIN_CREATOR_PUBLISH(id), {
      method: 'POST',
    }),

  listVersions: (id: string) =>
    apiRequest<PluginCreatorVersionsResult>(ENDPOINTS.PLUGIN_CREATOR_VERSIONS(id)),

  rollback: (id: string, payload: RollbackPluginBlueprintPayload) =>
    apiRequest<PluginBlueprint>(ENDPOINTS.PLUGIN_CREATOR_ROLLBACK(id), {
      method: 'POST',
      body: payload,
    }),

  exportZip: (id: string) => downloadZip(ENDPOINTS.PLUGIN_CREATOR_EXPORT_ZIP(id)),
}
