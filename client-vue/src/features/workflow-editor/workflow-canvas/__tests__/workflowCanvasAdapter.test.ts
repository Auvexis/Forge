import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { workflowToBaseCanvasItems } from '../workflowCanvasAdapter.ts'

describe('workflow canvas adapter', () => {
  it('maps workflow nodes to BaseCanvas items with stable ids and positions', () => {
    const workflow = {
      nodes: {
        http_1: { type: 'http', ui: { positionX: 120, positionY: 180 } },
        code_1: { type: 'code', ui: { positionX: 360, positionY: 180 } },
      },
      trigger: { type: 'manual', ui: { positionX: 0, positionY: 40 } },
      edges: [],
    }

    assert.deepEqual(workflowToBaseCanvasItems(workflow), [
      { id: 'http_1', x: 120, y: 180, data: workflow.nodes.http_1 },
      { id: 'code_1', x: 360, y: 180, data: workflow.nodes.code_1 },
    ])
  })

  it('can include the legacy trigger node when requested', () => {
    const workflow = {
      nodes: {},
      trigger: { type: 'manual', ui: { positionX: 24, positionY: 48 } },
      edges: [],
    }

    assert.deepEqual(workflowToBaseCanvasItems(workflow, { includeLegacyTrigger: true }), [
      { id: 'trigger', x: 24, y: 48, data: workflow.trigger },
    ])
  })

  it('falls back to origin when node ui position is missing', () => {
    const workflow = {
      nodes: {
        set_1: { type: 'set' },
      },
      trigger: { type: 'manual' },
      edges: [],
    }

    assert.deepEqual(workflowToBaseCanvasItems(workflow), [
      { id: 'set_1', x: 0, y: 0, data: workflow.nodes.set_1 },
    ])
  })

  it('preserves saved node dimensions for reopened workflows and fit view', () => {
    const workflow = {
      nodes: {
        agent_1: { type: 'ai-agent', ui: { positionX: 80, positionY: 120, width: 320, height: 180 } },
      },
      trigger: { type: 'manual', ui: { positionX: 0, positionY: 0, width: 180, height: 80 } },
      edges: [],
    }

    assert.deepEqual(workflowToBaseCanvasItems(workflow, { includeLegacyTrigger: true }), [
      { id: 'trigger', x: 0, y: 0, width: 180, height: 80, data: workflow.trigger },
      { id: 'agent_1', x: 80, y: 120, width: 320, height: 180, data: workflow.nodes.agent_1 },
    ])
  })
})
