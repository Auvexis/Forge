import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const settingsSource = readFileSync(
  fileURLToPath(new URL('../AppGlobalSettings.vue', import.meta.url)),
  'utf8',
)
const settingsStoreSource = readFileSync(
  fileURLToPath(new URL('../../../stores/settings.store.ts', import.meta.url)),
  'utf8',
)
const restartConfirmSource = readFileSync(
  fileURLToPath(new URL('../../base/BaseRestartApplicationConfirm.vue', import.meta.url)),
  'utf8',
)
const confirmPanelSource = readFileSync(
  fileURLToPath(new URL('../AppConfirmPanel.vue', import.meta.url)),
  'utf8',
)

describe('public URL settings contract', () => {
  it('saves public URL changes as restart-required and uses the restart confirm component', () => {
    assert.match(settingsSource, /BaseRestartApplicationConfirm/)
    assert.match(settingsSource, /requestApplicationRestart/)
    assert.match(settingsSource, /store\.saveSetting<PublicUrlSaveResult>\(\s*["']public_url["']/)
    assert.match(settingsSource, /public_url_restart_required = result\.restartRequired/)
  })

  it('clears public URL only when configured and asks for restart', () => {
    assert.match(settingsSource, /hasConfiguredPublicUrl/)
    assert.match(settingsSource, /Clear public URL/)
    assert.match(settingsSource, /store\.deleteSetting<PublicUrlSaveResult>\(["']public_url["']\)/)
    assert.match(settingsSource, /return to the default localhost URL/)
  })

  it('disables public URL editing when backend reports it is locked by env', () => {
    assert.match(settingsSource, /publicUrlLocked/)
    assert.match(settingsSource, /:disabled="publicUrlLocked"/)
    assert.match(settingsStoreSource, /public_url_locked\?: boolean/)
  })

  it('exposes a desktop-only native notifications preference', () => {
    assert.match(settingsSource, /Desktop Notifications/)
    assert.match(settingsSource, /BaseSwitch/)
    assert.match(settingsSource, /desktop_notifications_enabled/)
    assert.match(settingsStoreSource, /desktop_notifications_enabled\?: boolean/)
  })

  it('keeps restart application confirmation reusable as a base component', () => {
    assert.match(restartConfirmSource, /Restart Application/)
    assert.match(restartConfirmSource, /defineExpose\(\{ requestRestart \}\)/)
    assert.match(restartConfirmSource, /window\.fabricDesktop\.restart\(\)/)
    assert.match(restartConfirmSource, /useConfirm/)
  })

  it('renders global confirmations through RenderPortal for desktop windows', () => {
    assert.match(confirmPanelSource, /RenderPortal/)
    assert.match(confirmPanelSource, /<RenderPortal>/)
  })
})
