import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import test from 'node:test'

const source = readFileSync(
  fileURLToPath(new URL('../BaseCanvas.vue', import.meta.url)),
  'utf8',
)

test('BaseCanvas pans with M2 drag without removing context menu click support', () => {
  assert.match(source, /event\.button === 2/)
  assert.match(source, /startViewportPan\(event\)/)
  assert.match(source, /suppressNextContextMenu/)
  assert.match(source, /pan\.moved && pan\.button === 2/)
  assert.match(source, /emit\('context-menu'/)
})
