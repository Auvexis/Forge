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

  it('style panel uses controls for allowlisted properties', () => {
    const source = read('src/features/web-pages/components/BlockStylePanel.vue')
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')
    const allowlist = read('src/features/web-pages/utils/styleAllowlist.ts')

    assert.match(source, /padding/)
    assert.match(source, /width/)
    assert.match(source, /height/)
    assert.match(source, /margin/)
    assert.match(source, /border/)
    assert.match(source, /fontSize/)
    assert.match(source, /backgroundColor/)
    assert.match(source, /BaseColorPicker/)
    assert.match(source, /sanitizeStyles/)
    assert.match(renderer, /:style="block\.styles"/)
    assert.match(allowlist, /minWidth/)
    assert.match(allowlist, /maxHeight/)
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
    assert.match(advanced, /<summary>Attributes<\/summary>/)
    assert.match(advanced, /<summary>Custom CSS<\/summary>/)
    assert.match(advanced, /<summary>Custom JS<\/summary>/)
  })

  it('inspector panel does not render duplicate and delete block actions', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')

    assert.doesNotMatch(editor, /<BlockToolbar/)
    assert.doesNotMatch(editor, /deleteSelectedBlock|duplicateSelectedBlock/)
  })

  it('renderer injects custom css outside the vue template side-effect tags', () => {
    const renderer = read('src/features/web-pages/components/BlockRenderer.vue')

    assert.match(renderer, /document\.createElement\('style'\)/)
    assert.match(renderer, /customCssRule/)
    assert.doesNotMatch(renderer, /<style\s+v-if/)
  })

  it('action panel supports form submit, workflow trigger, open URL actions', () => {
    const source = read('src/features/web-pages/components/BlockActionPanel.vue')
    assert.match(source, /submitForm/)
    assert.match(source, /triggerWorkflow/)
    assert.match(source, /openUrl/)
  })

  it('image and link inputs validate URL input', () => {
    const content = read('src/features/web-pages/components/BlockContentPanel.vue')
    const action = read('src/features/web-pages/components/BlockActionPanel.vue')
    assert.match(content, /isSafeUrl/)
    assert.match(action, /isSafeUrl/)
  })
})
