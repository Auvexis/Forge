import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('workflow editor renders inside the shared workbench shell', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /AppWorkbench/)
  assert.match(source, /:show-global-panel="false"/)
  assert.match(source, /GlobalAppPanel/)
  assert.match(source, /WorkbenchStatusBar/)
  assert.match(source, /#toolstrip/)
  assert.match(source, /#left/)
  assert.match(source, /#status/)
  assert.match(source, /workflow-workbench__canvas/)
  assert.match(source, /<AppPanel[\s\S]*class="workflow-inspector-panel"/)
  assert.match(source, /const showInspector = ref\(true\)/)
  assert.match(source, /:is-open="showInspector"/)
  assert.match(source, /@close="showInspector = false"/)
  assert.doesNotMatch(source, /title="Open workflow settings"/)
  assert.match(source, /workflow-tool-rail/)
  assert.match(source, /workflow-inspector-panel/)
  assert.match(source, /workflow-inspector-width/)
  assert.match(source, /workflow-side-panel-width/)
  assert.match(source, /workflow-bottom-panel-right/)
  assert.match(source, /workflow-canvas-right/)
  assert.match(source, /workflow-canvas-bottom/)
  assert.match(source, /workflow-workbench__canvas-viewport/)
  assert.match(source, /workflowWorkbenchStyle/)
  assert.match(source, /handleInspectorPanelResize/)
  assert.match(source, /handleSettingsPanelResize/)
  assert.match(source, /handleGlobalPanelResize/)
  assert.match(source, /closeGlobalSidePanel/)
  assert.match(source, /appPanelStore\.position === 'bottom'/)
  assert.match(source, /app-panel--right:not\(\.workflow-inspector-panel\)/)
  assert.match(source, /app-panel--bottom/)
  assert.match(source, /useNodeInspectorStore/)
  assert.match(source, /openGlobalAddNodePanel/)
  assert.match(source, /canvasRef\?\.handleRun/)
})

test('workbench components expose toolstrip body and status slots', () => {
  const workbench = read('src/shared/components/workbench/AppWorkbench.vue')
  const status = read('src/shared/components/workbench/WorkbenchStatusBar.vue')

  assert.match(workbench, /app-workbench__toolstrip/)
  assert.match(workbench, /app-workbench__main/)
  assert.match(workbench, /app-workbench__status/)
  assert.match(status, /workbench-status-bar__zone--left/)
  assert.match(status, /workbench-status-bar__zone--right/)
})

test('fabric themes define workbench tokens', () => {
  const light = JSON.parse(read('src/themes/json/light.json'))
  const dark = JSON.parse(read('src/themes/json/dark.json'))

  for (const theme of [light, dark]) {
    assert.equal(typeof theme.tokens['workbench.bg'], 'string')
    assert.equal(typeof theme.tokens['workbench.main.bg'], 'string')
    assert.equal(typeof theme.tokens['workbench.status.bg'], 'string')
  }
})
