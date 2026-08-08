import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { resolvePluginIcon } from '../pluginIconResolver.ts'

describe('plugin icon resolver', () => {
  it('uses the requested theme icon variant', () => {
    const metadata = {
      icon: 'fallback.svg',
      iconLight: 'light.svg',
      iconDark: 'dark.svg',
    }

    assert.equal(resolvePluginIcon(metadata, { iconVariant: 'light' }), 'light.svg')
    assert.equal(resolvePluginIcon(metadata, { iconVariant: 'dark' }), 'dark.svg')
  })

  it('keeps style icon and legacy isDark fallback compatibility', () => {
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
          new URL('../../../../../api/src/plugins/fabric/ollama/manifest.json', import.meta.url),
        ),
        'utf8',
      ),
    )
    const openRouterManifest = JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL(
            '../../../../../api/src/plugins/fabric/openrouter/manifest.json',
            import.meta.url,
          ),
        ),
        'utf8',
      ),
    )
    const qdrantManifest = JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL('../../../../../api/src/plugins/fabric/qdrant/manifest.json', import.meta.url),
        ),
        'utf8',
      ),
    )

    assert.match(resolvePluginIcon(ollamaManifest.metadata, { iconVariant: 'light' }), /ollama-dark\.svg$/)
    assert.match(resolvePluginIcon(ollamaManifest.metadata, { iconVariant: 'dark' }), /ollama\.svg$/)
    assert.match(
      resolvePluginIcon(openRouterManifest.metadata, { iconVariant: 'light' }),
      /dark\/openrouter\.png$/,
    )
    assert.match(
      resolvePluginIcon(openRouterManifest.metadata, { iconVariant: 'dark' }),
      /light\/openrouter\.png$/,
    )
    assert.match(resolvePluginIcon(qdrantManifest.metadata, { iconVariant: 'light' }), /qdrant-light\.svg$/)
    assert.match(resolvePluginIcon(qdrantManifest.metadata, { iconVariant: 'dark' }), /qdrant\.svg$/)
  })
})
