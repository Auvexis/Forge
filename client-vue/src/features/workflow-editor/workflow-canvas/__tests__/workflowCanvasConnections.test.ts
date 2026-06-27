import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createWorkflowConnectionEdge,
  getWorkflowConnectionAction,
  getWorkflowConnectionPreviewPath,
  isWorkflowConnectionAllowed,
} from '../workflowCanvasConnections.ts'

describe('workflow canvas connection helpers', () => {
  it('creates workflow edges preserving source and target handles', () => {
    const edge = createWorkflowConnectionEdge({
      source: 'http_1',
      target: 'code_1',
      sourceHandle: 'done',
      targetHandle: 'input',
      now: 123,
    })

    assert.deepEqual(edge, {
      id: 'e-http_1-code_1-123',
      source: 'http_1',
      target: 'code_1',
      sourceHandle: 'done',
      targetHandle: 'input',
    })
  })

  it('blocks self connections and same-direction handles', () => {
    assert.equal(isWorkflowConnectionAllowed({
      sourceNodeId: 'a',
      targetNodeId: 'a',
      sourceHandleType: 'source',
      targetHandleType: 'target',
    }), false)

    assert.equal(isWorkflowConnectionAllowed({
      sourceNodeId: 'a',
      targetNodeId: 'b',
      sourceHandleType: 'source',
      targetHandleType: 'source',
    }), false)
  })

  it('allows source to target connections and normalizes reversed drag direction', () => {
    assert.equal(isWorkflowConnectionAllowed({
      sourceNodeId: 'a',
      targetNodeId: 'b',
      sourceHandleType: 'source',
      targetHandleType: 'target',
    }), true)

    assert.deepEqual(getWorkflowConnectionAction({
      start: { nodeId: 'target_1', handleId: 'target', type: 'target' },
      end: { nodeId: 'source_1', handleId: 'source', type: 'source' },
    }), {
      status: 'valid',
      source: 'source_1',
      target: 'target_1',
      sourceHandle: 'source',
      targetHandle: 'target',
    })
  })

  it('blocks occupied target handles unless the handle allows many connections', () => {
    const existingEdges = [{ id: 'e-1', source: 'a', target: 'agent_1', targetHandle: 'chatModel' }]

    assert.equal(isWorkflowConnectionAllowed({
      sourceNodeId: 'b',
      targetNodeId: 'agent_1',
      sourceHandleType: 'source',
      targetHandleType: 'target',
      targetHandle: { id: 'chatModel', cardinality: 'one' },
      existingEdges,
    }), false)

    assert.equal(isWorkflowConnectionAllowed({
      sourceNodeId: 'b',
      targetNodeId: 'agent_1',
      sourceHandleType: 'source',
      targetHandleType: 'target',
      targetHandle: { id: 'tool', cardinality: 'many', connectionPolicy: 'append' },
      existingEdges: [{ id: 'e-1', source: 'a', target: 'agent_1', targetHandle: 'tool' }],
    }), true)
  })

  it('creates a stable preview path between world coordinates', () => {
    assert.deepEqual(getWorkflowConnectionPreviewPath({
      source: { x: 10, y: 20 },
      target: { x: 110, y: 80 },
    }), {
      path: 'M 10 20 C 55 20, 65 80, 110 80',
      labelX: 60,
      labelY: 50,
      routing: 'smooth',
    })
  })
})
