import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('block inspector contract', () => {
  it('selected block shows content fields by tag', () => {
    const source = read('src/features/web-pages/components/BlockContentPanel.vue')
    assert.match(source, /block\.tag/)
    assert.match(source, /text/)
    assert.match(source, /image/)
    assert.match(source, /link/)
  })

  it('content panel exposes common and special element fields', () => {
    const source = read('src/features/web-pages/components/BlockContentPanel.vue')

    assert.match(source, />Content</)
    assert.match(source, /buttonTypeOptions/)
    assert.match(source, /inputTypeOptions/)
    assert.match(source, /targetOptions/)
    assert.match(source, /mediaBooleanOptions/)
    assert.match(source, /block\.tag === 'button'[\s\S]*type/)
    assert.match(source, /block\.tag === 'button'[\s\S]*Action/)
    assert.match(source, /block\.tag === 'button'[\s\S]*submitForm/)
    assert.match(source, /block\.tag === 'input'[\s\S]*placeholder/)
    assert.match(source, /block\.tag === 'audio'[\s\S]*Audio URL/)
    assert.match(source, /block\.tag === 'video'[\s\S]*Poster URL/)
    assert.match(source, /block\.tag === 'youtube'[\s\S]*Youtube URL/)
  })

  it('inspector selects use icon-only segmented controls instead of BaseSelect', () => {
    const content = read('src/features/web-pages/components/BlockContentPanel.vue')
    const style = read('src/features/web-pages/components/BlockStylePanel.vue')

    assert.match(content, /BaseSegmentedSelect/)
    assert.match(style, /BaseSegmentedSelect/)
    assert.doesNotMatch(content, /BaseSelect/)
    assert.doesNotMatch(style, /BaseSelect/)
    assert.match(content, /label: ''/)
    assert.match(style, /label: ''/)
  })

  it('image block content supports uploading a site asset', () => {
    const panel = read('src/features/web-pages/components/BlockContentPanel.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.match(panel, /upload-image/)
    assert.match(panel, /type="file"/)
    assert.match(panel, /Upload image/)
    assert.match(editor, /uploadImageForSelectedBlock/)
    assert.match(editor, /sitesStore\.uploadAsset/)
    assert.match(renderer, /props\.block\.tag === 'image'\) return 'img'/)
    assert.match(renderer, /props\.src/)
    assert.match(renderer, /API_BASE_URL/)
    assert.match(renderer, /resolveMediaUrl/)
  })

  it('style panel uses controls for allowlisted properties', () => {
    const source = read('src/features/web-pages/components/BlockStylePanel.vue')
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const allowlist = read('src/features/web-pages/utils/styleAllowlist.ts')

    assert.match(source, /padding/)
    assert.match(source, /width/)
    assert.match(source, /height/)
    assert.match(source, /margin/)
    assert.match(source, /border/)
    assert.match(source, /fontFamily/)
    assert.match(source, /fontSize/)
    assert.match(source, /backgroundColor/)
    assert.match(source, /BaseColorPicker/)
    assert.match(source, /BaseSegmentedSelect/)
    assert.match(source, /sanitizeStyles/)
    assert.match(renderer, /:style="resolvedBlockStyles"/)
    assert.match(renderer, /\.\.\.props\.block\.styles/)
    assert.match(allowlist, /minWidth/)
    assert.match(allowlist, /maxHeight/)
    assert.match(allowlist, /fontFamily/)
  })

  it('style panel groups controls into small sections and exposes extra css options', () => {
    const source = read('src/features/web-pages/components/BlockStylePanel.vue')
    const styles = read('src/features/web-pages/pages.css')
    const allowlist = read('src/features/web-pages/utils/styleAllowlist.ts')

    assert.match(source, /web-page-style-section/)
    assert.match(source, />Layout</)
    assert.match(source, />Typography</)
    assert.match(source, />Background</)
    assert.match(source, />Border</)
    assert.match(source, /overflow/)
    assert.match(source, /objectFit/)
    assert.match(source, /textTransform/)
    assert.match(source, /backgroundSize/)
    assert.match(allowlist, /overflow/)
    assert.match(allowlist, /objectFit/)
    assert.match(allowlist, /textTransform/)
    assert.match(allowlist, /backgroundSize/)
    assert.match(styles, /\.web-page-style-section h5 \{[\s\S]*color: var\(--sailor-text-primary\)/)
  })

  it('inspector exposes element identity, attributes, and free custom code editors', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const advanced = read('src/features/web-pages/components/BlockAdvancedPanel.vue')

    assert.match(editor, /<BlockAdvancedPanel/)
    assert.match(advanced, /BaseCodeEditor/)
    assert.match(advanced, /elementId/)
    assert.match(advanced, /className/)
    assert.match(advanced, /attributes/)
    assert.match(advanced, /customCss/)
    assert.match(advanced, /customJs/)
    assert.match(advanced, /language="css"/)
    assert.match(advanced, /language="javascript"/)
    assert.doesNotMatch(advanced, /sanitizeCustomCss|sanitizeClassName/)
  })

  it('advanced dev code areas are collapsible details sections', () => {
    const advanced = read('src/features/web-pages/components/BlockAdvancedPanel.vue')

    assert.match(advanced, /<details[^>]*class="web-page-advanced-panel__section"/)
    assert.match(advanced, /LucideIcon/)
    assert.match(advanced, /name="braces"/)
    assert.match(advanced, /name="palette"/)
    assert.match(advanced, /name="code-2"/)
    assert.match(advanced, /name="chevron-down"/)
    assert.match(advanced, />Attributes</)
    assert.match(advanced, />Custom CSS</)
    assert.match(advanced, />Custom JS</)
  })

  it('inspector panel does not render duplicate and delete block actions', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.doesNotMatch(editor, /<BlockToolbar/)
    assert.doesNotMatch(editor, /deleteSelectedBlock|duplicateSelectedBlock/)
  })

  it('block inspector uses premium tabs for content style and advanced panels', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const styles = read('src/features/web-pages/pages.css')

    assert.match(editor, /blockInspectorTab/)
    assert.match(editor, /blockInspectorTabs/)
    assert.match(editor, /Content/)
    assert.match(editor, /Style/)
    assert.match(editor, /Advanced/)
    assert.match(editor, /v-if="blockInspectorTab === 'content'"/)
    assert.match(editor, /v-if="blockInspectorTab === 'style'"/)
    assert.match(editor, /v-if="blockInspectorTab === 'advanced'"/)
    assert.match(styles, /web-page-editor__inspector-tabs/)
  })

  it('renderer injects custom css outside the vue template side-effect tags', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.match(renderer, /document\.createElement\('style'\)/)
    assert.match(renderer, /customCssRule/)
    assert.doesNotMatch(renderer, /<style\s+v-if/)
  })

  it('selection box resize exposes alignment guides and snap helpers', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const styles = read('src/features/web-pages/pages.css')

    assert.match(renderer, /activeResizeGuides/)
    assert.match(renderer, /snapResizeToAlignment/)
    assert.match(renderer, /resizeBounds/)
    assert.match(renderer, /maxWidth: resizeState\.maxWidth/)
    assert.match(renderer, /bounds\?\.maxWidth/)
    assert.match(renderer, /resizeGuideStyle/)
    assert.match(styles, /web-page-block-alignment-guide/)
  })

  it('button content panel supports form submit, workflow trigger, open URL actions', () => {
    const source = read('src/features/web-pages/components/BlockContentPanel.vue')
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.match(source, /submitForm/)
    assert.match(source, /triggerWorkflow/)
    assert.match(source, /openUrl/)
    assert.match(source, /BaseSegmentedSelect/)
    assert.doesNotMatch(editor, /<BlockActionPanel/)
    assert.doesNotMatch(editor, /import BlockActionPanel/)
  })

  it('image and link inputs validate URL input', () => {
    const content = read('src/features/web-pages/components/BlockContentPanel.vue')
    assert.match(content, /isSafeUrl/)
  })
})
