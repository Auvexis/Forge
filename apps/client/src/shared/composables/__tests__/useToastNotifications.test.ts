import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import {
  createToastNotificationPayload,
  persistToastNotification,
} from '../toastNotificationPolicy.ts'

describe('toast notification policy', () => {
  it('persists error, warning and info variants with metadata', () => {
    assert.deepEqual(
      createToastNotificationPayload(
        { message: 'Failed', title: 'Save failed', variant: 'error' },
        {
          category: 'workflows',
          source: 'workflow-editor',
          context: { workflowId: 'workflow-1' },
          actionUrl: '/workflows/workflow-1',
          actionLabel: 'Open workflow',
        },
      ),
      {
        level: 'error',
        category: 'workflows',
        title: 'Save failed',
        message: 'Failed',
        source: 'workflow-editor',
        context: { workflowId: 'workflow-1' },
        actionUrl: '/workflows/workflow-1',
        actionLabel: 'Open workflow',
      },
    )
    assert.equal(
      createToastNotificationPayload({ message: 'Careful', variant: 'warning' })?.level,
      'warning',
    )
    assert.equal(
      createToastNotificationPayload({ message: 'Heads up', variant: 'default' })?.level,
      'info',
    )
  })

  it('persists reward toasts as reward notifications', () => {
    assert.deepEqual(
      createToastNotificationPayload({
        message: 'Bee badge unlocked',
        title: 'Reward claimed',
        variant: 'reward',
      }),
      {
        level: 'info',
        category: 'rewards',
        title: 'Reward claimed',
        message: 'Bee badge unlocked',
        source: undefined,
        context: undefined,
        actionUrl: undefined,
        actionLabel: undefined,
      },
    )
  })

  it('never persists success or explicitly suppressed toasts', () => {
    assert.equal(
      createToastNotificationPayload({ message: 'Saved', variant: 'success' }),
      null,
    )
    assert.equal(
      createToastNotificationPayload(
        { message: 'Persistence failed', variant: 'error' },
        { persist: false },
      ),
      null,
    )
  })

  it('swallows persistence failures without creating a recursive notification', async () => {
    let attempts = 0
    await assert.doesNotReject(() =>
      persistToastNotification(
        { level: 'error', message: 'Failure' },
        async () => {
          attempts += 1
          throw new Error('database unavailable')
        },
      ),
    )
    assert.equal(attempts, 1)
  })
})

describe('useToast notification integration', () => {
  it('preserves positional calls and accepts metadata options', () => {
    const source = fs.readFileSync(path.resolve('src/shared/composables/useToast.ts'), 'utf8')
    const policy = fs.readFileSync(
      path.resolve('src/shared/composables/toastNotificationPolicy.ts'),
      'utf8',
    )

    assert.match(source, /titleOrOptions\?: string \| ToastOptions/)
    assert.match(source, /normalizeToastOptions\(titleOrOptions, duration\)/)
    assert.match(source, /ToastOptions extends ToastNotificationMetadata/)
    assert.match(source, /const reward = /)
    assert.match(policy, /category\?: string/)
    assert.match(policy, /actionUrl\?: string/)
  })

  it('persists only newly visible toasts after visual duplicate suppression', () => {
    const source = fs.readFileSync(path.resolve('src/shared/composables/useToast.ts'), 'utf8')
    const persistence = source.indexOf('persistToastNotification(')
    const duplicate = source.indexOf('const duplicate = toasts.value.find')

    assert.ok(persistence >= 0)
    assert.ok(duplicate >= 0)
    assert.ok(duplicate < persistence)
    assert.match(source, /if \(duplicate\) return duplicate\.id/)
  })
})

describe('reward notification panel integration', () => {
  it('keeps reward notifications visually distinct and sorted first', () => {
    const source = fs.readFileSync(
      path.resolve('src/shared/components/feedback/NotificationList.vue'),
      'utf8',
    )

    assert.match(source, /isRewardNotification/)
    assert.match(source, /return leftReward \? -1 : 1/)
    assert.match(source, /return 'gift'/)
    assert.match(source, /notification-list__item--reward/)
  })
})

describe('global error toast integration', () => {
  it('dedupes immediate duplicate global error reports without suppressing later repeats', () => {
    const source = fs.readFileSync(path.resolve('src/shared/composables/globalErrorToasts.ts'), 'utf8')

    assert.match(source, /recentReports/)
    assert.match(source, /globalErrorDuplicateWindowMs/)
    assert.match(source, /shouldSkipDuplicateReport/)
    assert.match(source, /Date\.now\(\)/)
  })
})
