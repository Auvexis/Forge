import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function read(relativePath: string) {
  return readFileSync(resolve(relativePath), 'utf8')
}

describe('global notification shell integration', () => {
  it('keeps the main sidebar dedicated to feature navigation', () => {
    const source = read('src/app/App.vue')
    const styles = read('src/app/styles/app-shell-nav.css')

    assert.doesNotMatch(source, /<template #footer>/)
    assert.doesNotMatch(source, /sidebar-activity-link/)
    assert.doesNotMatch(styles, /\.sidebar-activity-link/)
  })

  it('adds a reusable notification trigger to AppTopbar', () => {
    const source = read('src/shared/components/layout/AppTopbar.vue')

    assert.match(source, /import NotificationTrigger/)
    assert.match(source, /<NotificationTrigger/)
    assert.match(source, /app-topbar__section--right/)
    assert.ok(source.indexOf('app-topbar__section--center') < source.indexOf('<NotificationTrigger'))
  })

  it('adds a reusable notification trigger to Pages chrome when the Fabric shell is hidden', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.match(source, /import NotificationTrigger/)
    assert.match(source, /<NotificationTrigger/)
    assert.match(source, /web-page-chrome__global-actions/)
    assert.ok(source.indexOf('web-page-chrome__status') < source.indexOf('web-page-chrome__global-actions'))
  })

  it('keeps every trigger wired to the shared stores and one global panel', () => {
    const app = read('src/app/App.vue')
    const trigger = read('src/shared/components/feedback/NotificationTrigger.vue')
    const panelCount = app.match(/<GlobalNotificationPanel \/>/g) ?? []

    assert.equal(panelCount.length, 1)
    assert.match(trigger, /useNotificationStore/)
    assert.match(trigger, /useNotificationUiStore/)
    assert.match(trigger, /notificationUi\.toggle\(\)/)
  })
})
