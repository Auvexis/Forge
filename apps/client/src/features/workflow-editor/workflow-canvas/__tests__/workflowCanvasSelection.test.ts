import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  normalizeWorkflowSelection,
  selectAllWorkflowNodeIds,
} from '../workflowCanvasSelection.ts'

describe('workflow canvas selection helpers', () => {
  it('selects trigger and all workflow nodes in stable canvas order', () => {
    assert.deepEqual(selectAllWorkflowNodeIds({
      includeTrigger: true,
      nodeIds: ['code_1', 'http_1'],
    }), ['trigger', 'code_1', 'http_1'])
  })

  it('filters selection to existing nodes and removes duplicates', () => {
    assert.deepEqual(normalizeWorkflowSelection({
      selection: ['http_1', 'missing', 'http_1', 'trigger'],
      includeTrigger: true,
      nodeIds: ['http_1'],
    }), ['http_1', 'trigger'])
  })
})
