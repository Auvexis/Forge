import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const appPanelSource = readFileSync(
  fileURLToPath(new URL('../AppPanel.vue', import.meta.url)),
  'utf8',
)
const globalPanelSource = readFileSync(
  fileURLToPath(new URL('../GlobalAppPanel.vue', import.meta.url)),
  'utf8',
)
const storeSource = readFileSync(
  fileURLToPath(new URL('../../../stores/app-panel.store.ts', import.meta.url)),
  'utf8',
)
const workflowPageSource = readFileSync(
  fileURLToPath(new URL('../../../../app/pages/WorkflowEditorPage.vue', import.meta.url)),
  'utf8',
)

describe('global app panel resize', () => {
  it('carries resize config through the global app panel store', () => {
    assert.match(storeSource, /resizable\??: boolean/)
    assert.match(storeSource, /resizeSide\??: 'top' \| 'bottom' \| 'left' \| 'right'/)
    assert.match(storeSource, /resizable\.value = config\.resizable === true/)
    assert.match(storeSource, /resizeSide\.value = config\.resizeSide \|\| 'top'/)
  })

  it('passes resize props from GlobalAppPanel to AppPanel', () => {
    assert.match(globalPanelSource, /resizable: panelStore\.resizable/)
    assert.match(globalPanelSource, /resizeSide: panelStore\.resizeSide/)
  })

  it('implements directional resize handles in AppPanel', () => {
    assert.match(appPanelSource, /resizable\?: boolean/)
    assert.match(appPanelSource, /resizeSide\?: 'top' \| 'bottom' \| 'left' \| 'right'/)
    assert.match(appPanelSource, /app-panel__resize-handle/)
    assert.match(appPanelSource, /startResize/)
    assert.match(appPanelSource, /resizePanel/)
    assert.match(appPanelSource, /--app-panel-resized-height/)
    assert.match(appPanelSource, /--app-panel-resized-width/)
  })

  it('lets panel body children own their internal scroll regions', () => {
    assert.match(appPanelSource, /\.app-panel__body\s*\{[\s\S]*flex: 1;[\s\S]*min-height: 0;[\s\S]*overflow-y: auto;/)
  })

  it('opens the workflow execution panel as top-resizable', () => {
    assert.match(workflowPageSource, /id: 'workflow-execution-bottom-panel'/)
    assert.match(workflowPageSource, /resizable: true/)
    assert.match(workflowPageSource, /resizeSide: 'top'/)
  })
})
