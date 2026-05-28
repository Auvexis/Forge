import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import type { PluginCreatorApiClient } from '../pluginCreator.store.ts'
import { usePluginCreatorStore } from '../pluginCreator.store.ts'
import type { PluginBlueprint } from '../../../../core/types/plugin-creator.types.ts'

function createBlueprint(name = 'My CRM'): PluginBlueprint {
  return {
    id: 'bp_my_crm',
    metadata: {
      handle: 'my-crm',
      name,
      version: '0.1.0',
      description: 'CRM API connector',
    },
    icons: {},
    auth: { type: 'none', fields: [] },
    methods: [],
    canvas: { nodes: {}, edges: [] },
    createdAt: '2026-05-20T00:00:00.000Z',
    updatedAt: '2026-05-20T00:00:00.000Z',
  }
}

function createApi(): PluginCreatorApiClient {
  let blueprint = createBlueprint()
  return {
    listBlueprints: async () => [blueprint],
    createBlueprint: async () => blueprint,
    getBlueprint: async () => blueprint,
    updateBlueprint: async (_id, next) => {
      blueprint = next
      return next
    },
    uploadIcon: async (_id, slot, _file) => {
      blueprint = {
        ...blueprint,
        icons: { ...blueprint.icons, [slot]: `assets/icons/${slot}.svg` },
      }
      return blueprint
    },
    testMethod: async () => ({
      methodId: 'method_1',
      request: { method: 'GET', url: 'https://api.example.com', headers: {}, query: {} },
      status: 200,
      headers: {},
      body: { ok: true },
      durationMs: 10,
      error: null,
      timestamp: '2026-05-20T00:00:00.000Z',
    }),
    generatePreview: async () => ({ files: [] }),
    publish: async () => ({
      id: 'rel_1',
      blueprintId: 'bp_my_crm',
      version: '0.1.0',
      createdAt: '2026-05-20T00:00:00.000Z',
      releaseDir: '/tmp/release',
      snapshotId: 'snap_1',
    }),
    listVersions: async () => ({ snapshots: [], releases: [] }),
    rollback: async () => blueprint,
    exportZip: async () => new Blob(),
  }
}

describe('plugin creator store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads and saves a blueprint', async () => {
    const store = usePluginCreatorStore()
    store.setApiClient(createApi())

    await store.loadBlueprint('bp_my_crm')
    assert.equal(store.activeBlueprint?.metadata.name, 'My CRM')

    store.updateMetadata({ name: 'Updated CRM' })
    assert.equal(store.isDirty, true)

    await store.saveDraft()
    assert.equal(store.activeBlueprint?.metadata.name, 'Updated CRM')
    assert.equal(store.isDirty, false)
  })

  it('keeps a local unsaved draft and creates the backend blueprint on first save', async () => {
    const store = usePluginCreatorStore()
    let createdPayloadName = ''
    let updatedId = ''
    store.setApiClient({
      ...createApi(),
      listBlueprints: async () => [],
      createBlueprint: async (payload) => {
        createdPayloadName = payload.name
        return {
          ...createBlueprint(payload.name),
          id: 'bp_first_plugin',
          metadata: {
            ...createBlueprint(payload.name).metadata,
            handle: payload.handle,
            name: payload.name,
            description: payload.description,
          },
        }
      },
      updateBlueprint: async (id, next) => {
        updatedId = id
        return next
      },
    })

    store.createLocalDraft()
    store.addNode({
      id: 'method_local',
      type: 'method',
      position: { x: 100, y: 120 },
      data: { name: 'List Leads', methodId: 'method_local' },
    })

    assert.equal(store.isNewBlueprint, true)
    assert.equal(store.blueprints.length, 0)

    const saved = await store.saveNewBlueprint({
      handle: 'first-plugin',
      name: 'First Plugin',
      description: 'Created on first save',
      includeDefaultMethod: false,
    })

    assert.equal(createdPayloadName, 'First Plugin')
    assert.equal(updatedId, 'bp_first_plugin')
    assert.equal(saved?.canvas.nodes.method_local?.id, 'method_local')
    assert.equal(store.isNewBlueprint, false)
    assert.equal(store.isDirty, false)
    assert.equal(store.blueprints[0]?.id, 'bp_first_plugin')
  })

  it('adds and edits nodes with undo and redo', () => {
    const store = usePluginCreatorStore()
    store.setActiveBlueprint(createBlueprint())

    store.addNode({
      id: 'node_method',
      type: 'method',
      position: { x: 100, y: 120 },
      data: { name: 'Create Lead' },
    })
    store.updateNode('node_method', { data: { name: 'Get Lead' } })

    assert.equal(store.activeBlueprint?.canvas.nodes.node_method?.data.name, 'Get Lead')
    assert.equal(store.canUndo, true)

    store.undo()
    assert.equal(store.activeBlueprint?.canvas.nodes.node_method?.data.name, 'Create Lead')

    store.redo()
    assert.equal(store.activeBlueprint?.canvas.nodes.node_method?.data.name, 'Get Lead')
  })

  it('removes nodes and related edges from the canvas', () => {
    const store = usePluginCreatorStore()
    const blueprint = createBlueprint()
    blueprint.canvas.nodes = {
      node_method: {
        id: 'node_method',
        type: 'method',
        position: { x: 100, y: 120 },
        data: {},
      },
      node_request: {
        id: 'node_request',
        type: 'request',
        position: { x: 320, y: 120 },
        data: {},
      },
    }
    blueprint.canvas.edges = [{ id: 'edge_1', source: 'node_method', target: 'node_request' }]
    store.setActiveBlueprint(blueprint)

    store.removeNodes(['node_request'])

    assert.equal(store.activeBlueprint?.canvas.nodes.node_request, undefined)
    assert.equal(store.activeBlueprint?.canvas.edges.length, 0)
    assert.equal(store.canUndo, true)
  })

  it('adds and removes canvas edges', () => {
    const store = usePluginCreatorStore()
    store.setActiveBlueprint(createBlueprint())

    store.addEdge({ id: 'edge_1', source: 'node_a', target: 'node_b' })
    assert.equal(store.activeBlueprint?.canvas.edges[0]?.id, 'edge_1')

    store.removeEdges(['edge_1'])
    assert.equal(store.activeBlueprint?.canvas.edges.length, 0)
  })

  it('edits method, input, credential and request details', () => {
    const store = usePluginCreatorStore()
    const blueprint = createBlueprint()
    blueprint.auth.fields = [
      {
        name: 'apiKey',
        label: 'API Key',
        target: 'header',
        headerName: 'Authorization',
      },
    ]
    blueprint.methods = [
      {
        id: 'method_1',
        handle: 'listLeads',
        name: 'List Leads',
        description: 'List CRM leads',
        inputs: [{ name: 'limit', type: 'number', required: false }],
        request: {
          method: 'GET',
          url: 'https://api.example.com/leads',
          headers: [{ name: 'Accept', value: 'application/json' }],
          query: [{ name: 'limit', value: '{{ params.limit }}' }],
          body: { type: 'none' },
        },
        responseMapping: [],
        errorMapping: [],
      },
    ]
    store.setActiveBlueprint(blueprint)

    store.updateMethod('method_1', { name: 'Search Leads', handle: 'searchLeads' })
    store.updateMethodInput('method_1', 'limit', { name: 'pageSize', required: true })
    store.updateCredentialField('apiKey', { label: 'Bearer token', headerName: 'X-API-Key' })
    store.updateMethodRequest('method_1', {
      method: 'POST',
      url: 'https://api.example.com/search',
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      query: [{ name: 'q', value: '{{ params.query }}' }],
      body: { type: 'json', value: { q: '{{ params.query }}' } },
    })

    const method = store.activeBlueprint?.methods[0]
    assert.equal(method?.name, 'Search Leads')
    assert.equal(method?.handle, 'searchLeads')
    assert.equal(method?.inputs[0]?.name, 'pageSize')
    assert.equal(method?.inputs[0]?.required, true)
    assert.equal(store.activeBlueprint?.auth.fields[0]?.label, 'Bearer token')
    assert.equal(store.activeBlueprint?.auth.fields[0]?.headerName, 'X-API-Key')
    assert.equal(method?.request.method, 'POST')
    assert.equal(method?.request.url, 'https://api.example.com/search')
    assert.deepEqual(method?.request.body, { type: 'json', value: { q: '{{ params.query }}' } })
  })

  it('runs a method test and stores the last result', async () => {
    const store = usePluginCreatorStore()
    store.setApiClient(createApi())
    store.setActiveBlueprint(createBlueprint())

    const result = await store.runMethodTest({
      methodId: 'method_1',
      params: { limit: 10 },
      credentials: { apiKey: 'secret' },
    })

    assert.equal(result?.status, 200)
    assert.equal(store.lastTestResult?.methodId, 'method_1')
    assert.equal(store.lastTestResult?.request.url, 'https://api.example.com')
  })

  it('uploads an icon and updates the active blueprint without marking it dirty', async () => {
    const store = usePluginCreatorStore()
    store.setApiClient(createApi())
    store.setActiveBlueprint(createBlueprint())

    const result = await store.uploadIcon('iconLight', new File(['svg'], 'icon.svg'))

    assert.equal(result?.icons.iconLight, 'assets/icons/iconLight.svg')
    assert.equal(store.activeBlueprint?.icons.iconLight, 'assets/icons/iconLight.svg')
    assert.equal(store.isDirty, false)
  })

  it('maps selected response fields as output and creates error rules', () => {
    const store = usePluginCreatorStore()
    const blueprint = createBlueprint()
    blueprint.methods = [
      {
        id: 'method_1',
        handle: 'listLeads',
        name: 'List Leads',
        description: 'List CRM leads',
        inputs: [],
        request: {
          method: 'GET',
          url: 'https://api.example.com/leads',
          headers: [],
          query: [],
          body: { type: 'none' },
        },
        responseMapping: [],
        errorMapping: [],
      },
    ]
    store.setActiveBlueprint(blueprint)

    store.mapSelectedFieldAsOutput('method_1', {
      outputName: 'leadId',
      path: 'body.data.id',
      type: 'string',
    })
    store.createErrorRuleFromResponse('method_1', {
      status: 401,
      code: 'UNAUTHORIZED',
      messagePath: 'body.error.message',
    })

    const method = store.activeBlueprint?.methods[0]
    assert.equal(method?.responseMapping[0]?.outputName, 'leadId')
    assert.equal(method?.responseMapping[0]?.path, 'body.data.id')
    assert.equal(method?.errorMapping[0]?.code, 'UNAUTHORIZED')
    assert.equal(method?.errorMapping[0]?.condition.value, 401)
  })

  it('loads versions and rolls back to a snapshot', async () => {
    const store = usePluginCreatorStore()
    store.setApiClient({
      ...createApi(),
      listVersions: async () => ({
        snapshots: [
          {
            id: 'snap_1',
            blueprintId: 'bp_my_crm',
            createdAt: '2026-05-20T00:00:00.000Z',
            reason: 'manual-save',
            version: '0.1.0',
            blueprint: createBlueprint('Snapshot CRM'),
          },
        ],
        releases: [
          {
            id: 'rel_1',
            blueprintId: 'bp_my_crm',
            version: '0.1.0',
            createdAt: '2026-05-20T01:00:00.000Z',
            releaseDir: '/tmp/release',
            snapshotId: 'snap_1',
          },
        ],
      }),
      rollback: async () => createBlueprint('Snapshot CRM'),
    })
    store.setActiveBlueprint(createBlueprint())

    const versions = await store.loadVersions()
    const rolledBack = await store.rollbackToSnapshot('snap_1')

    assert.equal(versions?.snapshots[0]?.id, 'snap_1')
    assert.equal(store.versions?.releases[0]?.id, 'rel_1')
    assert.equal(rolledBack?.metadata.name, 'Snapshot CRM')
    assert.equal(store.activeBlueprint?.metadata.name, 'Snapshot CRM')
  })

  it('exports the active blueprint zip through the api client', async () => {
    const store = usePluginCreatorStore()
    let exportedId = ''
    const blob = new Blob(['zip'])
    store.setApiClient({
      ...createApi(),
      exportZip: async (id) => {
        exportedId = id
        return blob
      },
    })
    store.setActiveBlueprint(createBlueprint())

    const result = await store.exportZip()

    assert.equal(exportedId, 'bp_my_crm')
    assert.equal(result, blob)
  })
})
