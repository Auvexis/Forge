import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

function read(relative: string) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8')
}

describe('workflow BaseCanvas validation contract', () => {
  it('exposes stable visual validation hooks for the BaseCanvas editor path', () => {
    const shell = read('WorkflowBaseCanvas.vue')
    const host = read('WorkflowCanvasNodeHost.vue')
    const edgeLayer = read('WorkflowEdgeLayer.vue')
    const connectionLayer = read('WorkflowConnectionLayer.vue')
    const selectionBox = read('WorkflowSelectionBox.vue')

    assert.match(shell, /data-workflow-base-canvas-shell/)
    assert.match(shell, /data-workflow-base-canvas/)
    assert.match(host, /data-workflow-node-id/)
    assert.match(host, /data-workflow-node-type/)
    assert.match(edgeLayer, /data-workflow-edge-layer/)
    assert.match(connectionLayer, /data-workflow-connection-layer/)
    assert.match(selectionBox, /data-workflow-selection-box/)
  })

  it('keeps simple, advanced, and branch node types registered in the BaseCanvas path', () => {
    const shell = read('WorkflowBaseCanvas.vue')

    for (const nodeType of ['http', 'code', 'plugin', 'ai-agent', 'ai-model', 'ai-tool', 'if', 'switch', 'loop']) {
      assert.match(shell, new RegExp(`['"]${nodeType}['"]`))
    }
  })
})
