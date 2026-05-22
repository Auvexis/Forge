import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentsDir = path.resolve('src/features/plugin-creator/components')

describe('JsonTransformNodeEditor contract', () => {
  it('edits expression output name and preview without eval', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'node-editors/JsonTransformNodeEditor.vue'),
      'utf8',
    )

    assert.match(source, /JSON Transform/)
    assert.match(source, /PluginCreatorExpressionInput/)
    assert.match(source, /outputName/)
    assert.match(source, /Live preview/)
    assert.match(source, /No eval/)
    assert.match(source, /updateNodeData/)
  })

  it('settings panel routes jsonTransform nodes to JsonTransformNodeEditor', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'PluginCreatorNodeSettingsPanel.vue'),
      'utf8',
    )

    assert.match(source, /JsonTransformNodeEditor/)
    assert.match(source, /case 'jsonTransform':\s*return JsonTransformNodeEditor/)
  })
})
