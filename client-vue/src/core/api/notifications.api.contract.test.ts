import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

describe('notifications api contract', () => {
  it('defines every notification endpoint', () => {
    const source = readFileSync('src/core/api/endpoints.ts', 'utf8')

    assert.match(source, /NOTIFICATIONS: '\/notifications'/)
    assert.match(source, /NOTIFICATIONS_SUMMARY: '\/notifications\/summary'/)
    assert.match(source, /NOTIFICATION_READ: \(id: string\).*\/notifications\/\$\{encodeURIComponent\(id\)\}\/read/s)
    assert.match(source, /NOTIFICATIONS_READ_ALL: '\/notifications\/read-all'/)
    assert.match(source, /NOTIFICATION_BY_ID: \(id: string\).*\/notifications\/\$\{encodeURIComponent\(id\)\}/s)
  })

  it('exposes list, create, summary, read and delete methods', () => {
    const source = readFileSync('src/core/api/notifications.api.ts', 'utf8')

    for (const method of ['list', 'create', 'summary', 'markRead', 'markAllRead', 'deleteOne', 'clear']) {
      assert.match(source, new RegExp(`${method}:`))
    }
    assert.match(source, /params: filters/)
    assert.match(source, /method: 'POST'/)
    assert.match(source, /method: 'PATCH'/)
    assert.match(source, /method: 'DELETE'/)
  })
})
