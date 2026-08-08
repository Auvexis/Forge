import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../..')

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('BaseSelect dropdown renders above modal overlays in the local overlay host', () => {
  const selectSource = read('src/shared/components/base/BaseSelect.vue')
  const modalSource = read('src/shared/components/base/BaseModal.vue')
  const overlaySource = read('src/shared/composables/useOverlayTarget.ts')

  assert.match(selectSource, /useOverlayTarget\(wrapperRef\)/)
  assert.match(selectSource, /<Teleport :to="overlayTarget">/)
  assert.match(overlaySource, /ownerDocumentOf/)
  assert.match(modalSource, /z-index:\s*2147483000/)
  assert.match(selectSource, /zIndex:\s*'2147483400'/)
})
