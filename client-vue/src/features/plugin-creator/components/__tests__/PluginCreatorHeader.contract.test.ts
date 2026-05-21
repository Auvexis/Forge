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

  it('command menu exposes plugin context and emits actionable menu events', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorCommandMenu.vue'), 'utf8')

    assert.match(source, /activeBlueprint/)
    assert.match(source, /blueprints/)
    assert.match(source, /activePluginTitle/)
    assert.match(source, /activePluginHandle/)
    assert.match(source, /isDirty/)

    for (const eventName of [
      'newPlugin',
      'openPlugin',
      'exportZip',
      'settings',
      'versions',
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
    assert.match(source, /@new-plugin="emit\('newPlugin'\)"/)
    assert.match(source, /@open-plugin="emit\('openPlugin', \$event\)"/)
    assert.match(source, /@export-zip="emit\('exportZip'\)"/)
    assert.match(source, /@discard-draft="emit\('discardDraft'\)"/)
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
