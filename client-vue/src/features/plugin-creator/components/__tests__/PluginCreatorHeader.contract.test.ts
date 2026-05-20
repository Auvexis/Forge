import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreatorHeader contract', () => {
  it('command menu contains all MVP actions', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorCommandMenu.vue'), 'utf8')
    const labels = [
      'New Plugin',
      'Open Plugin',
      'Import Plugin',
      'Export ZIP',
      'Export Folder',
      'GitHub Export',
      'Plugin Settings',
      'Version History',
      'Advanced Code',
      'Discard Draft',
    ]

    for (const label of labels) {
      assert.match(source, new RegExp(label))
    }
  })

  it('header uses command menu and exposes Save and Publish actions', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorHeader.vue'), 'utf8')

    assert.match(source, /PluginCreatorCommandMenu/)
    assert.match(source, /Save/)
    assert.match(source, /Publish/)
  })
})
