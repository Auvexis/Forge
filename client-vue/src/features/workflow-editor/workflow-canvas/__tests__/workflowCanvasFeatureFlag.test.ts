import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { shouldUseWorkflowBaseCanvas } from '../workflowCanvasFeatureFlag.ts'

describe('workflow canvas feature flag', () => {
  it('enables the BaseCanvas workflow shell only for explicit true-like values', () => {
    assert.equal(shouldUseWorkflowBaseCanvas({ VITE_WORKFLOW_BASE_CANVAS: 'true' }), true)
    assert.equal(shouldUseWorkflowBaseCanvas({ VITE_WORKFLOW_BASE_CANVAS: '1' }), true)
    assert.equal(shouldUseWorkflowBaseCanvas({ VITE_WORKFLOW_BASE_CANVAS: 'yes' }), true)
  })

  it('keeps Vue Flow as the default workflow canvas', () => {
    assert.equal(shouldUseWorkflowBaseCanvas({}), false)
    assert.equal(shouldUseWorkflowBaseCanvas({ VITE_WORKFLOW_BASE_CANVAS: 'false' }), false)
  })
})
