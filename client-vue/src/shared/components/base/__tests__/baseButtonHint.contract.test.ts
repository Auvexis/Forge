import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(currentDir, '../BaseButton.vue'), 'utf8')

describe('BaseButton hint contract', () => {
  it('accepts a typed hint prop and delegates rendering to AppHint', () => {
    assert.match(source, /AppHint/)
    assert.match(source, /ButtonHint/)
    assert.match(source, /hint\?: ButtonHint/)
  })

  it('keeps attrs bound to the real button', () => {
    assert.match(source, /v-bind="\$attrs"/)
    assert.match(source, /defineOptions\(\{ inheritAttrs: false \}\)/)
  })
})
