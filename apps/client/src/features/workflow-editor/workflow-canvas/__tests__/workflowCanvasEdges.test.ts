import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  countWorkflowEdgeItems,
  getWorkflowEdgeStatus,
  makeWorkflowEdgePath,
} from '../workflowCanvasEdges.ts'

describe('workflow canvas edge helpers', () => {
  it('keeps inactive branches idle when source output picks another handle', () => {
    const status = getWorkflowEdgeStatus({
      source: 'if_1',
      target: 'code_1',
      sourceHandle: 'else',
      nodeStatuses: {
        if_1: { status: 'success', output: { branch: 'then' } },
      },
      workflowStatus: null,
    })

    assert.equal(status, 'idle')
  })

  it('propagates source success and target runtime status', () => {
    assert.equal(getWorkflowEdgeStatus({
      source: 'http_1',
      target: 'code_1',
      nodeStatuses: {
        http_1: { status: 'success' },
        code_1: { status: 'running' },
      },
      workflowStatus: null,
    }), 'running')

    assert.equal(getWorkflowEdgeStatus({
      source: 'http_1',
      target: 'code_1',
      nodeStatuses: {
        http_1: { status: 'success' },
      },
      workflowStatus: null,
    }), 'success')
  })

  it('counts array outputs and common item containers', () => {
    assert.equal(countWorkflowEdgeItems([1, 2, 3]), 3)
    assert.equal(countWorkflowEdgeItems({ items: ['a', 'b'] }), 2)
    assert.equal(countWorkflowEdgeItems({ data: ['a'] }), 1)
    assert.equal(countWorkflowEdgeItems({ value: 1 }), null)
  })

  it('creates a stable bezier path and midpoint from world coordinates', () => {
    assert.deepEqual(makeWorkflowEdgePath({ x: 0, y: 50 }, { x: 200, y: 100 }), {
      path: 'M 0 50 C 90 50, 110 100, 200 100',
      labelX: 100,
      labelY: 75,
      routing: 'smooth',
    })
  })

  it('uses a rounded pipe when forward handles have too little horizontal space', () => {
    const edge = makeWorkflowEdgePath({ x: 100, y: 80 }, { x: 160, y: 180 })

    assert.equal(edge.routing, 'pipe')
    assert.match(edge.path, /^M 100 80 L 122 80 Q /)
    assert.deepEqual({ x: edge.labelX, y: edge.labelY }, { x: 130, y: 130 })
  })

  it('routes backward edges outside both nodes with an orthogonal detour', () => {
    const edge = makeWorkflowEdgePath({ x: 300, y: 100 }, { x: 100, y: 120 })

    assert.equal(edge.routing, 'pipe')
    assert.match(edge.path, /340 100/)
    assert.match(edge.path, /60 120/)
    assert.equal(edge.labelX, 200)
    assert.equal(edge.labelY, 180)
  })
})
