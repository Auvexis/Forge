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

  it('shows save state and blocks no-op saves like the workflow toolbar', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorFloatingToolbar.vue'),
      'utf8',
    )

    assert.match(source, /isDirty/)
    assert.match(source, /isSaving/)
    assert.match(source, /wec-save-dot/)
    assert.match(source, /:disabled="isSaving \|\| !isDirty"/)
  })

  it('uses BaseButton labels with left icons and ghost variant for every action', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorFloatingToolbar.vue'),
      'utf8',
    )

    assert.match(source, /BaseButton/)
    assert.match(source, /variant="ghost"/)
    assert.match(source, /icon-left="mouse-pointer-2"/)
    assert.match(source, /icon-left="rocket"/)
    assert.doesNotMatch(source, /plugin-creator-toolbar__publish/)
    assert.doesNotMatch(source, /rgba\(0,\s*214,\s*143/)
    assert.doesNotMatch(source, /<button/)
  })

  it('keeps selection and history controls icon-only and removes the zoom label', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorFloatingToolbar.vue'),
      'utf8',
    )

    for (const label of ['Cursor', 'Pan', 'Delete', 'Undo', 'Redo']) {
      assert.doesNotMatch(source, new RegExp(`>\\s*${label}\\s*<`))
    }

    assert.match(source, /size="icon"[\s\S]*icon-left="mouse-pointer-2"/)
    assert.match(source, /size="icon"[\s\S]*icon-left="hand"/)
    assert.match(source, /size="icon"[\s\S]*icon-left="trash-2"/)
    assert.match(source, /size="icon"[\s\S]*icon-left="undo-2"/)
    assert.match(source, /size="icon"[\s\S]*icon-left="redo-2"/)
    assert.doesNotMatch(source, />\s*Zoom\s*</)
  })

  it('matches WorkflowChromeToolbar save dot structure', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorFloatingToolbar.vue'),
      'utf8',
    )

    assert.match(source, /class="wec-save-dot"/)
    assert.match(source, /'wec-save-dot--dirty': isDirty/)
    assert.match(source, /'wec-save-dot--saving': isSaving/)
    assert.doesNotMatch(source, /icon-left="save"/)
    assert.doesNotMatch(source, /plugin-creator-save-dot/)
  })
})
