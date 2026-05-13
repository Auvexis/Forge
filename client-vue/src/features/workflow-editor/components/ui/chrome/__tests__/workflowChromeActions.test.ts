import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { workflowChromeMenus, workflowChromeToolbarGroups } from '../workflowChromeActions.ts'

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
})
