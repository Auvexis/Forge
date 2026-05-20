import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreatorAddItemPanel contract', () => {
  it('lists all MVP addable items', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorAddItemPanel.vue'), 'utf8')
    const labels = [
      'Method',
      'Input Field',
      'Credential Field',
      'Request',
      'Header',
      'Query Param',
      'JSON Body',
      'Response Mapper',
      'Error Mapper',
      'Output Field',
    ]

    for (const label of labels) {
      assert.match(source, new RegExp(label))
    }
  })
})
