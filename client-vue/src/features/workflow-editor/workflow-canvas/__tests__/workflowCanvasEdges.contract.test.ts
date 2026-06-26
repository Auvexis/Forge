import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

function read(relative: string) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8')
}

function readComponent(relative: string) {
  return readFileSync(fileURLToPath(new URL(`../../components/${relative}`, import.meta.url)), 'utf8')
}

describe('workflow canvas edges contract', () => {
  it('renders a workflow-owned SVG edge layer inside the BaseCanvas shell', () => {
    const canvas = readComponent('WorkflowBaseCanvas.vue')
    const layer = readComponent('WorkflowEdgeLayer.vue')

    assert.match(canvas, /WorkflowEdgeLayer/)
    assert.match(canvas, /:handle-registry="handleRegistry"/)
    assert.match(canvas, /:viewport="viewport"/)
    assert.match(layer, /<svg/)
    assert.match(layer, /viewBox=/)
    assert.match(layer, /workflow-edge-layer__svg/)
  })

  it('calculates anchors from the local handle registry without Vue Flow or global DOM queries', () => {
    const source = readComponent('WorkflowEdgeLayer.vue')

    assert.match(source, /handleRegistry\.getHandle/)
    assert.match(source, /getBoundingClientRect/)
    assert.match(source, /screenToWorld/)
    assert.doesNotMatch(source, /document\.querySelector/)
    assert.doesNotMatch(source, /useVueFlow/)
    assert.doesNotMatch(source, /@vue-flow\/core/)
  })

  it('preserves edge visuals, labels, item count, toolbar, and delete action', () => {
    const edge = readComponent('WorkflowEdge.vue')

    assert.match(edge, /marker-end/)
    assert.match(edge, /sailor-edge-toolbar/)
    assert.match(edge, /sailor-edge-item-count/)
    assert.match(edge, /sailor-edge-label-input/)
    assert.match(edge, /commitLabel/)
    assert.match(edge, /onDelete/)
    assert.match(edge, /onQuickAdd/)
    assert.match(edge, /strokeDasharray/)
  })

  it('removes the legacy Vue Flow BaseEdge wrapper from the editor path', () => {
    const workflowEdge = readComponent('WorkflowEdge.vue')

    assert.doesNotMatch(workflowEdge, /useVueFlow/)
    assert.doesNotMatch(workflowEdge, /EdgeLabelRenderer/)
    assert.doesNotMatch(workflowEdge, /@vue-flow\/core/)
  })
})
