import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { isIconUrl } from '../iconRendering.ts'

describe('icon rendering', () => {
  it('treats external provider svg icons as images instead of tinting them', () => {
    const ollamaIcon = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/ollama.svg'
    const iconSources = [
      readFileSync(fileURLToPath(new URL('../LucideIcon.vue', import.meta.url)), 'utf8'),
      readFileSync(
        fileURLToPath(
          new URL('../../../features/universe/components/UniversePluginIcon.vue', import.meta.url),
        ),
        'utf8',
      ),
    ].join('\n')

    assert.equal(isIconUrl(ollamaIcon), true)
    assert.doesNotMatch(iconSources, /isTintableExternalIcon|lucide-icon-mask|--sailor-icon-mask/)
  })
})
