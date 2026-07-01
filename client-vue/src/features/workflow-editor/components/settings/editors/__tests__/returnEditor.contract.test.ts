import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('settings registry registers ReturnEditor for return nodes', () => {
  const registry = read('src/features/workflow-editor/components/settings/editors/index.ts')
  const editorPath = resolve(root, 'src/features/workflow-editor/components/settings/editors/ReturnEditor.vue')

  assert.equal(existsSync(editorPath), true)
  assert.match(registry, /import ReturnEditor from '\.\/ReturnEditor\.vue'/)
  assert.match(registry, /return: ReturnEditor/)
})

test('ReturnEditor exposes return modes and variable-aware payload editors', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/ReturnEditor.vue')

  assert.match(source, /BaseSelect/)
  assert.match(source, /all-steps/)
  assert.match(source, /fields/)
  assert.match(source, /expression/)
  assert.match(source, /EditorField label="Return Mode"/)
  assert.match(source, /<EditorField[^>]*label="Fields"/)
  assert.match(source, /<EditorField[^>]*label="Expression"/)
  assert.match(source, /ExpressionInput/)
  assert.match(source, /ExpressionTextarea/)
  assert.match(source, /BaseVariableInput/)
  assert.match(source, /mode === 'all-steps'/)
  assert.match(source, /mode === 'fields'/)
  assert.match(source, /mode === 'expression'/)
  assert.match(source, /updateNodeData\(\{ mode: next/)
})
