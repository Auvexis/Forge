import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('workflow editor status bar opens global dev chat and execution bottom panel', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.doesNotMatch(source, /WorkflowChatBottomPanel/)
  assert.match(source, /useAgentPanelUiStore/)
  assert.match(source, /useAgentPanelStore/)
  assert.match(source, /ExecutionBottomPanel/)
  assert.match(source, /workflow-status-bar__button/)
  assert.match(source, />\s*Chat\s*</)
  assert.match(source, />\s*Execution\s*</)
  assert.match(source, /openDevSessionChat/)
  assert.match(source, /openExecutionPanel/)
  assert.match(source, /id: 'workflow-execution-bottom-panel'/)
})

test('workflow editor status bar tracks active panel state from app panel id', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /isDevChatOpen/)
  assert.match(source, /isExecutionPanelOpen/)
  assert.match(source, /agentPanelUi\.isOpen/)
  assert.match(source, /appPanelStore\.panelId === 'workflow-execution-bottom-panel'/)
  assert.match(source, /toggleChatPanel/)
  assert.match(source, /toggleExecutionPanel/)
  assert.match(source, /agentPanelUi\.close\(\)/)
})

test('workflow editor opens dev session chat through global agent modal', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /canOpenDevChat/)
  assert.match(source, /:disabled="!canOpenDevChat"/)
  assert.match(source, /agentPanelStore\.prepareDevSession/)
  assert.match(source, /scope: 'dev-session'/)
  assert.match(source, /workflowId: activeWorkflowId\.value/)
  assert.match(source, /triggerNodeId: activeChatTriggerNodeId\.value/)
  assert.match(source, /agentPanelUi\.open\(\)/)
})

test('workflow editor saves dirty changes before publishing chat trigger workflows', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /async function handlePublishWorkflow\(\)/)
  assert.match(source, /workflowStore\.isDirty/)
  assert.match(source, /await workflowStore\.saveActiveWorkflow\(\)/)
  assert.match(source, /const workflowToPublish = workflowStore\.activeWorkflow/)
  assert.match(source, /workflowsApi\.publish\(workflowToPublish\.metadata\.id\)/)
})

test('workflow editor status bar shows workflow git snapshot state', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /WorkflowGitSnapshotStatus/)
  assert.match(source, /gitStatus = ref<WorkflowGitSnapshotStatus \| null>/)
  assert.match(source, /loadWorkflowGitStatus/)
  assert.match(source, /workflowsApi\.getGitStatus/)
  assert.match(source, /gitStatusLabel/)
  assert.match(source, /workflow-status-bar__button--git/)
  assert.match(source, /<LucideIcon name="git-branch"/)
})
