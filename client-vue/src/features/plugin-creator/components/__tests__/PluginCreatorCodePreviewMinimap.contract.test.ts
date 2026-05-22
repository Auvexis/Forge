import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreatorCodePreviewMinimap contract', () => {
  it('renders a read-only BaseCodeEditor for generated method preview', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorCodePreviewMinimap.vue'),
      'utf8',
    )

    assert.match(source, /BaseCodeEditor/)
    assert.match(source, /readonly/)
    assert.match(source, /Generated method/)
    assert.match(source, /methods\.ts/)
  })

  it('is mounted on the plugin creator page', () => {
    const pageSource = fs.readFileSync(path.resolve('src/app/pages/PluginCreatorPage.vue'), 'utf8')

    assert.match(pageSource, /PluginCreatorCodePreviewMinimap/)
  })
})
