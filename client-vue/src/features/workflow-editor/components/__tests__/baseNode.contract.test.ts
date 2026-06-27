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

  assert.match(source, /\.sailor-base-node__handler :deep\(\.qab-wrap--down\)\s*\{[\s\S]*position: absolute;[\s\S]*top: 8px;/)
})

test('selected nodes and vertical handler quick add use polished geometry', () => {
  const source = read('BaseNode.vue')
  const quickAdd = read('QuickAddButton.vue')

  assert.match(source, /\.sailor-base-node\.is-selected\s*\{[\s\S]*0 0 0 4px/)
  assert.match(source, /import BaseBadge from '@\/shared\/components\/base\/BaseBadge\.vue'/)
  assert.match(source, /<BaseBadge[\s\S]*class="sailor-base-node__handler-label"[\s\S]*variant="default"[\s\S]*size="sm"/)
  assert.match(source, /\.sailor-base-node__handler-label\s*\{[\s\S]*z-index: 6000;/)
  assert.match(source, /\.sailor-base-node__handler :deep\(\.qab-wrap--down\)\s*\{[\s\S]*top: 8px;[\s\S]*left: 50%;[\s\S]*margin-top: 0;[\s\S]*transform: translateX\(-50%\);/)
  assert.match(quickAdd, /\.qab-wrap--down \.qab-cable\s*\{[\s\S]*height: var\(--qab-cable-length, 40px\);/)
  assert.doesNotMatch(quickAdd, /\.qab-wrap--down \.qab-btn/)
  assert.match(quickAdd, /width: var\(--qab-size, 19px\);[\s\S]*height: var\(--qab-size, 19px\);/)
})

test('BaseNode maps all four sides to workflow handle positions', () => {
  const source = read('BaseNode.vue')

  assert.match(source, /top: Position\.Top/)
  assert.match(source, /left: Position\.Left/)
  assert.match(source, /bottom: Position\.Bottom/)
  assert.match(source, /right: Position\.Right/)
})

test('BaseHandle delegates to the workflow-native handle', () => {
  const source = read('BaseHandle.vue')

  assert.match(source, /WorkflowHandle/)
  assert.match(source, /:position="props\.position"/)
  assert.match(source, /:variant="props\.variant \?\? 'circle'"/)
  assert.doesNotMatch(source, /@vue-flow\/core/)
})

test('configured handles anchor their measured center on each node border', () => {
  const source = read('BaseNode.vue')

  assert.doesNotMatch(source, /\.sailor-base-node__handler :deep\(\.sailor-base-handle\)\s*\{[\s\S]*position: relative !important;[\s\S]*inset: auto !important;/)
  assert.match(source, /\.is-position-bottom \.sailor-base-node__handler :deep\(\.sailor-base-handle\)/)
  assert.match(source, /\.is-position-top \.sailor-base-node__handler :deep\(\.sailor-base-handle\)/)
  assert.match(source, /\.is-position-left \.sailor-base-node__handler :deep\(\.sailor-base-handle\)/)
  assert.match(source, /\.is-position-right \.sailor-base-node__handler :deep\(\.sailor-base-handle\)/)
})

test('BaseNode refreshes only later changes to its handle geometry', () => {
  const source = read('BaseNode.vue')

  assert.match(source, /const handleGeometrySignature = computed/)
  assert.match(source, /watch\(handleGeometrySignature, refreshHandleGeometry/)
  assert.doesNotMatch(source, /onMounted\(refreshHandleGeometry\)/)
  assert.doesNotMatch(source, /updateNodeInternals/)
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

  assert.match(source, /node:quick-add/)
  assert.match(source, /handlerId/)
  assert.match(source, /allowedNodes/)
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
