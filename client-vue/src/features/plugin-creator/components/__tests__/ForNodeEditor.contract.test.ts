import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentsDir = path.resolve('src/features/plugin-creator/components')

describe('ForNodeEditor contract', () => {
  it('supports range and iterable modes with item variable warnings', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'node-editors/ForNodeEditor.vue'),
      'utf8',
    )

    assert.match(source, /For/)
    assert.match(source, /range/)
    assert.match(source, /iterable/)
    assert.match(source, /itemVariable/)
    assert.match(source, /fromExpression/)
    assert.match(source, /toExpression/)
    assert.match(source, /iterableExpression/)
    assert.match(source, /Body branch/)
    assert.match(source, /Item variable is required/)
  })

  it('settings panel routes for nodes to ForNodeEditor', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'PluginCreatorNodeSettingsPanel.vue'),
      'utf8',
    )

    assert.match(source, /ForNodeEditor/)
    assert.match(source, /case 'for':\s*return ForNodeEditor/)
  })
})
