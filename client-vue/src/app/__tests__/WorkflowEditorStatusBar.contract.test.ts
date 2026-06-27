import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
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
  assert.match(source, /WorkflowGitModal/)
  assert.match(source, /gitStatus = ref<WorkflowGitSnapshotStatus \| null>/)
  assert.match(source, /isGitModalOpen = ref\(false\)/)
  assert.match(source, /loadWorkflowGitStatus/)
  assert.match(source, /workflowsApi\.getGitStatus/)
  assert.match(source, /gitStatusLabel/)
  assert.match(source, /workflow-status-bar__button--git/)
  assert.match(source, /<LucideIcon name="git-branch"/)
  assert.match(source, /openGitModal/)
  assert.match(source, /@click="openGitModal"/)
  assert.match(source, /<WorkflowGitModal/)
})

test('workflow editor removes the standalone changes viewer', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.doesNotMatch(source, /WorkflowGitChangesWindow/)
  assert.doesNotMatch(source, /isGitChangesWindowOpen/)
  assert.doesNotMatch(source, /toggleGitChangesWindow/)
  assert.doesNotMatch(source, /workflow-status-bar__button--changes/)
  assert.equal(existsSync(resolve(root, 'src/features/workflow-editor/components/ui/WorkflowGitChangesWindow.vue')), false)
})

test('workflow editor commits workflow git snapshots manually from the git modal', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /handleCommitGitSnapshot/)
  assert.match(source, /await workflowStore\.saveActiveWorkflow\(\)/)
  assert.match(source, /workflowsApi\.commitGitSnapshot/)
  assert.match(source, /@commit="handleCommitGitSnapshot"/)
})

test('workflow git modal uses BaseModal and exposes commit UI', () => {
  const source = read('src/features/workflow-editor/components/ui/WorkflowGitModal.vue')

  assert.match(source, /BaseModal/)
  assert.match(source, /workflow-git-modal__sidebar/)
  assert.match(source, /workflow-git-modal__diff/)
  assert.match(source, /workflow-git-modal__summary-input/)
  assert.match(source, /workflow-git-modal__description-input/)
  assert.match(source, />\s*Commit to workflow\.json\s*</)
  assert.match(source, /defineEmits/)
  assert.match(source, /\(e: 'commit', message: string\): void/)
  assert.match(source, /buildWorkflowJsonDiff/)
  assert.match(source, /workflowsApi\.listGitSnapshots/)
  assert.match(source, /workflowsApi\.getGitSnapshot/)
})

test('workflow git modal exposes committed version selection', () => {
  const source = read('src/features/workflow-editor/components/ui/WorkflowGitModal.vue')

  assert.match(source, /BaseDropdownSelect/)
  assert.match(source, /snapshots = ref<WorkflowGitSnapshotSummary\[\]>/)
  assert.match(source, /selectedSnapshotHash = ref/)
  assert.match(source, /selectedSnapshotLabel/)
  assert.match(source, /versionOptions/)
  assert.match(source, /workflow-git-modal__version-option/)
  assert.match(source, /workflow-git-modal__version-select/)
  assert.doesNotMatch(source, /<select/)
  assert.match(source, /v-model="selectedSnapshotHash"/)
  assert.match(source, /snapshot\.shortHash/)
  assert.match(source, /snapshot\.message/)
  assert.match(source, /formatSnapshotDate/)
  assert.match(source, /loadSelectedSnapshot/)
})

test('workflow git modal restores selected committed versions', () => {
  const modal = read('src/features/workflow-editor/components/ui/WorkflowGitModal.vue')
  const page = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(modal, /\(e: 'restore', hash: string\): void/)
  assert.match(modal, /requestRestore/)
  assert.match(modal, /workflow-git-modal__restore-button/)
  assert.match(modal, />\s*Restore version\s*</)
  assert.match(modal, /:disabled="!canRestore"/)
  assert.match(modal, /emit\('restore', selectedSnapshotHash\.value\)/)

  assert.match(page, /handleRestoreGitSnapshot/)
  assert.match(page, /confirm\(/)
  assert.match(page, /workflowsApi\.restoreGitSnapshot/)
  assert.match(page, /workflowStore\.setActiveWorkflow\(restored\)/)
  assert.match(page, /@restore="handleRestoreGitSnapshot"/)

  const store = read('src/features/workflow-editor/stores/workflow.store.ts')
  assert.match(store, /function setActiveWorkflow\(workflow: WorkflowItem\)/)
  assert.match(store, /graphUpdateTrigger\.value\+\+/)
})
