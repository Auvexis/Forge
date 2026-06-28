import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const storeSource = readFileSync(
  fileURLToPath(new URL('../workflow.store.ts', import.meta.url)),
  'utf8',
)
const pageSource = readFileSync(
  fileURLToPath(new URL('../../../../app/pages/WorkflowEditorPage.vue', import.meta.url)),
  'utf8',
)
const canvasSource = readFileSync(
  fileURLToPath(new URL('../../components/WorkflowBaseCanvas.vue', import.meta.url)),
  'utf8',
)

describe('workflow autosave contracts', () => {
  it('autosave only runs for persisted workflows and root drafts stay disabled', () => {
    assert.match(storeSource, /isPersistedWorkflow/)
    assert.match(storeSource, /!isPersistedWorkflow\.value/)
    assert.match(pageSource, /autosaveEnabled: false/)
    assert.match(pageSource, /handleSaveWorkflow/)
  })

  it('keeps an invalid new workflow open when save fails', () => {
    assert.match(storeSource, /async function saveActiveWorkflow[\s\S]*Promise<boolean>/)
    assert.match(storeSource, /const savedWorkflow = await saveApi\.execute[\s\S]*return true/)
    assert.match(storeSource, /catch \(error\)[\s\S]*return false/)
    assert.match(pageSource, /const saved = await workflowStore\.saveActiveWorkflow\(\)[\s\S]*if \(!saved\) return/)
    assert.match(pageSource, /if \(!saved\) return[\s\S]*await loadWorkflowGitStatus\(\)[\s\S]*router\.replace/)
  })

  it('recovers local drafts as unsaved changes instead of saved state', () => {
    assert.match(storeSource, /function recoverDraft\(workflowId: string\): boolean/)
    assert.match(storeSource, /activeWorkflow\.value = parsed\.workflow/)
    assert.doesNotMatch(storeSource, /_savedSnapshot\.value = serializeForDiff\(parsed\.workflow\)/)
  })

  it('commits a complete node drag as one undo history entry', () => {
    assert.match(storeSource, /function beginHistoryTransaction\(\)/)
    assert.match(storeSource, /function commitHistoryTransaction\(\)/)
    assert.match(storeSource, /historyTransactionSnapshot/)
    assert.match(canvasSource, /@item-drag-start="workflowStore\.beginHistoryTransaction"/)
    assert.match(canvasSource, /@item-drag-end="workflowStore\.commitHistoryTransaction"/)
  })
})
