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

describe('workflow canvas handles contract', () => {
  it('defines workflow-native handle types without importing Vue Flow', () => {
    const source = read('workflowCanvasHandles.ts')

    assert.match(source, /export type WorkflowHandleSide = 'top' \| 'right' \| 'bottom' \| 'left'/)
    assert.match(source, /export type WorkflowHandleType = 'source' \| 'target'/)
    assert.match(source, /export type WorkflowHandleVariant = 'bar' \| 'circle' \| 'diamond'/)
    assert.match(source, /normalizeWorkflowHandleSide/)
    assert.doesNotMatch(source, /@vue-flow\/core/)
  })

  it('creates a registry keyed by node id and handle id for later edge anchoring', () => {
    const source = read('workflowCanvasHandles.ts')

    assert.match(source, /createWorkflowHandleRegistry/)
    assert.match(source, /registerHandle/)
    assert.match(source, /getNodeHandles/)
    assert.match(source, /getHandle/)
    assert.match(source, /workflowCanvasHandleRegistryKey/)
    assert.match(source, /workflowCanvasNodeIdKey/)
  })

  it('renders WorkflowHandle without Vue Flow and preserves visual variants', () => {
    const source = readComponent('WorkflowHandle.vue')

    assert.match(source, /registerHandle/)
    assert.match(source, /data-workflow-handle-id/)
    assert.match(source, /data-workflow-node-id/)
    assert.match(source, /sailor-base-handle__visual/)
    assert.match(source, /is-variant-bar/)
    assert.match(source, /is-variant-diamond/)
    assert.doesNotMatch(source, /@vue-flow\/core/)
  })

  it('keeps BaseHandle Vue Flow compatible while switching to WorkflowHandle inside WorkflowBaseCanvas', () => {
    const source = readComponent('BaseHandle.vue')

    assert.match(source, /WorkflowHandle/)
    assert.match(source, /isWorkflowBaseCanvasHandleMode/)
    assert.match(source, /<Handle/)
    assert.match(source, /<WorkflowHandle/)
  })

  it('provides handle mode and node id from the workflow BaseCanvas shell', () => {
    const canvas = readComponent('WorkflowBaseCanvas.vue')
    const host = readComponent('WorkflowCanvasNodeHost.vue')

    assert.match(canvas, /provide\(isWorkflowBaseCanvasHandleModeKey, true\)/)
    assert.match(canvas, /provide\(workflowCanvasHandleRegistryKey, handleRegistry\)/)
    assert.match(canvas, /WorkflowCanvasNodeHost/)
    assert.match(host, /provide\(workflowCanvasNodeIdKey/)
    assert.match(host, /:id="item\.id"/)
    assert.match(host, /:has-outgoing-connection="hasOutgoingConnection"/)
  })

  it('skips Vue Flow handle measurement refreshes in WorkflowBaseCanvas mode', () => {
    const source = readComponent('BaseNode.vue')

    assert.match(source, /isWorkflowBaseCanvasHandleModeKey/)
    assert.match(source, /if \(isWorkflowBaseCanvasHandleMode\) return/)
    assert.match(source, /updateNodeInternals\(\[props\.id\]\)/)
  })
})
