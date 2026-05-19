import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolvePluginIcon } from '../pluginIconResolver.ts'

describe('plugin icon resolver', () => {
  it('uses light icon on dark theme and dark icon on light theme', () => {
    const metadata = {
      icon: 'fallback.svg',
      iconLight: 'light.svg',
      iconDark: 'dark.svg',
    }

    assert.equal(resolvePluginIcon(metadata, { isDark: true }), 'light.svg')
    assert.equal(resolvePluginIcon(metadata, { isDark: false }), 'dark.svg')
  })

  it('keeps style icon and legacy icon fallback compatibility', () => {
    assert.equal(resolvePluginIcon({ style: { icon: 'sparkles' }, iconLight: 'light.svg' }), 'sparkles')
    assert.equal(resolvePluginIcon({ icon: 'legacy.svg' }, { isDark: false }), 'legacy.svg')
    assert.equal(resolvePluginIcon({}, { fallback: 'box' }), 'box')
  })
})
