import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('workflow chat bottom panel wraps the shared chat session panel', () => {
  const source = read('src/features/workflow-editor/components/agent/WorkflowChatBottomPanel.vue')

  assert.match(source, /import ChatSessionPanel/)
  assert.match(source, /<ChatSessionPanel/)
  assert.match(source, /chatTriggers\?: ChatPanelTrigger\[\]/)
  assert.match(source, /selectedTriggerNodeId\?: string/)
  assert.match(source, /:chat-slug="selectedTrigger\?\.chatSlug \|\| ''"/)
  assert.match(source, /:title="selectedTrigger\?\.title \|\| 'Agent Chat'"/)
  assert.match(source, /@update:selected-trigger-node-id/)
  assert.doesNotMatch(source, /BaseSelect/)
})

test('workflow chat bottom panel passes editor dev session context to chat session panel', () => {
  const source = read('src/features/workflow-editor/components/agent/WorkflowChatBottomPanel.vue')
  const page = read('src/app/pages/WorkflowEditorPage.vue')

  for (const prop of ['workflowId?: string', 'triggerNodeId?: string', 'devSessionId?: string']) {
    assert.match(source, new RegExp(prop.replace('?', '\\?')))
  }

  assert.match(source, /:workflow-id="workflowId"/)
  assert.match(source, /:trigger-node-id="selectedTrigger\?\.triggerNodeId"/)
  assert.match(source, /:dev-session-id="devSessionId"/)
  assert.match(page, /workflowId: activeWorkflowId\.value/)
  assert.match(page, /chatTriggers: activeChatTriggers\.value/)
  assert.match(page, /activeDevSessionStatus/)
  assert.match(page, /activeChatDevSessionId/)
  assert.match(page, /devSessionId: activeChatDevSessionId\.value/)
})

test('workflow chat bottom panel has a compact empty state when no chat slug exists', () => {
  const source = read('src/features/workflow-editor/components/agent/WorkflowChatBottomPanel.vue')

  assert.match(source, /workflow-chat-bottom-panel__empty/)
  assert.match(source, /Configure a Chat Trigger/)
  assert.match(source, /Trigger Type = Chat/)
  assert.match(source, /v-if="!selectedTrigger\?\.chatSlug"/)
})

test('workflow chat bottom panel follows the execution bottom panel shell style', () => {
  const source = read('src/features/workflow-editor/components/agent/WorkflowChatBottomPanel.vue')

  assert.match(source, /workflow-chat-bottom-panel/)
  assert.doesNotMatch(source, /workflow-chat-bottom-panel__topbar/)
  assert.match(source, /workflow-chat-bottom-panel__body/)
  assert.match(source, /height: 100%/)
  assert.match(source, /min-height: 0/)
})

test('workflow chat selection is lifted to editor page so status bar follows it', () => {
  const page = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(page, /selectedChatTriggerNodeId/)
  assert.match(page, /selectedChatTriggerEntry/)
  assert.match(page, /'onUpdate:selectedTriggerNodeId'/)
  assert.doesNotMatch(page, /onUpdateSelectedTriggerNodeId/)
  assert.match(page, /selectedChatSlug/)
  assert.match(page, /<code>\{\{ selectedChatSlug \|\| 'not configured' \}\}<\/code>/)
})

test('workflow chat opens as a large left panel with right-side resizing', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /id: 'workflow-chat-bottom-panel'/)
  assert.match(source, /position: 'left'/)
  assert.match(source, /width: 'lg'/)
  assert.match(source, /resizeSide: 'right'/)
  assert.doesNotMatch(source, /id: 'workflow-chat-bottom-panel'[\s\S]*width: 'xl'/)
  assert.doesNotMatch(source, /id: 'workflow-chat-bottom-panel'[\s\S]*position: 'bottom'/)
})
