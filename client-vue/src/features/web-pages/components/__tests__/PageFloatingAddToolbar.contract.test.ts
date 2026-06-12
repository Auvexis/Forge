import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page floating add toolbar contract', () => {
  it('renders draggable element tools without click add behavior', () => {
    const source = read('src/features/web-pages/components/PageFloatingAddToolbar.vue')

    assert.match(source, /draggable="true"/)
    assert.match(source, /onDragStart/)
    assert.match(source, /application\/x-sailor-page-block/)
    assert.doesNotMatch(source, /@click="\$emit\('add'/)
  })

  it('is mounted in the editor and old inspector library is removed', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(editor, /PageFloatingAddToolbar/)
    assert.doesNotMatch(editor, /<BlockLibrary/)
  })

  it('starts as a bottom floating toolbar with a move handle, tooltips, and no persisted position', () => {
    const source = read('src/features/web-pages/components/PageFloatingAddToolbar.vue')

    assert.match(source, /web-page-floating-add-toolbar--bottom/)
    assert.match(source, /web-page-floating-add-toolbar__move/)
    assert.match(source, /onMoveStart/)
    assert.match(source, /data-tooltip/)
    assert.match(source, /leftPanelOpen/)
    assert.match(source, /rightPanelOpen/)
    assert.doesNotMatch(source, /localStorage|sessionStorage/)
  })

  it('separates cursor tools from grouped element dropdowns', () => {
    const source = read('src/features/web-pages/components/PageFloatingAddToolbar.vue')
    const dropdown = read('src/shared/components/base/BaseToolDropdown.vue')

    assert.match(source, /BaseToolDropdown/)
    assert.match(source, /Cursor/)
    assert.match(source, /Pan/)
    assert.match(source, /Delete/)
    assert.match(source, /layoutTools/)
    assert.match(source, /formTools/)
    assert.match(source, /contentTools/)
    assert.match(dropdown, /defineProps/)
    assert.match(dropdown, /position\?: 'top' \| 'bottom'/)
    assert.match(dropdown, /BaseButton/)
    assert.match(dropdown, /@dragstart/)
  })

  it('keeps cursor pan and delete as active selectable tools before element dropdowns', () => {
    const source = read('src/features/web-pages/components/PageFloatingAddToolbar.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const canvas = read('src/features/web-pages/components/PageCanvas.vue')

    assert.match(source, /modelValue/)
    assert.match(source, /update:modelValue/)
    assert.match(source, /id: 'cursor'/)
    assert.match(source, /id: 'pan'/)
    assert.match(source, /id: 'delete'/)
    assert.match(source, /modelValue === tool\.id/)
    assert.doesNotMatch(source, /@click="\$emit\('delete-selection'\)"/)
    assert.match(editor, /activeTool/)
    assert.match(editor, /@update:model-value="activeTool = \$event"/)
    assert.match(canvas, /active-tool/)
    assert.match(canvas, /props\.activeTool === 'delete'/)
  })

  it('dropdown buttons expose hints and switch open dropdown on hover', () => {
    const source = read('src/features/web-pages/components/PageFloatingAddToolbar.vue')
    const dropdown = read('src/shared/components/base/BaseToolDropdown.vue')

    assert.match(source, /activeDropdownId/)
    assert.match(source, /is-any-dropdown-open/)
    assert.match(source, /@open="activeDropdownId =/)
    assert.match(dropdown, /hint\?: string/)
    assert.match(dropdown, /data-tooltip/)
    assert.match(dropdown, /@mouseenter="handleTriggerMouseEnter"/)
    assert.match(dropdown, /activeDropdownId/)
    assert.match(dropdown, /watch\(/)
  })

  it('active mode buttons visibly override BaseButton styling', () => {
    const styles = read('src/features/web-pages/pages.css')

    assert.match(styles, /web-page-floating-add-toolbar__tool--active/)
    assert.match(styles, /background(?:-color)?:[^;]+!important/)
    assert.match(styles, /border-color:[^;]+!important/)
  })

  it('element dropdown keeps the menu alive while dragging an item', () => {
    const dropdown = read('src/shared/components/base/BaseToolDropdown.vue')
    const dragStartBody = dropdown.match(/function onToolDragStart[\s\S]*?\n}/)?.[0] ?? ''

    assert.match(dropdown, /isDragging/)
    assert.match(dropdown, /@dragend="onToolDragEnd"/)
    assert.doesNotMatch(dragStartBody, /requestClose\(\)/)
  })
})
