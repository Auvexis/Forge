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
    assert.match(source, /BaseFloatingWindow/)
    assert.match(source, /readonly/)
    assert.match(source, /Generated method/)
    assert.match(source, /selectedMethodCode/)
    assert.match(source, /selectedNodeId/)
    assert.match(source, /hasPluginCreatorMethodSteps/)
    assert.match(source, /method block/)
  })

  it('delegates moving, resizing, minimizing, and persisted layout to BaseFloatingWindow', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorCodePreviewMinimap.vue'),
      'utf8',
    )

    assert.match(source, /storage-key="pluginCreator\.codePreviewMinimap\.layout"/)
    assert.match(source, /:default-width="520"/)
    assert.match(source, /:default-height="360"/)
    assert.doesNotMatch(source, /localStorage/)
    assert.doesNotMatch(source, /startResize/)
  })

  it('is mounted on the plugin creator page with the selected node id', () => {
    const pageSource = fs.readFileSync(path.resolve('src/app/pages/PluginCreatorPage.vue'), 'utf8')

    assert.match(pageSource, /PluginCreatorCodePreviewMinimap/)
    assert.match(pageSource, /:selected-node-id="selectedNodeId"/)
  })
})
