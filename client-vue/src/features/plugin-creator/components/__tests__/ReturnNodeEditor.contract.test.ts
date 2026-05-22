import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentsDir = path.resolve('src/features/plugin-creator/components')

describe('ReturnNodeEditor contract', () => {
  it('edits return expression with quick values and preview', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'node-editors/ReturnNodeEditor.vue'),
      'utf8',
    )

    assert.match(source, /Return/)
    assert.match(source, /PluginCreatorExpressionInput/)
    assert.match(source, /valueExpression/)
    assert.match(source, /previous/)
    assert.match(source, /params/)
    assert.match(source, /\(\{ \.\.\.previous \}\)/)
    assert.match(source, /Final output preview/)
    assert.match(source, /updateNodeData/)
  })

  it('settings panel routes return nodes to ReturnNodeEditor', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'PluginCreatorNodeSettingsPanel.vue'),
      'utf8',
    )

    assert.match(source, /ReturnNodeEditor/)
    assert.match(source, /case 'return':\s*return ReturnNodeEditor/)
  })
})
