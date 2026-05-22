import { ENDPOINTS } from './endpoints.ts'
import { pluginCreatorApi } from './plugin-creator.api.ts'
import type {
  CreatePluginBlueprintPayload,
  PluginBlueprint,
  PluginCreatorTestMethodPayload,
  RollbackPluginBlueprintPayload,
} from '../types/plugin-creator.types.ts'

async function contract(blueprint: PluginBlueprint) {
  const createPayload: CreatePluginBlueprintPayload = {
    handle: 'my-crm',
    name: 'My CRM',
    description: 'CRM API connector',
    includeDefaultMethod: true,
  }
  const testPayload: PluginCreatorTestMethodPayload = {
    methodId: 'method_get_lead',
    params: { leadId: 'lead_1' },
    credentials: { apiKey: 'secret' },
  }
  const rollbackPayload: RollbackPluginBlueprintPayload = {
    snapshotId: 'snap_1',
  }

  await pluginCreatorApi.listBlueprints()
  await pluginCreatorApi.createBlueprint(createPayload)
  await pluginCreatorApi.getBlueprint(blueprint.id)
  await pluginCreatorApi.updateBlueprint(blueprint.id, blueprint)
  await pluginCreatorApi.testMethod(blueprint.id, testPayload)
  await pluginCreatorApi.generatePreview(blueprint.id)
  await pluginCreatorApi.previewCode(blueprint)
  await pluginCreatorApi.publish(blueprint.id)
  await pluginCreatorApi.listVersions(blueprint.id)
  await pluginCreatorApi.rollback(blueprint.id, rollbackPayload)
  await pluginCreatorApi.exportZip(blueprint.id)

  return {
    blueprintsPath: ENDPOINTS.PLUGIN_CREATOR_BLUEPRINTS,
    detailPath: ENDPOINTS.PLUGIN_CREATOR_BLUEPRINT(blueprint.id),
    testPath: ENDPOINTS.PLUGIN_CREATOR_TEST_METHOD(blueprint.id),
    previewPath: ENDPOINTS.PLUGIN_CREATOR_GENERATE_PREVIEW(blueprint.id),
    previewCodePath: ENDPOINTS.PLUGIN_CREATOR_PREVIEW_CODE,
    publishPath: ENDPOINTS.PLUGIN_CREATOR_PUBLISH(blueprint.id),
    versionsPath: ENDPOINTS.PLUGIN_CREATOR_VERSIONS(blueprint.id),
    rollbackPath: ENDPOINTS.PLUGIN_CREATOR_ROLLBACK(blueprint.id),
    exportPath: ENDPOINTS.PLUGIN_CREATOR_EXPORT_ZIP(blueprint.id),
  }
}

void contract({
  id: 'bp_my_crm',
  metadata: {
    handle: 'my-crm',
    name: 'My CRM',
    version: '0.1.0',
    description: 'CRM API connector',
  },
  icons: {},
  auth: { type: 'none', fields: [] },
  methods: [],
  canvas: { nodes: {}, edges: [] },
  createdAt: '2026-05-20T00:00:00.000Z',
  updatedAt: '2026-05-20T00:00:00.000Z',
})
