import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { usePluginCreatorExecutionStore } from '../pluginCreatorExecution.store.ts'

describe('plugin creator execution store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('patches node status and stores output per node', () => {
    const store = usePluginCreatorExecutionStore()

    store.patchNodeStatus('node_request', { status: 'running' })
    store.setNodeOutput('node_request', { ok: true })
    store.patchNodeStatus('node_request', { status: 'success' })

    assert.equal(store.nodeStatuses.node_request?.status, 'success')
    assert.deepEqual(store.nodeStatuses.node_request?.output, { ok: true })
  })

  it('derives edge status from source and target nodes', () => {
    const store = usePluginCreatorExecutionStore()

    assert.equal(store.getEdgeStatus('node_a', 'node_b'), 'idle')

    store.patchNodeStatus('node_a', { status: 'success' })
    assert.equal(store.getEdgeStatus('node_a', 'node_b'), 'success')

    store.patchNodeStatus('node_b', { status: 'running' })
    assert.equal(store.getEdgeStatus('node_a', 'node_b'), 'running')

    store.patchNodeStatus('node_b', { status: 'failed' })
    assert.equal(store.getEdgeStatus('node_a', 'node_b'), 'failed')
  })

  it('appends timeline events and clears execution state', () => {
    const store = usePluginCreatorExecutionStore()

    store.patchNodeStatus('node_request', { status: 'failed', error: 'boom' })
    store.appendTimeline({
      id: 'event_1',
      type: 'node:failed',
      nodeId: 'node_request',
      timestamp: '2026-05-20T00:00:00.000Z',
      status: 'failed',
      label: 'node_request failed',
      error: 'boom',
    })

    assert.equal(store.timeline.length, 1)

    store.clearExecution()

    assert.equal(store.nodeStatuses.node_request, undefined)
    assert.equal(store.timeline.length, 0)
  })
})
