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

describe('workflow canvas selection contract', () => {
  it('keeps BaseCanvas-owned simple, marquee, and multi-selection wired in WorkflowBaseCanvas', () => {
    const canvas = readComponent('WorkflowBaseCanvas.vue')

    assert.match(canvas, /v-model:selection="canvasSelection"/)
    assert.match(canvas, /:marquee-selection="true"/)
    assert.match(canvas, /canvasSelection\.includes\(item\.id\)/)
    assert.match(canvas, /WorkflowSelectionBox/)
    assert.match(canvas, /:selection="canvasSelection"/)
  })

  it('adds WorkflowBaseCanvas selection commands without importing Vue Flow', () => {
    const canvas = readComponent('WorkflowBaseCanvas.vue')
    const commands = read('workflowCanvasSelection.ts')

    assert.match(canvas, /defineExpose/)
    assert.match(canvas, /selectAllNodes/)
    assert.match(canvas, /clearSelection/)
    assert.match(canvas, /duplicateSelection/)
    assert.match(canvas, /deleteSelection/)
    assert.match(canvas, /duplicateWorkflowSelection/)
    assert.match(canvas, /deleteWorkflowSelection/)
    assert.match(commands, /selectAllWorkflowNodeIds/)
    assert.match(commands, /normalizeWorkflowSelection/)
    assert.doesNotMatch(commands, /@vue-flow\/core/)
    assert.doesNotMatch(canvas, /useVueFlow/)
  })

  it('renders a workflow-owned group selection box with duplicate and delete actions', () => {
    const selectionBox = readComponent('WorkflowSelectionBox.vue')

    assert.match(selectionBox, /sailor-group-box-outer/)
    assert.match(selectionBox, /sailor-group-toolbar/)
    assert.match(selectionBox, /selectedItems/)
    assert.match(selectionBox, /duplicateSelection/)
    assert.match(selectionBox, /deleteSelection/)
    assert.match(selectionBox, /viewport\.zoom/)
    assert.doesNotMatch(selectionBox, /EdgeLabelRenderer/)
    assert.doesNotMatch(selectionBox, /useVueFlow/)
    assert.doesNotMatch(selectionBox, /@vue-flow\/core/)
  })

  it('handles node toolbar actions through the BaseCanvas path without Vue Flow runtime APIs', () => {
    const canvas = readComponent('WorkflowBaseCanvas.vue')
    const toolbar = readComponent('nodes/NodeToolbar.vue')

    assert.match(canvas, /node:toolbar-action/)
    assert.match(canvas, /handleNodeToolbarAction/)
    assert.match(canvas, /duplicateNodeFromToolbar/)
    assert.match(canvas, /deleteNodeFromToolbar/)
    assert.match(canvas, /toggleNodeDisabled/)
    assert.match(toolbar, /node:toolbar-action/)
    assert.doesNotMatch(toolbar, /useVueFlow/)
    assert.doesNotMatch(toolbar, /@vue-flow\/core/)
  })
})
