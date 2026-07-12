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

  it('wires AppTopbar notifications through a local BaseTopbarButton', () => {
    const source = read('src/shared/components/layout/AppTopbar.vue')

    assert.match(source, /import BaseTopbarButton/)
    assert.match(source, /useNotificationStore/)
    assert.match(source, /useNotificationUiStore/)
    assert.match(source, /notificationUi\.toggle\(\)/)
    assert.match(source, /<LucideIcon name="bell" :size="20" \/>/)
    assert.doesNotMatch(source, /import NotificationTrigger/)
    assert.doesNotMatch(source, /<NotificationTrigger/)
    assert.match(source, /app-topbar__section--right/)
    assert.match(source, /width="40px"/)
    assert.match(source, /app-topbar__action-button/)
    assert.match(source, /min-width:\s*40px/)
    assert.doesNotMatch(source, /\.app-topbar__icon-button\s*\{[\s\S]*?width:\s*auto/)
    assert.match(source, /<span>Guide<\/span>/)
    assert.match(source, /<span>Command<\/span>/)
    assert.ok(source.indexOf('app-topbar__section--center') < source.indexOf('name="bell"'))
  })

  it('keeps Pages chrome free of duplicate notification triggers', () => {
    const source = read('src/features/web-pages/components/PageChromeToolbar.vue')

    assert.doesNotMatch(source, /import NotificationTrigger/)
    assert.doesNotMatch(source, /<NotificationTrigger/)
    assert.doesNotMatch(source, /web-page-chrome__global-actions/)
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
