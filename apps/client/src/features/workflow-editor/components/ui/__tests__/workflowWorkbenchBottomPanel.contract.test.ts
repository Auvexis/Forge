import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const source = readFileSync(
  fileURLToPath(new URL('../WorkflowWorkbenchBottomPanel.vue', import.meta.url)),
  'utf8',
)

test('workflow bottom panel renders the selected view without internal tabs', () => {
  assert.match(source, /export type WorkflowBottomPanelView = 'tree' \| 'execution' \| 'variables'/)
  assert.match(source, /<ExecutionBottomPanel v-else-if="activeView === 'execution'"/)
  assert.match(source, /activeView === 'tree'/)
  assert.match(source, /v-else class="workflow-bottom-panel__view"/)
  assert.doesNotMatch(source, /workflow-bottom-panel__tabs/)
  assert.doesNotMatch(source, /workflow-bottom-panel__tab/)
  assert.doesNotMatch(source, /emit\('update:activeView'/)
  assert.doesNotMatch(source, /'logs'/)
})
