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
    assert.doesNotMatch(source, /PageFloatingAddToolbar/)
    assert.doesNotMatch(source, /web-page-editor__add-page/)
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
    assert.doesNotMatch(bodyRule, /padding:\s*var\(--fabric-space-6\)/)
  })

  it('keeps viewport page dimensions real inside the editor canvas frame', () => {
    const source = read('src/features/web-pages/components/PageCanvas.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')
    const bodyRule = css.match(/\.web-page-canvas__body\s*{[\s\S]*?}/)?.[0] ?? ''

    assert.doesNotMatch(source, /normalizeEditorBodyStyles/)
    assert.doesNotMatch(source, /width: '960px'/)
    assert.doesNotMatch(editor, /width:\s*960/)
    assert.doesNotMatch(editor, /height:\s*1080/)
    assert.match(editor, /PAGE_CANVAS_WIDTH/)
    assert.match(editor, /PAGE_CANVAS_HEIGHT/)
    assert.match(bodyRule, /width:\s*100%/)
    assert.match(bodyRule, /height:\s*100%/)
    assert.doesNotMatch(bodyRule, /max-width:\s*960px/)
  })

  it('keeps selection frame aligned while selection chrome stays compact at any zoom', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const canvas = read('src/features/web-pages/components/PageCanvas.vue')
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const css = read('src/features/web-pages/pages.css')
    const selectionRule = css.match(/\.web-page-block-selection\s*{[\s\S]*?}/)?.[0] ?? ''

    assert.match(editor, /:canvas-zoom="pageCanvasViewport\.zoom"/)
    assert.match(canvas, /canvasZoom\?: number/)
    assert.match(canvas, /:canvas-zoom="canvasZoom"/)
    assert.match(renderer, /canvasZoom\?: number/)
    assert.match(renderer, /props\.canvasZoom/)
    assert.match(renderer, /selectionChromeStyle/)
    assert.match(renderer, /--web-page-selection-scale/)
    assert.match(renderer, /Math\.max\(0\.08,\s*scale\)/)
    assert.match(renderer, /props\.canvasZoom/)
    assert.match(css, /--web-page-selection-scale/)
    assert.match(css, /transform:\s*translateX\(-50%\)/)
    assert.doesNotMatch(css, /scale\(calc\(1 \/ var\(--web-page-selection-scale\)\)\)/)
    assert.match(selectionRule, /box-shadow:\s*0 0 0 1px var\(--web-page-selected-color\)/)
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
    assert.match(renderer, /@pointerdown\.stop="updateSelectionFrame"/)
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
    assert.match(source, /pattern-color="var\(--fabric-border\)"/)
    assert.doesNotMatch(source, /pattern-color="var\(--fabric-border-muted\)"/)
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
    assert.match(source, /@canvas-click="closePageCanvasContextMenu"/)
    assert.match(source, /@item-click="closePageCanvasContextMenu"/)
    assert.match(source, /@click\.stop/)
    assert.match(source, /web-page-canvas-context-menu/)
    assert.match(source, /Add page/)
    assert.match(source, /Duplicate page/)
    assert.match(source, /Delete page/)
    assert.match(css, /web-page-canvas-context-menu/)
  })

  it('workspace centers the page by css instead of a wide horizontal plane', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')
    const baseCanvasRule = css.match(/\.web-page-editor__base-canvas\s*{[\s\S]*?}/)?.[0] ?? ''
    const workspaceRule = css.match(/\.web-page-editor__workspace\s*{[\s\S]*?}/)?.[0] ?? ''

    assert.doesNotMatch(source, /FREE_CANVAS_WIDTH/)
    assert.doesNotMatch(source, /FREE_CANVAS_HEIGHT/)
    assert.doesNotMatch(source, /INITIAL_CANVAS_WIDTH/)
    assert.doesNotMatch(css, /--web-page-free-canvas-width/)
    assert.doesNotMatch(css, /min-width:\s*2400px/)
    assert.match(workspaceRule, /overflow:\s*hidden/)
    assert.match(workspaceRule, /padding-bottom:\s*var\(--web-page-canvas-bottom\)/)
    assert.match(baseCanvasRule, /width:\s*100%/)
    assert.match(baseCanvasRule, /height:\s*100%/)
    assert.match(baseCanvasRule, /min-width:\s*0/)
    assert.doesNotMatch(baseCanvasRule, /min-height:\s*1800px/)
  })

  it('canvas respects side panels and the bottom dataflow panel', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')
    const workspaceRule = css.match(/\.web-page-editor__workspace\s*{[\s\S]*?}/)?.[0] ?? ''

    assert.match(css, /web-page-editor--left-collapsed \.web-page-editor__workspace/)
    assert.match(css, /web-page-editor--right-collapsed \.web-page-editor__workspace/)
    assert.match(workspaceRule, /margin:\s*0/)
    assert.match(workspaceRule, /padding-left:\s*calc\(var\(--web-page-rail-width\) \+ var\(--web-page-left-panel-width\)\)/)
    assert.match(workspaceRule, /padding-right:\s*var\(--web-page-right-panel-width\)/)
    assert.match(workspaceRule, /padding-bottom:\s*var\(--web-page-canvas-bottom\)/)
    assert.match(source, /--web-page-canvas-bottom/)
    assert.match(source, /positionInitialCanvas/)
  })

  it('centers the initial canvas in the workspace viewport', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /positionInitialCanvas/)
    assert.doesNotMatch(source, /INITIAL_CANVAS_WIDTH/)
    assert.match(source, /workspaceRef\.value\?\.clientWidth/)
    assert.match(source, /pageCanvasViewport\.value = \{/)
    assert.match(source, /\(workspaceWidth - PAGE_CANVAS_WIDTH\) \/ 2 - PAGE_CANVAS_X/)
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

  it('canvas blocks do not expose contextual toolbars', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.doesNotMatch(renderer, /web-page-block-toolbar/)
    assert.match(renderer, /web-page-block-selection__actions/)
  })

  it('new root blocks are selected automatically so inspector opens properties', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const store = read('src/features/web-pages/stores/page-editor.store.ts')

    assert.match(store, /appendBlock/)
    assert.match(editor, /editorStore\.appendBlock\(createBlock\(payload\.tag,\s*undefined,\s*payload\.preset\)\)/)
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
