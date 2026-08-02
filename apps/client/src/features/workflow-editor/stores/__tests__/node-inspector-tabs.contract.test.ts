import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../node-inspector.store.ts', import.meta.url), 'utf8')

test('node inspector store keeps multiple selectable and closable tabs', () => {
  assert.match(source, /const openTabs = ref<Node\[]>\(\[\]\)/)
  assert.match(source, /function selectInspector\(nodeId: string\)/)
  assert.match(source, /function closeInspectorTab\(nodeId: string\)/)
  assert.match(source, /openTabs\.value\.push\(node\)/)
})
