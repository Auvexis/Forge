import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  deleteWorkflowSelection,
  duplicateWorkflowSelection,
} from '../workflowSelectionActions.ts'
import type { WorkflowItem } from '@/core/types/workflow.types'

function makeWorkflow(): WorkflowItem {
  return {
    metadata: {
      id: 'wf_1',
      name: 'Test Workflow',
      version: '1.0.0',
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: '2026-05-13T00:00:00.000Z',
    },
    trigger: { type: 'manual', ui: { positionX: 0, positionY: 0 } },
    nodes: {
      http_1: {
        type: 'http',
        name: 'HTTP',
        method: 'GET',
        url: 'https://example.com',
        ui: { positionX: 100, positionY: 120 },
      },
      code_1: {
        type: 'code',
        name: 'Code',
        language: 'javascript',
        script: 'return {}',
        ui: { positionX: 360, positionY: 120 },
      },
      set_1: {
        type: 'set',
        name: 'Set',
        assignments: [],
        ui: { positionX: 620, positionY: 120 },
      },
    },
    edges: [
      { id: 'e-trigger-http', source: 'trigger', target: 'http_1' },
      { id: 'e-http-code', source: 'http_1', target: 'code_1', sourceHandle: 'source', targetHandle: 'target' },
      { id: 'e-code-set', source: 'code_1', target: 'set_1' },
    ],
  }
}

describe('workflow selection actions', () => {
  it('duplicates selected nodes with unique ids, offset positions, and internal edges', () => {
    const workflow = makeWorkflow()

    const result = duplicateWorkflowSelection(workflow, ['trigger', 'http_1', 'code_1'])

    assert.deepEqual(result.nodeIds, ['http_1_copy', 'code_1_copy'])
    assert.equal(workflow.nodes.http_1_copy.name, 'HTTP Copy')
    assert.equal(workflow.nodes.http_1_copy.ui?.positionX, 140)
    assert.equal(workflow.nodes.http_1_copy.ui?.positionY, 160)
    assert.equal(workflow.nodes.code_1_copy.ui?.positionX, 400)
    assert.equal(workflow.nodes.code_1_copy.ui?.positionY, 160)
    assert.equal(
      workflow.edges.some((edge) => edge.source === 'http_1_copy' && edge.target === 'code_1_copy'),
      true,
    )
    assert.equal(
      workflow.edges.some((edge) => edge.source === 'trigger' && edge.target === 'http_1_copy'),
      false,
    )
  })

  it('deletes selected nodes except trigger and removes connected edges', () => {
    const workflow = makeWorkflow()

    const result = deleteWorkflowSelection(workflow, ['trigger', 'http_1', 'code_1'])

    assert.deepEqual(result.nodeIds, ['http_1', 'code_1'])
    assert.deepEqual(Object.keys(workflow.nodes), ['set_1'])
    assert.deepEqual(workflow.edges, [])
  })
})
