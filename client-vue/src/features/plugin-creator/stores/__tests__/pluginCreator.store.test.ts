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
})
