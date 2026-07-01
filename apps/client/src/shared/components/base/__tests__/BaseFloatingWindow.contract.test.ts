import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentPath = path.resolve('src/shared/components/base/BaseFloatingWindow.vue')

describe('BaseFloatingWindow contract', () => {
  it('renders reusable header slots and default content slot', () => {
    const source = fs.readFileSync(componentPath, 'utf8')

    assert.match(source, /<slot name="title"/)
    assert.match(source, /<slot name="subtitle"/)
    assert.match(source, /<slot name="actions"/)
    assert.match(source, /<slot \/>/)
  })

  it('owns drag, resize, collapse, viewport clamp and optional local storage', () => {
    const source = fs.readFileSync(componentPath, 'utf8')

    assert.match(source, /@pointerdown="startDrag"/)
    assert.match(source, /@pointerdown\.stop="startResize"/)
    assert.match(source, /pointermove/)
    assert.match(source, /isCollapsed/)
    assert.match(source, /clampLayout/)
    assert.match(source, /storageKey/)
    assert.match(source, /localStorage/)
  })
})
