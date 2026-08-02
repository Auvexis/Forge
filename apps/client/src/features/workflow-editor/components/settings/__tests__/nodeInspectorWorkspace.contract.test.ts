import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const source = readFileSync(new URL('../NodeInspectorModal.vue', import.meta.url), 'utf8')

test('node inspector uses a desktop workspace with modal fallback', () => {
  assert.match(source, /<BaseWorkspaceSurface/)
  assert.match(source, /workspace-id="workflow-node-inspectors"/)
  assert.match(source, /v-for="tab in inspectorStore\.openTabs"/)
  assert.match(source, /inspectorStore\.selectInspector\(tab\.id\)/)
  assert.match(source, /inspectorStore\.closeInspectorTab\(tab\.id\)/)
  assert.match(source, /modal-max-width="1600px"/)
  assert.doesNotMatch(source, /<BaseModal/)
})
