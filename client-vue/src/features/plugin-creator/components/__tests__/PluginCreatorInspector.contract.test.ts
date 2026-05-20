import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentPath = path.resolve(
  'src/features/plugin-creator/components/PluginCreatorInspector.vue',
)
const pagePath = path.resolve('src/app/pages/PluginCreatorPage.vue')

describe('PluginCreatorInspector contract', () => {
  it('edits plugin, method, input, credential and request fields', () => {
    const source = fs.readFileSync(componentPath, 'utf8')

    for (const label of [
      'Plugin metadata',
      'Plugin name',
      'Plugin handle',
      'Plugin version',
      'Method metadata',
      'Method name',
      'Method handle',
      'Input field',
      'Credential field',
      'Request URL',
      'Request method',
      'Header name',
      'Query name',
      'JSON body',
    ]) {
      assert.match(source, new RegExp(label))
    }

    assert.match(source, /update-metadata/)
    assert.match(source, /update-node/)
    assert.match(source, /methodId/)
  })

  it('is mounted in the plugin creator page', () => {
    const page = fs.readFileSync(pagePath, 'utf8')

    assert.match(page, /PluginCreatorInspector/)
    assert.match(page, /selectedNodeId/)
  })
})
