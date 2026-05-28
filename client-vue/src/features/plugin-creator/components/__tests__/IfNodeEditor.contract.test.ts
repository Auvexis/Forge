import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('IfNodeEditor contract', () => {
  it('edits condition with expression tools and branch hints', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'node-editors', 'IfNodeEditor.vue'),
      'utf8',
    )

    assert.match(source, /PluginCreatorExpressionInput/)
    assert.match(source, /Condition/)
    assert.match(source, /BaseBadge/)
    assert.match(source, /Then \(true\)/)
    assert.match(source, /Else \(false\)/)
    assert.doesNotMatch(source, /previous exists/i)
    assert.doesNotMatch(source, /enabled param/i)
    assert.doesNotMatch(source, /success status/i)
    assert.match(source, /updateNodeData/)
  })

  it('settings panel routes if nodes to IfNodeEditor', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorNodeSettingsPanel.vue'),
      'utf8',
    )

    assert.match(source, /IfNodeEditor/)
    assert.match(source, /case 'if':\s*return IfNodeEditor/s)
  })
})
