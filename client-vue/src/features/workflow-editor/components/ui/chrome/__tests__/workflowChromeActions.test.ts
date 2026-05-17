import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { workflowChromeMenus, workflowChromeToolbarGroups } from '../workflowChromeActions.ts'

const chromeSource = readFileSync(
  fileURLToPath(new URL('../WorkflowEditorChrome.vue', import.meta.url)),
  'utf8',
)
const canvasSource = readFileSync(
  fileURLToPath(new URL('../../../SailorWorkflowCanvas.vue', import.meta.url)),
  'utf8',
)

describe('workflow chrome actions', () => {
  it('defines only supported top-level menus in the intended order', () => {
    assert.deepEqual(
      workflowChromeMenus.map((menu) => menu.id),
      ['file', 'edit', 'view', 'select', 'go', 'run', 'help'],
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

  it('exposes publish as a real enabled run menu action', () => {
    const runMenu = workflowChromeMenus.find((menu) => menu.id === 'run')
    const publishItem = runMenu?.items.find((item) => item.id === 'run.publish')

    assert.equal(publishItem?.label, 'Publish Workflow')
    assert.equal(publishItem?.disabledReason, undefined)
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
})
