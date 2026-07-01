import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../..')

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('BaseSelect dropdown renders above modal overlays when teleported to body', () => {
  const selectSource = read('src/shared/components/base/BaseSelect.vue')
  const modalSource = read('src/shared/components/base/BaseModal.vue')

  assert.match(modalSource, /z-index:\s*2147483647/)
  assert.match(selectSource, /zIndex:\s*'2147483647'/)
})
