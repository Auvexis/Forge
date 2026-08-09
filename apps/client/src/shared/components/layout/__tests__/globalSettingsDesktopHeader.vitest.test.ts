import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  fileURLToPath(new URL('../AppGlobalSettings.vue', import.meta.url)),
  'utf8',
)

describe('AppGlobalSettings desktop header', () => {
  it('hides the internal settings header when rendered in Fabric Desktop', () => {
    expect(source).toContain('v-if="!isDesktopWindow" class="gs-header"')
    expect(source).toContain('const isDesktopWindow = computed')
  })
})
