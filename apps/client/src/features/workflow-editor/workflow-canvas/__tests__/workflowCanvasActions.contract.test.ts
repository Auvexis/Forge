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
    assert.match(helpers, /getWorkflowCanvasResetZoomViewport/)
    assert.match(helpers, /getWorkflowCanvasFitViewport/)
    assert.doesNotMatch(canvas, /useVueFlow/)
    assert.doesNotMatch(helpers, /@vue-flow\/core/)
  })

  it('delegates public FabricWorkflowCanvas actions directly to WorkflowBaseCanvas', () => {
    const canvas = readComponent('FabricWorkflowCanvas.vue')

    assert.match(canvas, /workflowBaseCanvasRef/)
    assert.match(canvas, /workflowBaseCanvasRef\.value\?\.addLogicNodeAtViewportCenter/)
    assert.match(canvas, /workflowBaseCanvasRef\.value\?\.addPluginNodeAtScreenPoint/)
    assert.match(canvas, /workflowBaseCanvasRef\.value\?\.zoomIn/)
    assert.match(canvas, /workflowBaseCanvasRef\.value\?\.selectNode/)
    assert.match(canvas, /workflowBaseCanvasRef\.value\?\.focusNode/)
    assert.match(canvas, /workflowBaseCanvasRef\.value\?\.highlightNode/)
    assert.match(canvas, /workflowBaseCanvasRef\.value\?\.fitWorkflowView/)
    assert.match(canvas, /@drop="handleGlobalAddNodeDrop"/)
    assert.doesNotMatch(canvas, /useWorkflowBaseCanvas/)
  })

  it('opens the floating node picker at an empty canvas context-menu point', () => {
    const canvas = readComponent('FabricWorkflowCanvas.vue')

    assert.match(canvas, /@contextmenu="handleCanvasContextMenu"/)
    assert.match(canvas, /function handleCanvasContextMenu\(event: MouseEvent\)/)
    assert.match(canvas, /data-base-canvas-item-id/)
    assert.match(canvas, /event\.preventDefault\(\)/)
    assert.match(canvas, /nodePoint: \{ x: event\.clientX, y: event\.clientY \}/)
    assert.match(canvas, /openAddNodePanel/)
  })

  it('keeps run, stop, quick-add, and edge quick-add buses available in the BaseCanvas path', () => {
    const canvas = readComponent('FabricWorkflowCanvas.vue')
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

  it('opens quick-add when a handle connection is dropped on empty canvas', () => {
    const base = readComponent('WorkflowBaseCanvas.vue')
    const connectionLayer = readComponent('WorkflowConnectionLayer.vue')
    const preview = readComponent('WorkflowConnectionPreviewLine.vue')
    const shell = readComponent('FabricWorkflowCanvas.vue')

    assert.match(connectionLayer, /connectionDrop/)
    assert.match(connectionLayer, /!hoveredHandle\.value/)
    assert.match(connectionLayer, /clientPoint/)
    assert.match(base, /@connection-drop="handleConnectionDrop"/)
    assert.match(base, /function handleConnectionDrop/)
    assert.match(base, /sourceId: payload\.start\.nodeId/)
    assert.match(base, /targetId: payload\.start\.nodeId/)
    assert.match(base, /preservePosition: Boolean\(pendingPosition\)/)
    assert.match(base, /preservePosition: true/)
    assert.match(base, /!options\.preservePosition/)
    assert.match(base, /horizontalGap: -QUICK_ADD_HORIZONTAL_GAP/)
    assert.match(base, /cancelPendingAddNode/)
    assert.match(shell, /cancelPendingAddNode/)
    assert.match(preview, /stroke: var\(--fabric-rf-edge-stroke-selected\)/)
    assert.doesNotMatch(preview, /fabric-red/)
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
    assert.match(base, /zoomReset\(\)[\s\S]*getWorkflowCanvasResetZoomViewport\(viewport\.value\)[\s\S]*animateWorkflowViewport/)
    assert.match(base, /fitWorkflowView\(\)[\s\S]*animateWorkflowViewport/)
  })
})
