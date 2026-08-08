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

  it('exposes desktop system and update preferences in their own tab', () => {
    assert.match(settingsSource, /System\/Updates/)
    assert.match(settingsSource, /desktop_minimize_to_tray/)
    assert.match(settingsSource, /desktop_close_to_tray/)
    assert.match(settingsSource, /desktop_open_at_login/)
    assert.match(settingsSource, /updates_auto_check/)
    assert.match(settingsSource, /updates_auto_install/)
    assert.match(settingsSource, /window\.fabricDesktop\.setPreferences/)
  })

  it('wires desktop update checks to the system updates panel', () => {
    assert.match(settingsSource, /BaseUpdateDialog/)
    assert.match(settingsSource, /checkForDesktopUpdates/)
    assert.match(settingsSource, /maybeAutoCheckForUpdates/)
    assert.match(settingsSource, /window\.fabricDesktop\.checkForUpdates\('safe'\)/)
    assert.match(settingsSource, /Check Now/)
    assert.match(settingsSource, /No newer safe desktop release was found/)
    assert.match(settingsSource, /Automatic install will be enabled after signed installers are available/)
  })

  it('keeps variables composer transparent and exposes copyable env tokens', () => {
    assert.doesNotMatch(settingsSource, /gs-vars__composer-icon/)
    assert.match(settingsSource, /copyVariableToken/)
    assert.match(settingsSource, /`{{ env\.\$\{key\} }}`/)
    assert.match(settingsSource, /name="copy"/)
    assert.match(stylesSource, /\.gs-vars__composer \{[\s\S]*background:\s*transparent;/)
    assert.doesNotMatch(stylesSource, /\.gs-vars__composer-icon/)
  })
})
