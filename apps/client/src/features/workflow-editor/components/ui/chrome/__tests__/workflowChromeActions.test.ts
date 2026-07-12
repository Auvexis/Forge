import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { workflowChromeMenus, workflowChromeToolbarGroups } from '../workflowChromeActions.ts'

const chromeSource = readFileSync(
  fileURLToPath(new URL('../WorkflowEditorChrome.vue', import.meta.url)),
  'utf8',
)
const headerSource = readFileSync(
  fileURLToPath(new URL('../WorkflowChromeHeader.vue', import.meta.url)),
  'utf8',
)
const canvasSource = readFileSync(
  fileURLToPath(new URL('../../../FabricWorkflowCanvas.vue', import.meta.url)),
  'utf8',
)
const chromeStylesSource = readFileSync(
  fileURLToPath(new URL('../../../../styles/workflow-editor-chrome.css', import.meta.url)),
  'utf8',
)

describe('workflow chrome actions', () => {
  it('defines only supported top-level menus in the intended order', () => {
    assert.deepEqual(
      workflowChromeMenus.map((menu) => menu.id),
      ['file', 'edit', 'view', 'select', 'go', 'run', 'git', 'help'],
    )
  })

  it('does not expose empty menus', () => {
    assert.equal(workflowChromeMenus.every((menu) => menu.items.length > 0), true)
  })

  it('defines the primary toolbar groups in workflow editing order', () => {
    assert.deepEqual(
      workflowChromeToolbarGroups.map((group) => group.id),
      ['history', 'canvas', 'insert', 'workflow', 'execution', 'save'],
    )
  })

  it('exposes publish and unpublish as real enabled workflow chrome actions', () => {
    const runMenu = workflowChromeMenus.find((menu) => menu.id === 'run')
    const publishItem = runMenu?.items.find((item) => item.id === 'run.publish')
    const toolbarGroup = workflowChromeToolbarGroups.find((group) => group.id === 'save')
    const publishToolbarItem = toolbarGroup?.actions.find((item) => item.id === 'run.publish')

    assert.equal(publishItem?.label, 'Publish Workflow')
    assert.equal(publishItem?.disabledReason, undefined)
    assert.equal(publishToolbarItem?.label, 'Publish')
    assert.equal(publishToolbarItem?.icon, 'radio')
  })

  it('computes the publish command label from the active workflow state', () => {
    assert.match(chromeSource, /isWorkflowPublished/)
    assert.match(chromeSource, /dynamicMenuOverrides/)
    assert.match(chromeSource, /Unpublish Workflow/)
    assert.match(chromeSource, /Publish Workflow/)
    assert.match(chromeSource, /publishToolbarLabel/)
  })

  it('exposes clean execution from the toolbar execution group', () => {
    const executionGroup = workflowChromeToolbarGroups.find((group) => group.id === 'execution')
    const cleanAction = executionGroup?.actions.find((action) => action.id === 'run.clean-execution')

    assert.equal(cleanAction?.label, 'Clean Execution')
    assert.equal(cleanAction?.icon, 'eraser')
  })

  it('routes clean execution through the workflow chrome instead of the old canvas dock', () => {
    assert.match(chromeSource, /\(e: 'clean-execution'\): void/)
    assert.match(chromeSource, /'run\.clean-execution': \(\) => emit\('clean-execution'\)/)
    assert.doesNotMatch(canvasSource, /EditorControlsDock/)
  })

  it('exposes workflow git commands from the chrome menu', () => {
    const gitMenu = workflowChromeMenus.find((menu) => menu.id === 'git')

    assert.deepEqual(
      gitMenu?.items.map((item) => item.id),
      ['git.create-snapshot', 'git.refresh-status', 'git.copy-repo-path'],
    )
    assert.match(chromeSource, /\(e: 'git-create-snapshot'\): void/)
    assert.match(chromeSource, /\(e: 'git-refresh-status'\): void/)
    assert.match(chromeSource, /\(e: 'git-copy-repo-path'\): void/)
    assert.match(chromeSource, /'git\.create-snapshot': \(\) => emit\('git-create-snapshot'\)/)
  })

  it('refreshes workflows whenever the workflow dropdown opens', () => {
    assert.match(headerSource, /function handleWorkflowMenuOpen\(\)/)
    assert.match(headerSource, /fetchWorkflows\(\)\.catch\(console\.error\)/)
    assert.match(headerSource, /@open="handleWorkflowMenuOpen"/)
  })

  it('defers topbar teleports until the app shell topbar targets exist', () => {
    assert.match(chromeSource, /<Teleport defer to="#fabric-topbar-left">/)
    assert.match(chromeSource, /<Teleport defer to="#fabric-topbar-context">/)
  })

  it('styles the toolbar as the single compact workflow tool strip', () => {
    assert.match(chromeStylesSource, /--fabric-chrome-height-toolbar: 32px/)
    assert.match(chromeStylesSource, /\.wec-group\s*\{[\s\S]*height: 26px;[\s\S]*border:/)
    assert.match(chromeStylesSource, /\.wec-toolbar-row\s*\{[\s\S]*border-bottom:/)
  })
})
