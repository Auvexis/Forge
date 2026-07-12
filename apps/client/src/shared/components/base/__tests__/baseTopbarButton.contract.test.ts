import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../BaseTopbarButton.vue', import.meta.url), 'utf8')

describe('BaseTopbarButton contract', () => {
  it('fills its parent and exposes left, center, and right slots', () => {
    assert.match(source, /width: 100%/)
    assert.match(source, /height: 100%/)
    assert.match(source, /\$slots\.left/)
    assert.match(source, /\$slots\.default/)
    assert.match(source, /\$slots\.right/)
    assert.match(source, /v-bind="\$attrs"/)
  })
})
