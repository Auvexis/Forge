import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { shouldSendDesktopNotification } from './desktopNotification.service.ts'

describe('desktop notification service', () => {
  it('enables native desktop notifications by default', () => {
    assert.equal(shouldSendDesktopNotification({}), true)
    assert.equal(shouldSendDesktopNotification({ desktop_notifications_enabled: true }), true)
  })

  it('allows users to disable native desktop notifications', () => {
    assert.equal(shouldSendDesktopNotification({ desktop_notifications_enabled: false }), false)
  })
})
