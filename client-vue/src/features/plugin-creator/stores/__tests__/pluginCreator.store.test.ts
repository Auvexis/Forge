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
})
