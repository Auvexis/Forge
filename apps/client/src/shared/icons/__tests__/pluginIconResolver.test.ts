import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

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
    assert.equal(
      resolvePluginIcon({ style: { icon: 'sparkles' }, iconLight: 'light.svg' }),
      'sparkles',
    )
    assert.equal(resolvePluginIcon({ icon: 'legacy.svg' }, { isDark: false }), 'legacy.svg')
    assert.equal(resolvePluginIcon({}, { fallback: 'box' }), 'box')
  })

  it('keeps Ollama and OpenRouter manifests aligned with theme icon resolution', () => {
    const ollamaManifest = JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL('../../../../../server/src/plugins/fabric/ollama/manifest.json', import.meta.url),
        ),
        'utf8',
      ),
    )
    const openRouterManifest = JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL(
            '../../../../../server/src/plugins/fabric/openrouter/manifest.json',
            import.meta.url,
          ),
        ),
        'utf8',
      ),
    )

    assert.match(resolvePluginIcon(ollamaManifest.metadata, { isDark: true }), /ollama-dark\.svg$/)
    assert.match(resolvePluginIcon(ollamaManifest.metadata, { isDark: false }), /ollama\.svg$/)
    assert.match(
      resolvePluginIcon(openRouterManifest.metadata, { isDark: true }),
      /dark\/openrouter\.png$/,
    )
    assert.match(
      resolvePluginIcon(openRouterManifest.metadata, { isDark: false }),
      /light\/openrouter\.png$/,
    )
  })
})
