import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page drag prediction contract', () => {
  it('editor store exposes current drag placement intent', () => {
    const source = read('src/features/web-pages/stores/page-editor.store.ts')

    assert.match(source, /PageDragIntent/)
    assert.match(source, /dragIntent/)
    assert.match(source, /pendingDragIntent/)
    assert.match(source, /DRAG_INTENT_SETTLE_MS/)
    assert.match(source, /setDragIntent/)
    assert.match(source, /clearDragIntent/)
  })

  it('block renderer reports predicted placement while dragging', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')
    const intent = read('src/features/web-pages/utils/dropIntent.ts')

    assert.match(source, /drag-intent/)
    assert.match(source, /targetId: props\.block\.id/)
    assert.match(source, /resolveBlockDropIntent/)
    assert.match(source, /props\.dropIntent\?\.targetId === props\.block\.id/)
    assert.match(source, /previous/)
    assert.match(intent, /VERTICAL_STICKY_RATIO/)
  })

  it('canvas clears prediction on drag leave and drop', () => {
    const source = read('src/features/web-pages/components/PageCanvas.vue')

    assert.match(source, /drag-intent/)
    assert.match(source, /clear-drag-intent/)
    assert.match(source, /@dragleave/)
  })

  it('css includes placement indicator states', () => {
    const source = read('src/features/web-pages/pages.css')

    assert.match(source, /web-page-drop-placeholder/)
    assert.match(source, /web-page-block--drop-inside/)
  })

  it('canvas drop indicators are neutral and do not use accent glow', () => {
    const source = read('src/features/web-pages/pages.css')
    const dropIndicatorRule = source.match(/\.web-page-drop-indicator\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    assert.match(source, /--web-page-drop-color/)
    assert.doesNotMatch(source, /--web-page-drop-color:[^;]*fabric-accent/)
    assert.match(dropIndicatorRule, /border-radius:\s*0/)
    assert.match(dropIndicatorRule, /height:\s*4px/)
    assert.match(source, /outline:\s*1px solid var\(--web-page-drop-color\)/)
    assert.match(source, /web-page-drop-placeholder[\s\S]*border:\s*1px dashed/)
    assert.doesNotMatch(dropIndicatorRule, /drop-shadow\(0 0/)
  })

  it('selected element uses a solid accent outline', () => {
    const source = read('src/features/web-pages/pages.css')

    assert.doesNotMatch(source, /@keyframes web-page-selected-dash/)
    assert.match(source, /web-page-block--selected[\s\S]*outline:\s*1px solid var\(--web-page-selected-color\)/)
  })

  it('focused canvas elements use a solid accent outline', () => {
    const source = read('src/features/web-pages/pages.css')

    assert.match(source, /web-page-block:focus/)
    assert.match(source, /web-page-block:focus-visible/)
    assert.match(source, /web-page-block:focus[\s\S]*outline:\s*1px solid var\(--web-page-selected-color\)/)
  })

  it('drag prediction exposes directional arrow indicators and a custom drag preview', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const toolbar = read('src/features/web-pages/components/PageToolboxPanel.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(renderer, /dropEdge/)
    assert.match(renderer, /web-page-drop-arrow/)
    assert.match(toolbar, /setDragImage/)
    assert.match(css, /web-page-drag-preview/)
    assert.match(css, /web-page-drop-arrow--top/)
    assert.match(css, /web-page-drop-arrow--right/)
    assert.match(css, /web-page-drop-arrow--bottom/)
    assert.match(css, /web-page-drop-arrow--left/)
  })

  it('drop placeholders reserve layout space while inside indicators avoid intercepting drag events', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const canvas = read('src/features/web-pages/components/PageCanvas.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(renderer, /web-page-block-frame__drop-layer/)
    assert.match(renderer, /dropIntent\?\.targetId === block\.id && dropIntent\.position === 'inside'/)
    assert.match(renderer, /web-page-drop-placeholder/)
    assert.match(canvas, /web-page-drop-placeholder/)
    assert.match(css, /web-page-block-frame__drop-layer[\s\S]*pointer-events:\s*none/)
    assert.match(css, /web-page-drop-placeholder[\s\S]*min-height:\s*36px/)
    assert.doesNotMatch(css, /web-page-block--drop-before[\s\S]*outline:/)
    assert.doesNotMatch(css, /web-page-block--drop-after[\s\S]*outline:/)
  })

  it('drop preview keeps transition group children stable during block dragging', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const canvas = read('src/features/web-pages/components/PageCanvas.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(renderer, /class="web-page-block-flow-item"/)
    assert.match(canvas, /class="web-page-block-flow-item"/)
    assert.match(css, /web-page-block-flow-item[\s\S]*display:\s*contents/)
    assert.match(renderer, /payload\.draggedId === props\.block\.id/)
    assert.match(renderer, /web-page-pointer-drag-preview/)
    assert.match(css, /web-page-pointer-drag-preview[\s\S]*pointer-events:\s*none/)
  })

  it('canvas deletes blocks immediately without animated removal delay', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(editor, /function deleteBlock\(blockId: string\)/)
    assert.doesNotMatch(editor, /requestAnimatedBlockDelete/)
    assert.doesNotMatch(editor, /setTimeout\(\(\) => \{\s*editorStore\.deleteBlock/)
    assert.match(renderer, /web-page-block-frame--deleting/)
    assert.doesNotMatch(css, /web-page-block-frame--deleting[\s\S]*opacity:\s*0/)
    assert.doesNotMatch(css, /\.web-page-block-leave-active\s*\{[\s\S]*opacity:\s*0/)
  })

  it('block lists keep transition groups without box enter leave animations', () => {
    const canvas = read('src/features/web-pages/components/PageCanvas.vue')
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(canvas, /TransitionGroup/)
    assert.match(renderer, /TransitionGroup/)
    assert.doesNotMatch(css, /web-page-block-move/)
    assert.doesNotMatch(css, /web-page-block-enter-active/)
    assert.doesNotMatch(css, /web-page-block-enter-from/)
  })
})
