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
      'Import Plugin',
      'Export ZIP',
      'Export Folder',
      'GitHub Export',
      'Plugin Settings',
      'Advanced Code',
      'Discard Draft',
    ]

    for (const label of labels) {
      assert.match(source, new RegExp(label))
    }
  })

  it('command menu exposes plugin context and emits actionable menu events', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorCommandMenu.vue'), 'utf8')

    assert.match(source, /isDirty/)

    for (const eventName of [
      'newPlugin',
      'exportZip',
      'settings',
      'run',
      'publish',
      'discardDraft',
    ]) {
      assert.match(source, new RegExp(eventName))
    }
  })

  it('header forwards menu workflow events to the page', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorHeader.vue'), 'utf8')

    assert.match(source, /:active-blueprint="activeBlueprint"/)
    assert.match(source, /:blueprints="blueprints"/)
    assert.match(source, /:versions="versions"/)
    assert.match(source, /@new-plugin="emit\('newPlugin'\)"/)
    assert.match(source, /@open-plugin="emit\('openPlugin', \$event\)"/)
    assert.match(source, /@open-release-history="emit\('versions'\)"/)
    assert.match(source, /@rollback="emit\('rollback', \$event\)"/)
    assert.match(source, /@discard-draft="emit\('discardDraft'\)"/)
  })

  it('renders separate plugin and release dropdown controls beside the main menu', () => {
    const header = fs.readFileSync(path.join(componentDir, 'PluginCreatorHeader.vue'), 'utf8')
    const pluginDropdown = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorPluginDropdown.vue'),
      'utf8',
    )
    const releaseDropdown = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorReleaseDropdown.vue'),
      'utf8',
    )

    assert.match(header, /PluginCreatorCommandMenu/)
    assert.match(header, /PluginCreatorPluginDropdown/)
    assert.match(header, /PluginCreatorReleaseDropdown/)
    assert.match(pluginDropdown, /activePluginTitle/)
    assert.match(pluginDropdown, /openPlugin/)
    assert.match(releaseDropdown, /versions/)
    assert.match(releaseDropdown, /rollback/)
  })

  it('header only renders the plugin creator command menu trigger', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorHeader.vue'), 'utf8')

    assert.match(source, /PluginCreatorCommandMenu/)
    assert.doesNotMatch(source, /<h1/)
    assert.doesNotMatch(source, /plugin-creator-header__actions/)
    assert.doesNotMatch(source, /Settings/)
    assert.doesNotMatch(source, /History/)
    assert.doesNotMatch(source, /Run/)
    assert.doesNotMatch(source, /Save/)
    assert.doesNotMatch(source, /Publish/)
  })
})
