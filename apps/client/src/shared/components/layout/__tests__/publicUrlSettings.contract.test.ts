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

describe('public URL settings contract', () => {
  it('saves public URL changes as restart-required and uses the global confirm panel', () => {
    assert.match(settingsSource, /useConfirm/)
    assert.match(settingsSource, /Restart required/)
    assert.match(settingsSource, /store\.saveSetting<PublicUrlSaveResult>\('public_url'/)
    assert.match(settingsSource, /public_url_restart_required = result\.restartRequired/)
    assert.match(settingsSource, /window\.fabricDesktop\?\.restart\(\)/)
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
})
