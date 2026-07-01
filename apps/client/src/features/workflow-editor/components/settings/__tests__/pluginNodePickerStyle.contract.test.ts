import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const settingsDirectory = new URL('../', import.meta.url)

test('add node panel forwards plugin manifest styles to picker items', () => {
  const source = readFileSync(new URL('AddNodePanel.vue', settingsDirectory), 'utf8')

  assert.doesNotMatch(source, /item\.kind === 'plugin' \? undefined : item\.preset\.style/)
  assert.match(source, /item\.plugin\.manifest\.metadata\.style/)
})

test('global add node panel styles plugin icons from manifest metadata', () => {
  const source = readFileSync(new URL('GlobalAddNodePanel.vue', settingsDirectory), 'utf8')

  assert.match(source, /pluginStyle\(selectedPlugin\)/)
  assert.ok((source.match(/pluginStyle\(plugin\)/g) ?? []).length >= 2)
  assert.match(source, /metadata\.style\?\.bgColor/)
  assert.match(source, /metadata\.style\?\.borderColor/)
  assert.match(source, /metadata\.style\?\.iconColor/)
})
