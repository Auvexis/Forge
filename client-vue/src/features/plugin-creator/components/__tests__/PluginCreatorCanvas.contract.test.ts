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
    assert.match(source, /BaseEdge/)
    assert.match(source, /plugin-creator-edge/)
    assert.match(source, /blueprint\.canvas\.nodes/)
    assert.match(source, /blueprint\.canvas\.edges/)
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
  })
})
