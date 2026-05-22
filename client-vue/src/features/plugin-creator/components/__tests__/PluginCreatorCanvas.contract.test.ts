import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreatorCanvas contract', () => {
  it('uses VueFlow and maps blueprint nodes and edges', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorCanvas.vue'), 'utf8')

    assert.match(source, /VueFlow/)
    assert.match(source, /@vue-flow\/core/)
    assert.match(source, /PluginCreatorEdge/)
    assert.match(source, /plugin-creator-edge/)
    assert.match(source, /blueprint\.canvas\.nodes/)
    assert.match(source, /blueprint\.canvas\.edges/)
  })

  it('registers the code block canvas node', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorCanvas.vue'), 'utf8')

    assert.match(source, /CodeBlockNode/)
    assert.match(source, /codeBlock:\s*markRaw\(CodeBlockNode\)/)
  })

  it('syncs canvas interactions back to the plugin blueprint', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorCanvas.vue'), 'utf8')

    assert.match(source, /@node-drag-stop="onNodeDragStop"/)
    assert.match(source, /@connect="onConnect"/)
    assert.match(source, /@edges-change="onEdgesChange"/)
    assert.match(source, /@node-double-click="onNodeDoubleClick"/)
    assert.match(source, /'update-node-position'/)
    assert.match(source, /'connect-nodes'/)
    assert.match(source, /'open-node-settings'/)
    assert.match(source, /'delete-selected'/)
    assert.match(source, /defineExpose/)
    assert.match(source, /zoomTo/)
    assert.match(source, /deleteSelection/)
    assert.match(source, /centerPosition/)
  })

  it('marks plugin creator nodes that already have outgoing connections', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorCanvas.vue'), 'utf8')

    assert.match(source, /hasOutgoingConnection/)
    assert.match(source, /blueprint\.canvas\.edges\.some/)
  })

  it('can translate the viewport center into flow coordinates for new nodes', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorCanvas.vue'), 'utf8')

    assert.match(source, /ref="canvasElement"/)
    assert.match(source, /screenToFlowCoordinate/)
    assert.match(source, /getBoundingClientRect/)
  })

  it('uses a plugin-creator-owned group selection box', () => {
    const canvasSource = fs.readFileSync(path.join(componentDir, 'PluginCreatorCanvas.vue'), 'utf8')
    const boxSource = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorNodeGroupSelectionBox.vue'),
      'utf8',
    )

    assert.match(canvasSource, /PluginCreatorNodeGroupSelectionBox/)
    assert.match(boxSource, /sailor-group-box-outer/)
    assert.match(boxSource, /onDuplicateSelection/)
    assert.match(boxSource, /onDeleteSelection/)
  })

  it('shows live selection marquee and workflow-style empty add button', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorCanvas.vue'), 'utf8')

    assert.match(source, /@selection-drag-start/)
    assert.match(source, /@selection-drag-stop/)
    assert.match(source, /selection-key-code="Control"/)
    assert.match(source, /isCanvasSelecting/)
    assert.match(source, /:deep\(\.vue-flow__selectionpane\)/)
    assert.match(source, /canvas-empty-step/)
    assert.match(source, /Add first step/)
    assert.match(source, /openAddItem/)
  })
})
