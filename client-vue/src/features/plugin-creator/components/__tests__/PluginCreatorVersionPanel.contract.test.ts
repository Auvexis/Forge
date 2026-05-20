import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentPath = path.resolve(
  'src/features/plugin-creator/components/PluginCreatorVersionPanel.vue',
)
const pagePath = path.resolve('src/app/pages/PluginCreatorPage.vue')

describe('PluginCreatorVersionPanel contract', () => {
  it('lists snapshots and releases and emits rollback', () => {
    const source = fs.readFileSync(componentPath, 'utf8')

    for (const label of ['Version History', 'Snapshots', 'Releases', 'Rollback']) {
      assert.match(source, new RegExp(label))
    }

    assert.match(source, /versions\??\.snapshots/)
    assert.match(source, /versions\??\.releases/)
    assert.match(source, /rollback/)
  })

  it('is mounted in the plugin creator page', () => {
    const page = fs.readFileSync(pagePath, 'utf8')

    assert.match(page, /PluginCreatorVersionPanel/)
    assert.match(page, /loadVersions/)
    assert.match(page, /rollbackToSnapshot/)
  })
})
