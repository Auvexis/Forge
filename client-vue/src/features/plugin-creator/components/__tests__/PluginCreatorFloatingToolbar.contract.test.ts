import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreatorFloatingToolbar contract', () => {
  it('contains required bottom toolbar tools', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorFloatingToolbar.vue'),
      'utf8',
    )
    const labels = [
      'Cursor/select',
      'Pan tool',
      'Delete tool',
      'Clear Execution',
      'Add Item/Node',
      'Undo',
      'Redo',
      'Zoom',
      'Run',
      'Save',
      'Publish',
    ]

    for (const label of labels) {
      assert.match(source, new RegExp(label))
    }
  })

  it('handles Escape by returning to cursor mode', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorFloatingToolbar.vue'),
      'utf8',
    )

    assert.match(source, /keydown/)
    assert.match(source, /Escape/)
    assert.match(source, /cursor/)
  })

  it('keeps the toolbar within the canvas viewport', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorFloatingToolbar.vue'),
      'utf8',
    )

    assert.match(source, /max-width:\s*calc\(100% - 32px\)/)
    assert.match(source, /overflow-x:\s*auto/)
  })
})
