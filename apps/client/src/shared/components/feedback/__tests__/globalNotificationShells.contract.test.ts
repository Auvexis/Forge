import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function read(relativePath: string) {
  return readFileSync(resolve(relativePath), 'utf8')
}

describe('global notification shell integration', () => {
  it('adds a reusable notification trigger to the main sidebar footer', () => {
    const source = read('src/app/App.vue')
    const footerStart = source.indexOf('<template #footer>')
    const footerEnd = source.indexOf('</template>', footerStart)
    const footer = source.slice(footerStart, footerEnd)

    assert.match(source, /import NotificationTrigger/)
    assert.match(footer, /<NotificationTrigger/)
    assert.match(footer, /sidebar-activity-link/)
    assert.ok(footer.indexOf('<NotificationTrigger') < footer.indexOf('activityById.settings'))

    const styles = read('src/app/styles/app-shell-nav.css')
    assert.match(styles, /\.sidebar-activity-link\.notification-trigger/)
  })

  it('adds a reusable notification trigger to AppTopbar', () => {
    const source = read('src/shared/components/layout/AppTopbar.vue')

    assert.match(source, /import NotificationTrigger/)
    assert.match(source, /<NotificationTrigger/)
    assert.match(source, /app-topbar__actions/)
    assert.ok(source.indexOf('app-topbar__search') < source.indexOf('app-topbar__actions'))
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
