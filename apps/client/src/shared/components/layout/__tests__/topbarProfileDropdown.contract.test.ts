import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('topbar profile trigger opens the base profile dropdown', () => {
  const source = read('src/shared/components/layout/AppTopbar.vue')

  assert.match(source, /BaseProfileDropdown/)
  assert.match(source, /handleProfileDropdownOpen/)
  assert.match(source, /settingsStore\.openAuvexis\(\)/)
  assert.match(source, /emit\('switch-profile'\)/)
  assert.match(source, /emit\('logout'\)/)
})

test('base profile dropdown exposes theme tokens and Auvexis states', () => {
  const source = read('src/shared/components/base/BaseProfileDropdown.vue')

  assert.match(source, /fabric-base-profile-dropdown/)
  assert.match(source, /Connect Auvexis/)
  assert.match(source, /auvexisAccount/)
  assert.match(source, /base-profile-dropdown__section/)
})

test('fabric themes define profile dropdown customization tokens', () => {
  const light = JSON.parse(read('src/themes/json/light.json'))
  const dark = JSON.parse(read('src/themes/json/dark.json'))

  for (const theme of [light, dark]) {
    assert.equal(typeof theme.tokens['baseProfileDropdown.bg'], 'string')
    assert.equal(typeof theme.tokens['baseProfileDropdown.item.hover.bg'], 'string')
    assert.equal(typeof theme.tokens['baseProfileDropdown.connect.border'], 'string')
  }
})
