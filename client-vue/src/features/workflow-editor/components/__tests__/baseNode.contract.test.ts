import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

function read(relative: string) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8')
}

test('BaseNode exposes configurable positions, rounding, border, and handlers', () => {
  const source = read('BaseNode.vue')

  for (const prop of [
    'inputPosition',
    'outputPosition',
    'rounded',
    'borderStyle',
    'iconLeft',
    'description',
    'handlers',
  ]) {
    assert.match(source, new RegExp(prop))
  }

  assert.match(source, /BaseNodeHandlerDefinition/)
  assert.match(source, /handler\.required/)
  assert.match(source, /handler\.allowedNodes/)
  assert.match(source, /handler\.style/)
  assert.match(source, /handler\.quickAddAfterConnected/)
  assert.match(source, /:variant="handler\.style \?\? 'circle'"/)
  assert.match(source, /:always-visible="handler\.quickAddAfterConnected"/)
})

test('vertical handler quick add does not change the handle edge alignment', () => {
  const source = read('BaseNode.vue')

  assert.match(source, /\.sailor-base-node__handler :deep\(\.qab-wrap--down\)\s*\{[\s\S]*position: absolute;[\s\S]*top: 12px;/)
})

test('BaseNode maps all four sides to Vue Flow positions', () => {
  const source = read('BaseNode.vue')

  assert.match(source, /top: Position\.Top/)
  assert.match(source, /left: Position\.Left/)
  assert.match(source, /bottom: Position\.Bottom/)
  assert.match(source, /right: Position\.Right/)
})

test('QuickAddButton emits generic handler metadata', () => {
  const source = read('QuickAddButton.vue')

  assert.match(source, /allowedNodes/)
  assert.match(source, /handlerId/)
  assert.doesNotMatch(source, /agentConfigHandle:/)
  assert.doesNotMatch(source, /vectorConfigHandle:/)
})

test('workflow canvas carries generic handler quick add metadata', () => {
  const source = read('SailorWorkflowCanvas.vue')

  assert.match(source, /quickAddMode\?: 'agent-config' \| 'vector-config'/)
  assert.match(source, /payload\.handlerId/)
  assert.match(source, /payload\.allowedNodes/)
})

test('BaseAdvancedNode composes BaseNode and declares automatic organization', () => {
  const source = read('BaseAdvancedNode.vue')

  assert.match(source, /import BaseNode/)
  assert.match(source, /autoOrganize/)
  assert.match(source, /handlers/)
  assert.match(source, /'236px'/)
  assert.match(source, /'100px'/)
  assert.match(source, /<slot name="icon-left"/)
  assert.match(source, /data-auto-organize/)
})
