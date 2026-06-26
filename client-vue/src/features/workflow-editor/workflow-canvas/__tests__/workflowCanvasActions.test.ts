import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  getWorkflowCanvasCenter,
  getWorkflowCanvasFitViewport,
  screenPointToWorkflowWorld,
  zoomWorkflowCanvasViewport,
} from '../workflowCanvasActions.ts'

describe('workflow canvas editor actions', () => {
  it('converts screen points into BaseCanvas world coordinates', () => {
    assert.deepEqual(screenPointToWorkflowWorld({
      point: { x: 260, y: 180 },
      canvasRect: { left: 100, top: 80, width: 500, height: 300 },
      viewport: { x: 40, y: 20, zoom: 2 },
    }), { x: 60, y: 40 })
  })

  it('gets viewport center in world coordinates', () => {
    assert.deepEqual(getWorkflowCanvasCenter({
      canvasRect: { left: 0, top: 0, width: 800, height: 600 },
      viewport: { x: 100, y: 50, zoom: 2 },
    }), { x: 150, y: 125 })
  })

  it('zooms around the current viewport center', () => {
    assert.deepEqual(zoomWorkflowCanvasViewport({
      viewport: { x: 100, y: 50, zoom: 1 },
      canvasRect: { left: 0, top: 0, width: 800, height: 600 },
      factor: 1.2,
      minZoom: 0.5,
      maxZoom: 1.5,
    }), { x: 40, y: 0, zoom: 1.2 })
  })

  it('fits workflow items into the visible canvas', () => {
    assert.deepEqual(getWorkflowCanvasFitViewport({
      items: [
        { id: 'a', x: 0, y: 0, width: 200, height: 100 },
        { id: 'b', x: 400, y: 300, width: 200, height: 100 },
      ],
      canvasRect: { left: 0, top: 0, width: 1000, height: 800 },
      padding: 100,
      minZoom: 0.5,
      maxZoom: 1.5,
    }), { x: 100, y: 133.33333333333337, zoom: 1.3333333333333333 })
  })
})
