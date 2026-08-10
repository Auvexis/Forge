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
    assert.match(globalPanelSource, /panelId: panelStore\.panelId/)
    assert.match(globalPanelSource, /resizable: panelStore\.resizable/)
    assert.match(globalPanelSource, /resizeSide: panelStore\.resizeSide/)
    assert.match(globalPanelSource, /@resize="emitPanelResize"/)
    assert.match(globalPanelSource, /@resize-reset="emitPanelResizeReset"/)
  })

  it('implements directional resize handles in AppPanel', () => {
    assert.match(appPanelSource, /panelId\?: string/)
    assert.match(appPanelSource, /watch\([\s\S]*props\.panelId/)
    assert.match(appPanelSource, /resetResizeForPanelIdentity/)
    assert.match(appPanelSource, /resizable\?: boolean/)
    assert.match(appPanelSource, /resizeSide\?: 'top' \| 'bottom' \| 'left' \| 'right'/)
    assert.match(appPanelSource, /app-panel__resize-handle/)
    assert.match(appPanelSource, /startResize/)
    assert.match(appPanelSource, /resizePanel/)
    assert.match(appPanelSource, /--app-panel-resized-height/)
    assert.match(appPanelSource, /--app-panel-resized-width/)
    assert.match(appPanelSource, /resize: \[size: \{ width: number \| null; height: number \| null \}\]/)
    assert.match(appPanelSource, /resizeReset: \[\]/)
    assert.match(appPanelSource, /\.app-panel\.surface-elevated\s*\{[\s\S]*box-shadow: none;/)
  })

  it('lets panel body children own their internal scroll regions', () => {
    assert.match(appPanelSource, /\.app-panel__body\s*\{[\s\S]*flex: 1;[\s\S]*min-height: 0;[\s\S]*overflow-y: auto;/)
  })

  it('keeps AppPanel chrome compact for dense workspaces', () => {
    assert.match(appPanelSource, /\.app-panel__header\s*\{[\s\S]*height: 36px;/)
    assert.match(appPanelSource, /\.app-panel__header\s*\{[\s\S]*background: var\(--fabric-app-panel-workbench-panel-header-bg/)
    assert.match(appPanelSource, /\.app-panel__title\s*\{[\s\S]*font-size: var\(--fabric-text-xs\);/)
    assert.match(appPanelSource, /\.app-panel__footer\s*\{[\s\S]*padding: var\(--fabric-space-2\) var\(--fabric-space-3\);/)
  })

  it('keeps AppPanel docked without drawer transitions', () => {
    assert.doesNotMatch(appPanelSource, /<Transition/)
    assert.doesNotMatch(appPanelSource, /transitionName/)
    assert.doesNotMatch(appPanelSource, /slide-right|slide-left|slide-up/)
  })

  it('keeps workflow bottom panel resizing local to the workbench', () => {
    assert.match(workflowPageSource, /WorkflowWorkbenchBottomPanel/)
    assert.match(workflowPageSource, /startBottomPanelResize/)
    assert.match(workflowPageSource, /resizeBottomPanel/)
    assert.match(workflowPageSource, /workflowBottomPanelHeight/)
    assert.doesNotMatch(workflowPageSource, /id: 'workflow-execution-bottom-panel'/)
  })

  it('keeps workflow side panels in one right-side stack', () => {
    assert.match(workflowPageSource, /const workflowGlobalPanelWidth = ref<number \| null>\(null\)/)
    assert.match(workflowPageSource, /if \(workflowGlobalPanelWidth\.value !== null\) return workflowGlobalPanelWidth\.value/)
    assert.match(workflowPageSource, /@resize="handleGlobalPanelResize"/)
    assert.match(workflowPageSource, /@resize-reset="handleGlobalPanelResizeReset"/)
    assert.match(workflowPageSource, /function toggleInspectorPanel\(\)/)
    assert.match(workflowPageSource, /closeGlobalSidePanel\(\)[\s\S]*showSettings\.value = false[\s\S]*showInspector\.value = true/)
    assert.match(workflowPageSource, /function openGlobalAddNodePanel\(toggle = false\)[\s\S]*showInspector\.value = false/)
    assert.match(workflowPageSource, /function openWorkflowSettings\(\)[\s\S]*showInspector\.value = false/)
    assert.doesNotMatch(workflowPageSource, /\.workflow-inspector-panel :deep\(\.app-panel__header\)\s*\{[^}]*background:/)
  })
})
