import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../BaseTopbarButton.vue', import.meta.url), 'utf8')

describe('BaseTopbarButton contract', () => {
  it('fills parent height and exposes configurable width, gap, and slots', () => {
    assert.match(source, /width\?: string/)
    assert.match(source, /gap\?: string/)
    assert.match(source, /width: 'auto'/)
    assert.match(source, /--base-topbar-button-width/)
    assert.match(source, /--base-topbar-button-gap/)
    assert.match(source, /height: 100%/)
    assert.match(source, /\$slots\.left/)
    assert.match(source, /\$slots\.default/)
    assert.match(source, /\$slots\.right/)
    assert.match(source, /v-bind="\$attrs"/)
  })
})
