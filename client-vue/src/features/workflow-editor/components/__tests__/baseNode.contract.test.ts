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

test('BaseHandle keeps the measured edge anchor separate from its centered visual', () => {
  const source = read('BaseHandle.vue')

  assert.match(source, /class="sailor-base-handle__visual"/)
  assert.match(source, /\.sailor-base-handle\s*\{[\s\S]*width: 0 !important;[\s\S]*height: 0 !important;/)
  assert.match(source, /\.sailor-base-handle__visual\s*\{[\s\S]*position: absolute;[\s\S]*top: 50%;[\s\S]*left: 50%;[\s\S]*transform: translate\(-50%, -50%\);/)
  assert.match(source, /\.is-variant-diamond \.sailor-base-handle__visual\s*\{[\s\S]*rotate\(45deg\)/)
})

test('configured handles anchor their measured center on each node border', () => {
  const source = read('BaseNode.vue')

  assert.doesNotMatch(source, /\.sailor-base-node__handler :deep\(\.sailor-base-handle\)\s*\{[\s\S]*position: relative !important;[\s\S]*inset: auto !important;/)
  assert.match(source, /\.is-position-bottom \.sailor-base-node__handler :deep\(\.sailor-base-handle\)/)
  assert.match(source, /\.is-position-top \.sailor-base-node__handler :deep\(\.sailor-base-handle\)/)
  assert.match(source, /\.is-position-left \.sailor-base-node__handler :deep\(\.sailor-base-handle\)/)
  assert.match(source, /\.is-position-right \.sailor-base-node__handler :deep\(\.sailor-base-handle\)/)
})

test('BaseEdge keeps Vue Flow measured endpoints as fallback anchors', () => {
  const source = read('BaseEdge.vue')

  assert.match(source, /\{ x: props\.sourceX, y: props\.sourceY \}/)
  assert.match(source, /\{ x: props\.targetX, y: props\.targetY \}/)
  assert.doesNotMatch(source, /props\.(?:source|target)[XY]\s*[+-]/)
})

test('BaseEdge prefers visual handle centers when available', () => {
  const source = read('BaseEdge.vue')

  assert.match(source, /function getVisualHandleCenter/)
  assert.match(source, /screenToFlowCoordinate/)
  assert.match(source, /\.sailor-base-handle__visual/)
  assert.match(source, /const sourcePoint = computed/)
  assert.match(source, /const targetPoint = computed/)
  assert.match(source, /sourcePoint\.value\.x, sourcePoint\.value\.y/)
  assert.match(source, /targetPoint\.value\.x, targetPoint\.value\.y/)
})

test('connection preview snaps to the hovered target handle center', () => {
  const canvas = read('SailorWorkflowCanvas.vue')
  const preview = read('ConnectionPreviewLine.vue')

  assert.match(canvas, /import ConnectionPreviewLine/)
  assert.match(canvas, /#connection-line="connectionLineProps"/)
  assert.match(canvas, /<ConnectionPreviewLine v-bind="connectionLineProps" \/>/)
  assert.match(preview, /const targetPoint = computed/)
  assert.match(preview, /props\.targetHandle && props\.targetNode/)
  assert.match(preview, /getHandlePoint\(props\.targetNode, props\.targetHandle/)
  assert.match(preview, /props\.targetX/)
  assert.match(preview, /props\.targetY/)
})

test('canvas refreshes handle measurements after Vue Flow initializes every node', () => {
  const canvas = read('SailorWorkflowCanvas.vue')

  assert.match(canvas, /@nodes-initialized="onNodesInitialized"/)
  assert.match(canvas, /async function onNodesInitialized/)
  assert.match(canvas, /updateNodeInternals\(\)/)
})

test('canvas refreshes newly auto-connected nodes after they render', () => {
  const canvas = read('SailorWorkflowCanvas.vue')

  assert.match(canvas, /async function refreshAutoConnectedNodeInternals/)
  assert.match(canvas, /await nextTick\(\)[\s\S]*updateNodeInternals\(/)
  assert.match(canvas, /connectedNodeId \? \[nodeId, connectedNodeId\] : \[nodeId\]/)
  assert.match(canvas, /autoConnectToSource\([\s\S]*refreshAutoConnectedNodeInternals\(id,/)
  assert.match(canvas, /autoConnectToTarget\([\s\S]*refreshAutoConnectedNodeInternals\(id,/)
})

test('BaseNode refreshes only later changes to its handle geometry', () => {
  const source = read('BaseNode.vue')

  assert.match(source, /const handleGeometrySignature = computed/)
  assert.match(source, /watch\(handleGeometrySignature, refreshHandleGeometry/)
  assert.doesNotMatch(source, /onMounted\(refreshHandleGeometry\)/)
  assert.match(source, /updateNodeInternals\(\[props\.id\]\)/)
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
