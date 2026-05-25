import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page editor contract', () => {
  it('editor renders selected page and uses panels', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /pagesStore\.activePage/)
    assert.match(source, /<PageCanvas/)
    assert.match(source, /title="Explorer"/)
    assert.match(source, /title="Inspector"/)
    assert.match(source, /<PageFloatingAddToolbar/)
    assert.doesNotMatch(source, /<BlockLibrary/)
  })

  it('canvas uses structural block renderer, not free-position canvas', () => {
    const source = read('src/features/web-pages/components/PageCanvas.vue')

    assert.match(source, /<BlockRenderer/)
    assert.doesNotMatch(source, /\bx:/)
    assert.doesNotMatch(source, /\by:/)
  })

  it('page body padding is a style fallback so user padding zero wins', () => {
    const source = read('src/features/web-pages/components/PageCanvas.vue')
    const css = read('src/features/web-pages/pages.css')
    const bodyRule = css.match(/\.web-page-canvas__body\s*{[\s\S]*?}/)?.[0] ?? ''

    assert.match(source, /resolvedBodyStyles/)
    assert.match(source, /padding: 'var\(--sailor-space-6\)'/)
    assert.match(source, /\.\.\.props\.bodyStyles/)
    assert.doesNotMatch(bodyRule, /padding:\s*var\(--sailor-space-6\)/)
  })

  it('editor clears selection when clicking empty workspace and supports pan tool panning', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(source, /@click\.self="clearEditorSelection"/)
    assert.match(source, /editorStore\.clearSelection\(\)/)
    assert.match(source, /activeTool === 'pan'/)
    assert.match(source, /startWorkspacePan/)
    assert.match(source, /panStart/)
    assert.match(css, /web-page-editor__workspace--pan/)
    assert.match(css, /cursor:\s*grab/)
  })

  it('workspace behaves like a pan canvas without the zoom mini menu', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(source, /isSpacePanActive/)
    assert.match(source, /event\.button === 1/)
    assert.match(source, /web-page-editor__plane/)
    assert.match(renderer, /draggable="!readonly && activeTool === 'cursor'"/)
    assert.match(css, /web-page-editor__plane/)
    assert.match(css, /transform-origin:\s*top center/)
    assert.match(css, /min-width:\s*2400px/)
    assert.doesNotMatch(source, /FREE_CANVAS_WIDTH/)
    assert.doesNotMatch(source, /centerWorkspacePlane/)
    assert.doesNotMatch(source, /web-page-canvas-controls/)
    assert.doesNotMatch(css, /web-page-canvas-controls/)
  })

  it('workspace keeps the previous centered canvas plane instead of the free plane', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.doesNotMatch(source, /FREE_CANVAS_WIDTH/)
    assert.doesNotMatch(source, /FREE_CANVAS_HEIGHT/)
    assert.doesNotMatch(css, /--web-page-free-canvas-width/)
    assert.match(css, /min-width:\s*2400px/)
    assert.match(css, /min-height:\s*1800px/)
  })

  it('canvas active tools override block cursor feedback', () => {
    const css = read('src/features/web-pages/pages.css')

    assert.match(css, /web-page-canvas--active-tool-cursor/)
    assert.match(css, /web-page-canvas--active-tool-pan[\s\S]*\.web-page-block/)
    assert.match(css, /web-page-canvas--active-tool-delete[\s\S]*cursor:\s*url\(/)
  })

  it('block renderer recursively renders children and emits selection', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.match(source, /v-for="child in block\.children/)
    assert.match(source, /<BlockRenderer/)
    assert.match(source, /select/)
  })

  it('empty container blocks still render a visible placeholder on the canvas', () => {
    const source = read('src/features/web-pages/components/BlockRenderer.vue')
    const styles = read('src/features/web-pages/pages.css')

    assert.match(source, /web-page-block__placeholder/)
    assert.match(source, /block\.tag/)
    assert.match(styles, /web-page-block__placeholder/)
  })

  it('toolbar emits delete and duplicate', () => {
    const source = read('src/features/web-pages/components/BlockToolbar.vue')

    assert.match(source, /delete/)
    assert.match(source, /duplicate/)
  })

  it('canvas blocks expose ghost duplicate and delete actions', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const canvas = read('src/features/web-pages/components/PageCanvas.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(renderer, /BaseButton/)
    assert.match(renderer, /variant="ghost"/)
    assert.match(renderer, /duplicate-block/)
    assert.match(renderer, /delete-block/)
    assert.match(canvas, /@duplicate-block/)
    assert.match(editor, /duplicateBlockFromCanvas/)
    assert.match(editor, /deleteBlockFromCanvas/)
  })

  it('double clicking a canvas block opens the inspector for that block', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const canvas = read('src/features/web-pages/components/PageCanvas.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(renderer, /@dblclick\.stop/)
    assert.match(renderer, /inspect-block/)
    assert.match(canvas, /@inspect-block/)
    assert.match(editor, /handleInspectBlock/)
    assert.match(editor, /isRightPanelOpen\.value = true/)
  })

  it('tree panel can select block', () => {
    const source = read('src/features/web-pages/components/BlockTreePanel.vue')

    assert.match(source, /select/)
    assert.match(source, /block\.children/)
  })
})
