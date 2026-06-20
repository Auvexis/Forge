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

  it('page body defaults to full viewport with zero spacing and user styles still win', () => {
    const source = read('src/features/web-pages/components/PageCanvas.vue')
    const css = read('src/features/web-pages/pages.css')
    const bodyRule = css.match(/\.web-page-canvas__body\s*{[\s\S]*?}/)?.[0] ?? ''

    assert.match(source, /resolvedBodyStyles/)
    assert.match(source, /width: '100vw'/)
    assert.match(source, /minHeight: '100vh'/)
    assert.match(source, /padding: '0'/)
    assert.match(source, /gap: '0'/)
    assert.match(source, /\.\.\.props\.bodyStyles/)
    assert.doesNotMatch(bodyRule, /padding:\s*var\(--sailor-space-6\)/)
  })

  it('normalizes viewport body width inside the editor canvas frame', () => {
    const source = read('src/features/web-pages/components/PageCanvas.vue')

    assert.match(source, /normalizeEditorBodyStyles/)
    assert.match(source, /styles\.width === '100vw'/)
    assert.match(source, /width: '960px'/)
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
    assert.match(source, /web-page-editor__base-canvas/)
    assert.match(renderer, /draggable="!readonly && activeTool === 'cursor'"/)
    assert.match(css, /web-page-editor__base-canvas/)
    assert.match(css, /transform-origin:\s*top center/)
    assert.match(css, /min-width:\s*0/)
    assert.doesNotMatch(source, /FREE_CANVAS_WIDTH/)
    assert.doesNotMatch(source, /centerWorkspacePlane/)
    assert.doesNotMatch(source, /web-page-canvas-controls/)
    assert.doesNotMatch(css, /web-page-canvas-controls/)
  })

  it('uses shared BaseCanvas as the Pages prototype shell', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /import \{ BaseCanvas \} from '@\/shared\/base-canvas\/components\.ts'/)
    assert.match(source, /import type \{ BaseCanvasContextMenuEvent, BaseCanvasItem, BaseCanvasItemsMoveEvent, BaseCanvasViewport \}/)
    assert.match(source, /const pageCanvasViewport = ref<BaseCanvasViewport>/)
    assert.match(source, /const pageCanvasSelection = ref<string\[\]>/)
    assert.match(source, /const pageCanvasItems = computed<BaseCanvasItem\[\]>/)
    assert.match(source, /<BaseCanvas/)
    assert.match(source, /#item="\{ item \}"/)
    assert.match(source, /@context-menu="openPageCanvasContextMenu"/)
    assert.match(source, /@items-move="handlePageCanvasItemsMove"/)
  })

  it('keeps Pages data and block editing outside BaseCanvas', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const baseCanvasOpenTag = source.match(/<BaseCanvas[\s\S]*?>/)?.[0] ?? ''

    assert.match(source, /pageCanvasSelection/)
    assert.match(source, /async function selectTreePage\(pageId: string\)/)
    assert.match(source, /@click="selectTreePage\(item\.id\)"/)
    assert.match(source, /<PageCanvas/)
    assert.match(source, /@select="selectCanvasBlock\(item\.id, \$event\)"/)
    assert.match(source, /@drop-block="handlePageDropBlock\(item\.id, \$event\)"/)
    assert.match(source, /@inspect-block="handleInspectBlock\(item\.id, \$event\)"/)
    assert.doesNotMatch(baseCanvasOpenTag, /blocks=/)
  })

  it('renders a Pages-owned context menu from generic canvas events', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(source, /pageCanvasContextMenu/)
    assert.match(source, /openPageCanvasContextMenu/)
    assert.match(source, /closePageCanvasContextMenu/)
    assert.match(source, /web-page-canvas-context-menu/)
    assert.match(source, /Add page/)
    assert.match(source, /Duplicate page/)
    assert.match(source, /Delete page/)
    assert.match(css, /web-page-canvas-context-menu/)
  })

  it('workspace centers the page by css instead of a wide horizontal plane', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.doesNotMatch(source, /FREE_CANVAS_WIDTH/)
    assert.doesNotMatch(source, /FREE_CANVAS_HEIGHT/)
    assert.doesNotMatch(source, /INITIAL_CANVAS_WIDTH/)
    assert.doesNotMatch(css, /--web-page-free-canvas-width/)
    assert.doesNotMatch(css, /min-width:\s*2400px/)
    assert.match(css, /width:\s*100%/)
    assert.match(css, /min-width:\s*0/)
    assert.match(css, /min-height:\s*1800px/)
  })

  it('canvas x position is independent from side panel state', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.doesNotMatch(css, /web-page-editor--left-collapsed \.web-page-editor__workspace/)
    assert.doesNotMatch(css, /web-page-editor--right-collapsed \.web-page-editor__workspace/)
    assert.match(css, /web-page-editor__workspace[\s\S]*margin:\s*0/)
    assert.match(css, /web-page-editor__workspace[\s\S]*padding:\s*calc\(40px \+ var\(--sailor-space-8\)\) 0 var\(--sailor-space-8\)/)
    assert.match(source, /positionInitialCanvas/)
  })

  it('positions the initial canvas vertically without shifting x', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /positionInitialCanvas/)
    assert.doesNotMatch(source, /INITIAL_CANVAS_WIDTH/)
    assert.match(source, /workspaceRef\.value\.scrollLeft = 0/)
    assert.match(source, /workspaceRef\.value\.scrollTop/)
    assert.match(source, /await nextTick\(\)[\s\S]*positionInitialCanvas\(\)/)
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

  it('new root blocks are selected automatically so inspector opens properties', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const store = read('src/features/web-pages/stores/page-editor.store.ts')

    assert.match(store, /appendBlock/)
    assert.match(editor, /editorStore\.appendBlock\(createBlock\(payload\.tag\)\)/)
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
