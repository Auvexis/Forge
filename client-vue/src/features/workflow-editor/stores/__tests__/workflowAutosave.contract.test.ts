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

describe('workflow autosave contracts', () => {
  it('autosave only runs for persisted workflows and root drafts stay disabled', () => {
    assert.match(storeSource, /isPersistedWorkflow/)
    assert.match(storeSource, /!isPersistedWorkflow\.value/)
    assert.match(pageSource, /autosaveEnabled: false/)
    assert.match(pageSource, /handleSaveWorkflow/)
  })
})
