import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import {
  hasCompletedStartGuide,
  readStartGuideProgress,
  resetStartGuideProgress,
  startGuideStorageKey,
  writeStartGuideProgress,
} from '../startGuideProgress.ts'
import type { StartGuideDefinition } from '../startGuide.types.ts'

class MemoryStorage {
  private items = new Map<string, string>()

  getItem(key: string) {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.items.set(key, value)
  }

  removeItem(key: string) {
    this.items.delete(key)
  }

  clear() {
    this.items.clear()
  }
}

const storage = new MemoryStorage()

const guide: StartGuideDefinition = {
  featureId: 'plugin-external-installer',
  version: 2,
  category: 'plugins',
  categoryLabel: 'Plugins',
  defaultLang: 'en',
  steps: [
    {
      id: 'intro',
      lang: {
        en: { title: 'Install plugins', description: 'Install external plugins.' },
        pt: { title: 'Instalar plugins', description: 'Instale plugins externos.' },
        es: { title: 'Instalar plugins', description: 'Instala plugins externos.' },
      },
    },
  ],
}

describe('start guide progress storage', () => {
  beforeEach(() => {
    storage.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    })
  })

  it('uses a profile scoped localStorage key', () => {
    assert.equal(
      startGuideStorageKey('profile_a', 'plugin-external-installer'),
      'sailor:start-guide:v1:profile_a:plugin-external-installer',
    )
  })

  it('persists skipped and completed progress', () => {
    writeStartGuideProgress('profile_a', {
      featureId: guide.featureId,
      status: 'skipped',
      version: guide.version,
      updatedAt: '2026-06-08T12:00:00.000Z',
    })

    assert.deepEqual(readStartGuideProgress('profile_a', guide.featureId), {
      featureId: guide.featureId,
      status: 'skipped',
      version: guide.version,
      updatedAt: '2026-06-08T12:00:00.000Z',
    })

    writeStartGuideProgress('profile_a', {
      featureId: guide.featureId,
      status: 'completed',
      version: guide.version,
      updatedAt: '2026-06-08T12:01:00.000Z',
    })

    assert.equal(readStartGuideProgress('profile_a', guide.featureId)?.status, 'completed')
  })

  it('does not treat older guide versions as completed', () => {
    writeStartGuideProgress('profile_a', {
      featureId: guide.featureId,
      status: 'completed',
      version: 1,
      updatedAt: '2026-06-08T12:00:00.000Z',
    })

    assert.equal(hasCompletedStartGuide('profile_a', guide), false)
  })

  it('treats skipped and completed progress for the current version as done', () => {
    writeStartGuideProgress('profile_a', {
      featureId: guide.featureId,
      status: 'skipped',
      version: guide.version,
      updatedAt: '2026-06-08T12:00:00.000Z',
    })

    assert.equal(hasCompletedStartGuide('profile_a', guide), true)

    writeStartGuideProgress('profile_a', {
      featureId: guide.featureId,
      status: 'completed',
      version: guide.version,
      updatedAt: '2026-06-08T12:01:00.000Z',
    })

    assert.equal(hasCompletedStartGuide('profile_a', guide), true)
  })

  it('does nothing without a profile id and can reset progress', () => {
    writeStartGuideProgress('', {
      featureId: guide.featureId,
      status: 'completed',
      version: guide.version,
      updatedAt: '2026-06-08T12:00:00.000Z',
    })

    assert.equal(readStartGuideProgress('', guide.featureId), null)

    writeStartGuideProgress('profile_a', {
      featureId: guide.featureId,
      status: 'completed',
      version: guide.version,
      updatedAt: '2026-06-08T12:00:00.000Z',
    })
    resetStartGuideProgress('profile_a', guide.featureId)

    assert.equal(readStartGuideProgress('profile_a', guide.featureId), null)
  })
})
