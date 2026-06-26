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

describe('workflow canvas connections contract', () => {
  it('adds a BaseCanvas-only connection layer without importing Vue Flow', () => {
    const canvas = readComponent('WorkflowBaseCanvas.vue')
    const layer = readComponent('WorkflowConnectionLayer.vue')

    assert.match(canvas, /WorkflowConnectionLayer/)
    assert.match(canvas, /:handle-registry="handleRegistry"/)
    assert.match(canvas, /@connection-create="createWorkflowConnection"/)
    assert.match(canvas, /@connection-cancel="cancelWorkflowConnection"/)
    assert.match(layer, /pointerdown/)
    assert.match(layer, /pointermove/)
    assert.match(layer, /pointerup/)
    assert.match(layer, /WorkflowConnectionPreviewLine/)
    assert.doesNotMatch(layer, /@vue-flow\/core/)
    assert.doesNotMatch(layer, /useVueFlow/)
  })

  it('starts connection drag from WorkflowHandle data and never queries the global document', () => {
    const handle = readComponent('WorkflowHandle.vue')
    const layer = readComponent('WorkflowConnectionLayer.vue')

    assert.match(handle, /data-workflow-handle-id/)
    assert.match(handle, /data-workflow-handle-type/)
    assert.match(layer, /closest\('\[data-workflow-handle-id\]'\)/)
    assert.match(layer, /handleRegistry\.getHandle/)
    assert.match(layer, /screenToWorld/)
    assert.doesNotMatch(layer, /document\.querySelector/)
  })

  it('creates edges through workflow-native helpers and preserves advanced config arrangement', () => {
    const canvas = readComponent('WorkflowBaseCanvas.vue')
    const helpers = read('workflowCanvasConnections.ts')

    assert.match(canvas, /createWorkflowConnection/)
    assert.match(canvas, /createWorkflowConnectionEdge/)
    assert.match(canvas, /arrangeAdvancedConfigNodes/)
    assert.match(canvas, /getAdvancedChildPosition/)
    assert.match(canvas, /getAdvancedNodeHandlers/)
    assert.match(helpers, /nextConnectionAction/)
    assert.match(helpers, /connectionPolicy/)
    assert.match(helpers, /cardinality/)
  })

  it('keeps the shared BaseCanvas implementation clean and removes the legacy connection path', () => {
    const baseCanvas = readFileSync(fileURLToPath(new URL('../../../../shared/base-canvas/BaseCanvas.vue', import.meta.url)), 'utf8')
    const workflowCanvas = readComponent('SailorWorkflowCanvas.vue')
    const layer = readComponent('WorkflowConnectionLayer.vue')

    assert.doesNotMatch(baseCanvas, /WorkflowConnectionLayer/)
    assert.doesNotMatch(workflowCanvas, /@connect-start/)
    assert.doesNotMatch(workflowCanvas, /@connect=/)
    assert.doesNotMatch(workflowCanvas, /@connect-end/)
    assert.match(workflowCanvas, /WorkflowBaseCanvas/)
    assert.doesNotMatch(layer, /@vue-flow\/core/)
  })
})
