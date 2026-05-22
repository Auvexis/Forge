import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentsDir = path.resolve('src/features/plugin-creator/components')

describe('ForEachNodeEditor contract', () => {
  it('edits array expression item variable and branch hints', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'node-editors/ForEachNodeEditor.vue'),
      'utf8',
    )

    assert.match(source, /ForEach/)
    assert.match(source, /PluginCreatorExpressionInput/)
    assert.match(source, /arrayExpression/)
    assert.match(source, /itemVariable/)
    assert.doesNotMatch(source, /<PluginCreatorVariableTree/)
    assert.match(source, /Body branch/)
    assert.match(source, /Item variable is required/)
    assert.match(source, /updateNodeData/)
  })

  it('settings panel routes forEach nodes to ForEachNodeEditor', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'PluginCreatorNodeSettingsPanel.vue'),
      'utf8',
    )

    assert.match(source, /ForEachNodeEditor/)
    assert.match(source, /case 'forEach':\s*return ForEachNodeEditor/)
  })
})
