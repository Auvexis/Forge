import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreatorAddItemPanel contract', () => {
  it('lists only high-level addable canvas blocks', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorAddItemPanel.vue'), 'utf8')
    const labels = [
      'Method',
      'HTTP Request',
      'Response Mapping',
      'Error Mapping',
      'Code Block',
      'Output',
    ]

    for (const label of labels) {
      assert.match(source, new RegExp(label))
    }

    for (const label of ['Input Field', 'Credential Field', 'Header', 'Query Param', 'JSON Body']) {
      assert.doesNotMatch(source, new RegExp(label))
    }
  })

  it('uses the shared AddNodePanel layout contract inside AppPanel', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorAddItemPanel.vue'), 'utf8')

    assert.match(source, /class="add-node-panel"/)
    assert.match(source, /add-node-search-wrapper/)
    assert.match(source, /add-node-content/)
    assert.match(source, /onAddItem/)
    assert.doesNotMatch(source, /<aside/)
    assert.doesNotMatch(source, /open\?: boolean/)
  })
})
