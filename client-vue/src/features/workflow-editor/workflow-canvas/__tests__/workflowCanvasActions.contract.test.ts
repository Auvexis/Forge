import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

function read(relative: string) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8')
}

function readComponent(relative: string) {
  return readFileSync(
    fileURLToPath(new URL(`../../components/${relative}`, import.meta.url)),
    'utf8',
  )
}

describe('workflow canvas editor actions contract', () => {
  it('exposes editor actions from WorkflowBaseCanvas without Vue Flow', () => {
    const canvas = readComponent('WorkflowBaseCanvas.vue')
    const helpers = read('workflowCanvasActions.ts')

    assert.match(canvas, /handleRun/)
    assert.match(canvas, /handleStop/)
    assert.match(canvas, /openAddNodePanel/)
    assert.match(canvas, /addLogicNodeAtViewportCenter/)
    assert.match(canvas, /addPluginNodeAtViewportCenter/)
    assert.match(canvas, /addLogicNodeAtScreenPoint/)
    assert.match(canvas, /addPluginNodeAtScreenPoint/)
    assert.match(canvas, /zoomIn/)
    assert.match(canvas, /zoomOut/)
    assert.match(canvas, /zoomReset/)
    assert.match(canvas, /fitWorkflowView/)
    assert.match(helpers, /screenPointToWorkflowWorld/)
    assert.match(helpers, /getWorkflowCanvasCenter/)
    assert.match(helpers, /zoomWorkflowCanvasViewport/)
    assert.match(helpers, /getWorkflowCanvasFitViewport/)
    assert.doesNotMatch(canvas, /useVueFlow/)
    assert.doesNotMatch(helpers, /@vue-flow\/core/)
  })

  it('delegates public SailorWorkflowCanvas actions directly to WorkflowBaseCanvas', () => {
    const canvas = readComponent('SailorWorkflowCanvas.vue')

    assert.match(canvas, /workflowBaseCanvasRef/)
    assert.match(canvas, /workflowBaseCanvasRef\.value\?\.addLogicNodeAtViewportCenter/)
    assert.match(canvas, /workflowBaseCanvasRef\.value\?\.addPluginNodeAtScreenPoint/)
    assert.match(canvas, /workflowBaseCanvasRef\.value\?\.zoomIn/)
    assert.match(canvas, /workflowBaseCanvasRef\.value\?\.fitWorkflowView/)
    assert.match(canvas, /@drop="handleGlobalAddNodeDrop"/)
    assert.doesNotMatch(canvas, /useWorkflowBaseCanvas/)
  })

  it('keeps run, stop, quick-add, and edge quick-add buses available in the BaseCanvas path', () => {
    const canvas = readComponent('SailorWorkflowCanvas.vue')
    const base = readComponent('WorkflowBaseCanvas.vue')

    assert.match(canvas, /quickAddAnchorPoint/)
    assert.match(canvas, /QUICK_ADD_NODE_VERTICAL_OFFSET/)
    assert.match(canvas, /addLogicNodeAtScreenPoint/)
    assert.match(base, /useEventBus[\s\S]*\('node:quick-add'\)/)
    assert.match(base, /useEventBus[\s\S]*\('edge:quick-add-between'\)/)
    assert.match(base, /pendingAddNodePoint/)
    assert.match(base, /pendingInsertEdgeId/)
    assert.match(base, /insertNodeBetween/)
    assert.match(base, /pendingQuickAddAlignment/)
    assert.match(base, /getQuickAddAlignedNodePosition/)
    assert.match(base, /executionStore\.execute/)
    assert.match(base, /executionStore\.cancel/)
  })

  it('keeps the shared BaseCanvas implementation untouched by workflow editor actions', () => {
    const baseCanvas = readFileSync(
      fileURLToPath(new URL('../../../../shared/base-canvas/BaseCanvas.vue', import.meta.url)),
      'utf8',
    )

    assert.doesNotMatch(baseCanvas, /addLogicNodeAtViewportCenter/)
    assert.doesNotMatch(baseCanvas, /WorkflowBaseCanvas/)
    assert.doesNotMatch(baseCanvas, /workflowStore/)
  })

  it('uses BaseCanvas animation only for programmatic viewport controls', () => {
    const base = readComponent('WorkflowBaseCanvas.vue')

    assert.match(base, /ref="baseCanvasRef"/)
    assert.match(base, /animateViewportTo/)
    assert.match(base, /zoomIn\(\)[\s\S]*animateWorkflowViewport/)
    assert.match(base, /zoomOut\(\)[\s\S]*animateWorkflowViewport/)
    assert.match(base, /zoomReset\(\)[\s\S]*animateWorkflowViewport/)
    assert.match(base, /fitWorkflowView\(\)[\s\S]*animateWorkflowViewport/)
  })
})
