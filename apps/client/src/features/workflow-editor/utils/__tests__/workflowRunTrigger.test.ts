import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  listWorkflowChatTriggers,
  selectToolbarRunTrigger,
  shouldRenderLegacyTriggerNode,
} from '../workflowRunTrigger.ts'
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

  it('recognizes chat triggers as chat panel runs', () => {
    const workflow = makeWorkflow({
      trigger_chat: {
        type: 'trigger',
        name: 'Chat',
        trigger: { type: 'chat', chatSlug: 'agent-chat' },
      },
    })

    const result = selectToolbarRunTrigger(workflow)

    assert.equal(result?.triggerNodeId, 'trigger_chat')
    assert.equal(result?.trigger.type, 'chat')
    assert.equal(result?.runMode, 'chat-panel')
  })

  it('lists every enabled chat trigger for the chat panel selector', () => {
    const workflow = makeWorkflow({
      trigger_chat_a: {
        type: 'trigger',
        name: 'Support',
        trigger: { type: 'chat', chatSlug: 'support-chat', chatTitle: 'Support' },
      },
      trigger_chat_b: {
        type: 'trigger',
        name: 'Sales',
        trigger: { type: 'chat', chatSlug: 'sales-chat', chatTitle: 'Sales' },
      },
      trigger_chat_disabled: {
        type: 'trigger',
        name: 'Disabled',
        disabled: true,
        trigger: { type: 'chat', chatSlug: 'disabled-chat' },
      },
    })

    const result = listWorkflowChatTriggers(workflow)

    assert.deepEqual(
      result.map((entry) => [entry.triggerNodeId, entry.chatSlug, entry.title]),
      [
        ['trigger_chat_a', 'support-chat', 'Support'],
        ['trigger_chat_b', 'sales-chat', 'Sales'],
      ],
    )
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
