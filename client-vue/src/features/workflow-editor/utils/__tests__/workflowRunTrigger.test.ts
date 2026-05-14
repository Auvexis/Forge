import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { selectToolbarRunTrigger, shouldRenderLegacyTriggerNode } from '../workflowRunTrigger.ts'
import type { WorkflowItem } from '@/core/types/workflow.types'

function makeWorkflow(nodes: WorkflowItem['nodes']): WorkflowItem {
  return {
    metadata: {
      id: 'wf_1',
      name: 'Test Workflow',
      version: '1.0.0',
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: '2026-05-14T00:00:00.000Z',
    },
    trigger: { type: 'manual', ui: { positionX: 0, positionY: 0 } },
    nodes,
    edges: [],
  }
}

describe('workflow run trigger selection', () => {
  it('prefers an enabled manual trigger instead of the first real trigger node', () => {
    const workflow = makeWorkflow({
      trigger_webhook: {
        type: 'trigger',
        name: 'Webhook',
        trigger: { type: 'webhook', webhookSlug: 'incoming' },
      },
      trigger_manual: {
        type: 'trigger',
        name: 'Manual',
        trigger: { type: 'manual' },
      },
    })

    const result = selectToolbarRunTrigger(workflow)

    assert.equal(result?.triggerNodeId, 'trigger_manual')
    assert.equal(result?.trigger.type, 'manual')
  })

  it('does not execute passive triggers from the toolbar', () => {
    const workflow = makeWorkflow({
      trigger_webhook: {
        type: 'trigger',
        name: 'Webhook',
        trigger: { type: 'webhook', webhookSlug: 'incoming' },
      },
    })

    assert.equal(selectToolbarRunTrigger(workflow), null)
  })

  it('falls back to the legacy virtual trigger when there are no real trigger nodes', () => {
    const workflow = makeWorkflow({})

    const result = selectToolbarRunTrigger(workflow)

    assert.equal(result?.triggerNodeId, 'trigger')
    assert.equal(result?.trigger, workflow.trigger)
  })

  it('does not render the legacy trigger on an empty new workflow', () => {
    assert.equal(shouldRenderLegacyTriggerNode(makeWorkflow({})), false)
  })

  it('renders the legacy trigger when existing edges still reference it', () => {
    const workflow = makeWorkflow({
      node_1: {
        type: 'set',
        name: 'Set',
        assignments: [],
      },
    })
    workflow.edges = [{ id: 'e-trigger-node_1', source: 'trigger', target: 'node_1' }]

    assert.equal(shouldRenderLegacyTriggerNode(workflow), true)
  })
})
