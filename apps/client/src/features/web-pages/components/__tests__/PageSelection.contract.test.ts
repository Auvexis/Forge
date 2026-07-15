import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('page selection contract', () => {
  it('selected blocks expose four corner resize handles and a live size indicator', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')

    for (const corner of ['north-west', 'north-east', 'south-west', 'south-east']) {
      assert.match(renderer, new RegExp(corner))
    }
    assert.doesNotMatch(renderer, /web-page-block-resize__indicator/)
    assert.match(renderer, /selectionFrameStyle/)
    assert.match(renderer, /offsetWidth/)
    assert.match(renderer, /offsetHeight/)
    assert.match(renderer, /scale: rect\.width \/ Math\.max\(element\.offsetWidth, 1\)/)
    assert.match(renderer, /\(event\.clientX - resizeState\.startX\) \/ resizeState\.scale/)
    assert.match(renderer, /resize-block/)
    assert.match(editor, /patchBlock/)
    assert.match(css, /web-page-block-resize__handle/)
    assert.match(css, /outline:\s*1px solid var\(--web-page-selected-color\)/)
    assert.match(css, /outline-offset:\s*0/)
    assert.doesNotMatch(css, /outline-offset:\s*3px/)
    assert.doesNotMatch(css, /@keyframes web-page-selected-dash/)
  })

  it('selected blocks expose editable id and duplicate delete controls', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(renderer, /web-page-block-selection__id/)
    assert.match(renderer, /editingBlockId/)
    assert.match(renderer, /rename-block/)
    assert.match(renderer, /icon-left="copy"/)
    assert.match(renderer, /icon-left="trash-2"/)
    assert.match(renderer, /@pointerdown\.stop/)
    assert.match(editor, /editorStore\.renameBlockId/)
    assert.match(css, /--web-page-selected-color:\s*#3b82f6/)
    assert.match(css, /web-page-block-selection__actions/)
  })

  it('canvas supports ctrl and command multi selection with one group selection box', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const canvas = read('src/features/web-pages/components/PageCanvas.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const groupOverlay = read('src/features/web-pages/components/PageSelectionGroupOverlay.vue')

    assert.match(renderer, /selectedBlockIds\?: string\[\]/)
    assert.match(renderer, /isSelectedBlock/)
    assert.match(renderer, /isPrimarySelectedBlock/)
    assert.match(renderer, /isGroupSelectedBlock/)
    assert.match(renderer, /event\.ctrlKey \|\| event\.metaKey/)
    assert.match(canvas, /selectedBlockIds\?: string\[\]/)
    assert.match(canvas, /select: \[payload: \{ blockId: string; additive\?: boolean \}\]/)
    assert.match(editor, /:selected-block-ids="item\.id === pagesStore\.activePage\?\.id \? editorStore\.selectedBlockIds : \[\]"/)
    assert.match(editor, /payload\.additive/)
    assert.match(editor, /editorStore\.toggleBlockSelection/)
    assert.match(editor, /PageSelectionGroupOverlay/)
    assert.match(groupOverlay, /selectedBlockIds\.length > 1/)
    assert.match(groupOverlay, /getBoundingClientRect/)
  })

  it('inspector applies batch changes only from the Style tab', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(editor, /function patchActiveBlock/)
    assert.match(editor, /function patchSelectedStyle/)
    assert.match(editor, /@patch="patchActiveBlock"/)
    assert.match(editor, /@patch="patchSelectedStyle"/)
    assert.doesNotMatch(editor, /Editing \{\{ editorStore\.selectedBlockIds\.length \}\} selected elements/)
  })

  it('selected blocks expose a premium contextual toolbar and persistent metrics', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const css = read('src/features/web-pages/pages.css')
    const metricRule = css.match(/\.web-page-block-selection__metric\s*{\s*right:\s*0;[\s\S]*?}/)?.[0] ?? ''
    const ratioRule = css.match(/\.web-page-block-selection__ratio\s*{\s*left:\s*0;[\s\S]*?}/)?.[0] ?? ''

    assert.match(renderer, /web-page-block-context-toolbar/)
    assert.match(renderer, /contextToolbarLabel/)
    assert.match(renderer, /selectionSizeLabel/)
    assert.match(renderer, /web-page-block-selection__metric/)
    assert.match(renderer, /web-page-block-selection__ratio/)
    assert.match(renderer, /icon-left="settings-2"/)
    assert.match(css, /web-page-block-context-toolbar/)
    assert.match(css, /web-page-block-selection__metric/)
    assert.match(css, /web-page-block-selection__ratio/)
    assert.match(metricRule, /bottom:\s*-38px/)
    assert.match(ratioRule, /bottom:\s*-38px/)
    assert.doesNotMatch(css, /web-page-block-resize__indicator/)
  })

  it('selection chrome renders outside block overflow and owns pointer events', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const canvas = read('src/features/web-pages/components/PageCanvas.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const css = read('src/features/web-pages/pages.css')
    const selectionRule = css.match(/\.web-page-block-selection\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    assert.match(renderer, /<Teleport to="body">/)
    assert.match(renderer, /selectionPortalStyle/)
    assert.match(renderer, /getBoundingClientRect\(\)/)
    assert.match(renderer, /position:\s*'fixed'/)
    assert.match(editor, /:canvas-viewport="pageCanvasViewport"/)
    assert.match(canvas, /canvasViewport\?: BaseCanvasViewport/)
    assert.match(canvas, /:canvas-viewport="canvasViewport"/)
    assert.match(renderer, /canvasViewport\?: BaseCanvasViewport/)
    assert.match(renderer, /props\.canvasViewport\?\.x/)
    assert.match(renderer, /props\.canvasViewport\?\.y/)
    assert.match(renderer, /props\.canvasViewport\?\.zoom/)
    assert.match(renderer, /nextTick\(updateSelectionFrame\)/)
    assert.match(renderer, /@pointerdown\.stop\.prevent/)
    assert.match(renderer, /@mousedown\.stop\.prevent/)
    assert.match(css, /\.web-page-block-selection\s*\{[\s\S]*position:\s*fixed/)
    assert.match(selectionRule, /--web-page-selected-color:\s*#3b82f6/)
    assert.match(selectionRule, /--web-page-motion-medium:\s*180ms/)
    assert.match(selectionRule, /--fabric-bg-surface:\s*#ffffff/)
    assert.match(css, /\.web-page-block-leave-active \.web-page-block-selection\s*\{[\s\S]*display:\s*none/)
  })

  it('selection chrome stays compact and uses the selected blue surface', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(renderer, /web-page-block-selection__chrome/)
    assert.match(renderer, /const selectionChromeOffset/)
    assert.match(renderer, /:style="selectionChromeStyle"/)
    assert.doesNotMatch(renderer, /contextToolbarStyle/)
    assert.doesNotMatch(renderer, /selectionActionsStyle/)
    assert.match(css, /\.web-page-block-selection__chrome\s*\{[\s\S]*display:\s*inline-flex/)
    assert.match(css, /\.web-page-block-selection__chrome\s*\{[\s\S]*align-items:\s*center/)
    assert.match(css, /\.web-page-block-selection__chrome\s*\{[\s\S]*width:\s*max-content/)
    assert.match(css, /\.web-page-block-selection__chrome\s*\{[\s\S]*background:\s*var\(--web-page-selected-color\)/)
    assert.match(css, /\.web-page-block-selection__chrome\s*\{[\s\S]*transform:\s*translateX\(-50%\)/)
    assert.doesNotMatch(css, /\.web-page-block-selection__chrome\s*\{[\s\S]*scale\(calc\(1 \/ var\(--web-page-selection-scale\)\)\)/)
    assert.doesNotMatch(css, /\.web-page-block-resize__handle\s*\{[\s\S]*scale\(calc\(1 \/ var\(--web-page-selection-scale\)\)\)/)
    assert.doesNotMatch(css, /\.web-page-block-selection__metric,\n\.web-page-block-selection__ratio\s*\{[\s\S]*scale\(calc\(1 \/ var\(--web-page-selection-scale\)\)\)/)
    const toolbarRule = css.match(/\.web-page-block-context-toolbar\s*\{[^}]*\}/)?.[0] ?? ''
    assert.doesNotMatch(toolbarRule, /background:\s*var\(--web-page-selected-color\)/)
    assert.match(css, /border:\s*1px solid color-mix\(in srgb, var\(--web-page-selected-color\) 78%, #ffffff\)/)
  })

  it('selection chrome has premium motion polish with reduced motion fallback', () => {
    const css = read('src/features/web-pages/pages.css')

    assert.match(css, /--web-page-motion-fast/)
    assert.match(css, /--web-page-motion-medium/)
    assert.match(css, /--web-page-ease-premium/)
    assert.match(css, /@keyframes web-page-selection-pop/)
    assert.match(css, /@keyframes web-page-toolbar-pop/)
    assert.match(css, /@keyframes web-page-chip-pop/)
    assert.match(css, /\.web-page-block-selection\s*\{[\s\S]*animation:\s*web-page-selection-pop/)
    assert.match(css, /\.web-page-block-context-toolbar\s*\{[\s\S]*animation:\s*web-page-toolbar-pop/)
    assert.match(css, /\.web-page-block-context-toolbar__action:active/)
    assert.match(css, /prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none !important/)
  })

  it('context toolbar exposes quick actions based on selected block type', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(renderer, /contextToolbarActions/)
    assert.match(renderer, /applyContextToolbarAction/)
    assert.match(renderer, /web-page-block-context-toolbar__group/)
    assert.match(renderer, /textToolbarActions/)
    assert.match(renderer, /mediaToolbarActions/)
    assert.match(renderer, /containerToolbarActions/)
    assert.match(renderer, /patch-block/)
    assert.match(renderer, /isContextToolbarActionActive/)
    assert.match(renderer, /withoutStyleKeys/)
    assert.match(renderer, /aria-pressed/)
    assert.match(renderer, /web-page-block-context-toolbar__action--active/)
    assert.match(css, /web-page-block-context-toolbar__group/)
    assert.match(css, /web-page-block-context-toolbar__action/)
    assert.match(css, /web-page-block-context-toolbar__action--active/)
  })

  it('selected blocks keep resize handle state without page-edge distance indicators', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const css = read('src/features/web-pages/pages.css')

    assert.match(renderer, /activeResizeCorner/)
    assert.match(renderer, /web-page-block-resize__handle--active/)
    assert.match(css, /web-page-block-resize__handle--active/)
    assert.doesNotMatch(renderer, /selectionDistanceLabels/)
    assert.doesNotMatch(renderer, /distanceLabelStyle/)
    assert.doesNotMatch(renderer, /web-page-block-selection__distance/)
    assert.doesNotMatch(css, /web-page-block-selection__distance/)
  })

  it('double clicking a canvas block opens its Blueprint instead of inline text editing', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const canvas = read('src/features/web-pages/components/PageCanvas.vue')

    assert.match(renderer, /handleBlockDoubleClick/)
    assert.match(renderer, /open-blueprint/)
    assert.match(canvas, /@open-blueprint/)
    assert.match(editor, /handleOpenBlockBlueprint/)
    assert.match(editor, /pageBlueprintWorkbench\.openBlueprint/)
    assert.doesNotMatch(renderer, /contenteditable/)
    assert.doesNotMatch(renderer, /commitInlineEdit/)
  })
  it('canvas can select the body independently from blocks', () => {
    const source = read('src/features/web-pages/components/PageCanvas.vue')

    assert.match(source, /select-body/)
    assert.match(source, /@click\.self/)
    assert.match(source, /suppressBodySelectionAfterResize/)
    assert.match(source, /suppressBodySelectionUntil/)
    assert.match(source, /Date\.now\(\) < suppressBodySelectionUntil\.value/)
    assert.doesNotMatch(source, /@pointerdown\.stop/)
  })

  it('empty canvas click clears selected block before selecting the body', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')
    const selectCanvasBody = source.match(/function selectCanvasBody\(pageId: string\) \{[\s\S]*?\n\}/)?.[0] ?? ''

    assert.match(selectCanvasBody, /editorStore\.selectedTarget\.type === 'block'/)
    assert.match(selectCanvasBody, /editorStore\.clearSelection\(\)/)
    assert.match(selectCanvasBody, /pageCanvasSelection\.value = \[\]/)
    assert.match(selectCanvasBody, /return/)
    assert.match(selectCanvasBody, /editorStore\.selectBody\(\)/)
  })

  it('editor store tracks page, body, block and empty selection targets', () => {
    const source = read('src/features/web-pages/stores/page-editor.store.ts')

    assert.match(source, /PageEditorSelection/)
    assert.match(source, /type: 'page'/)
    assert.match(source, /type: 'body'/)
    assert.match(source, /type: 'block'/)
    assert.match(source, /type: 'none'/)
    assert.match(source, /selectPage/)
    assert.match(source, /selectBody/)
  })

  it('page editor renders the correct inspector for the selected target', () => {
    const source = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /PageMetadataPanel/)
    assert.match(source, /editorStore\.selectedTarget\.type === 'page'/)
    assert.match(source, /editorStore\.selectedTarget\.type === 'body'/)
    assert.match(source, /editorStore\.selectedTarget\.type === 'block'/)
    assert.match(source, /@select-body/)
  })

  it('page selection uses inspector tabs with page metadata in Content', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const metadata = read('src/features/web-pages/components/PageMetadataPanel.vue')
    const types = read('src/features/web-pages/types/page.types.ts')

    assert.match(editor, /pageInspectorTab/)
    assert.match(editor, /pageInspectorTabs/)
    assert.match(editor, /v-if="pageInspectorTab === 'content'"/)
    assert.match(editor, /v-if="pageInspectorTab === 'style'"/)
    assert.match(editor, /v-if="pageInspectorTab === 'advanced'"/)
    assert.match(metadata, /Meta title/)
    assert.match(metadata, /Meta description/)
    assert.match(metadata, /Favicon/)
    assert.match(metadata, /URL/)
    assert.match(metadata, /patchField\('metaTitle'/)
    assert.match(metadata, /patchField\('metaDescription'/)
    assert.match(metadata, /patchField\('faviconUrl'/)
    assert.match(metadata, /patchField\('publicPath'/)
    assert.match(types, /metaTitle\?: string/)
    assert.match(types, /metaDescription\?: string/)
    assert.match(types, /faviconUrl\?: string/)
    assert.match(types, /publicPath\?: string/)
  })

  it('page metadata panel edits page-level fields without saving directly', () => {
    const source = read('src/features/web-pages/components/PageMetadataPanel.vue')

    assert.match(source, /BaseInput/)
    assert.match(source, /title/)
    assert.match(source, /slug/)
    assert.match(source, /patch/)
    assert.doesNotMatch(source, /pagesApi|saveActivePage|fetch\(/)
  })

  it('page metadata panel uses base inputs and emits page patches', () => {
    const source = read('src/features/web-pages/components/PageMetadataPanel.vue')

    assert.match(source, /BaseInput/)
    assert.match(source, /patchField\('title'/)
    assert.match(source, /patchField\('slug'/)
  })
})
