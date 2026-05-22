import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('SwitchNodeEditor contract', () => {
  it('edits expression cases and stable handles', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'node-editors', 'SwitchNodeEditor.vue'),
      'utf8',
    )

    assert.match(source, /PluginCreatorExpressionInput/)
    assert.match(source, /Cases/)
    assert.match(source, /handle/)
    assert.match(source, /Add case/)
    assert.match(source, /Default branch/)
    assert.match(source, /updateNodeData/)
  })

  it('settings panel routes switch nodes to SwitchNodeEditor', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorNodeSettingsPanel.vue'),
      'utf8',
    )

    assert.match(source, /SwitchNodeEditor/)
    assert.match(source, /case 'switch':\s*return SwitchNodeEditor/s)
  })
})
