import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

test('shared dropdown selects close from document pointerdown capture outside the root', () => {
  const source = read('src/shared/components/base/BaseDropdownSelect.vue')

  assert.match(source, /function handleOutsidePointerDown\(event: PointerEvent\)/)
  assert.match(source, /rootRef\.value\?\.contains\(target\)/)
  assert.match(source, /document\.addEventListener\('pointerdown', handleOutsidePointerDown, true\)/)
  assert.match(source, /document\.removeEventListener\('pointerdown', handleOutsidePointerDown, true\)/)
  assert.doesNotMatch(source, /document\.addEventListener\('click', handleOutsideClick\)/)
})

test('shared tool dropdowns close from document pointerdown capture outside trigger and menu', () => {
  const source = read('src/shared/components/base/BaseToolDropdown.vue')

  assert.match(source, /function onDocumentPointerDown\(event: PointerEvent\)/)
  assert.match(source, /trigger\?\.contains\(event\.target as Node\)/)
  assert.match(source, /menuRef\.value\?\.contains\(event\.target as Node\)/)
  assert.match(source, /document\.addEventListener\('pointerdown', onDocumentPointerDown, true\)/)
  assert.match(source, /document\.removeEventListener\('pointerdown', onDocumentPointerDown, true\)/)
})
