import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const settingsSource = readFileSync(
  fileURLToPath(new URL('../AppGlobalSettings.vue', import.meta.url)),
  'utf8',
)
const stylesSource = readFileSync(
  fileURLToPath(new URL('../styles/global-settings.css', import.meta.url)),
  'utf8',
)

describe('global settings nav contract', () => {
  it('keeps the active nav item visible over BaseButton ghost styles', () => {
    assert.match(settingsSource, /'gs-nav__item--active': activeTab === tab\.id/)
    assert.match(stylesSource, /\.gs-nav \.base-button\.gs-nav__item--active/)
    assert.match(stylesSource, /\.gs-nav \.base-button\.gs-nav__item--active:hover/)
    assert.match(stylesSource, /background:\s*var\(--fabric-button-ghost-active\)/)
    assert.match(stylesSource, /color:\s*var\(--fabric-button-ghost-active-text\)/)
  })
})
