import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('workflow editor status bar opens chat and execution bottom panels', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /WorkflowChatBottomPanel/)
  assert.match(source, /ExecutionBottomPanel/)
  assert.match(source, /workflow-status-bar__button/)
  assert.match(source, />\s*Chat\s*</)
  assert.match(source, />\s*Execution\s*</)
  assert.match(source, /openChatPanel/)
  assert.match(source, /openExecutionPanel/)
  assert.match(source, /id: 'workflow-chat-bottom-panel'/)
  assert.match(source, /id: 'workflow-execution-bottom-panel'/)
})

test('workflow editor status bar tracks active panel state from app panel id', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /isChatPanelOpen/)
  assert.match(source, /isExecutionPanelOpen/)
  assert.match(source, /appPanelStore\.panelId === 'workflow-chat-bottom-panel'/)
  assert.match(source, /appPanelStore\.panelId === 'workflow-execution-bottom-panel'/)
  assert.match(source, /toggleChatPanel/)
  assert.match(source, /toggleExecutionPanel/)
  assert.match(source, /appPanelStore\.closePanel\(\)/)
})

test('workflow editor passes active chat trigger metadata into chat panel', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /activeChatSlug/)
  assert.match(source, /activeChatTitle/)
  assert.match(source, /activeChatTrigger/)
  assert.match(source, /activeChatTriggerNodeId/)
  assert.match(source, /activeChatDevSessionId/)
  assert.match(source, /Object\.entries\(workflowStore\.activeWorkflow\?\.nodes/)
  assert.match(source, /chatSlug: activeChatSlug\.value/)
  assert.match(source, /title: activeChatPanelTitle\.value/)
  assert.match(source, /devSessionId: activeChatDevSessionId\.value/)
  assert.match(source, /workflow\?\.trigger/)
})

test('workflow editor refreshes open chat panel props when chat trigger metadata changes', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /watch\(\s*\[\s*activeChatSlug,\s*activeChatTitle,\s*activeChatTriggerNodeId,\s*activeChatDevSessionId\s*\]/)
  assert.match(source, /if \(!isChatPanelOpen\.value\) return/)
  assert.match(source, /openChatPanel\(\)/)
})

test('workflow editor saves dirty changes before publishing chat trigger workflows', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /async function handlePublishWorkflow\(\)/)
  assert.match(source, /workflowStore\.isDirty/)
  assert.match(source, /await workflowStore\.saveActiveWorkflow\(\)/)
  assert.match(source, /const workflowToPublish = workflowStore\.activeWorkflow/)
  assert.match(source, /workflowsApi\.publish\(workflowToPublish\.metadata\.id\)/)
})
