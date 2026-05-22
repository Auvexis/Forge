import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreator execution canvas contract', () => {
  it('passes plugin creator execution status to canvas nodes', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorCanvas.vue'), 'utf8')

    assert.match(source, /usePluginCreatorExecutionStore/)
    assert.match(source, /executionStore\.nodeStatuses\[node\.id\]\?\.status/)
    assert.match(source, /status:/)
  })

  it('uses a plugin-creator-owned edge that reads plugin creator execution state', () => {
    const canvasSource = fs.readFileSync(path.join(componentDir, 'PluginCreatorCanvas.vue'), 'utf8')
    const edgeSource = fs.readFileSync(path.join(componentDir, 'PluginCreatorEdge.vue'), 'utf8')

    assert.match(canvasSource, /import PluginCreatorEdge from '\.\/PluginCreatorEdge\.vue'/)
    assert.match(edgeSource, /usePluginCreatorExecutionStore/)
    assert.doesNotMatch(edgeSource, /useExecutionStore/)
  })

  it('defines execution marker ids for idle, success, failed and running', () => {
    const source = fs.readFileSync(path.join(componentDir, 'PluginCreatorCanvas.vue'), 'utf8')

    assert.match(source, /sailor-arrow-idle/)
    assert.match(source, /sailor-arrow-success/)
    assert.match(source, /sailor-arrow-failed/)
    assert.match(source, /sailor-arrow-running/)
  })

  it('passes status into BaseNode so NodeShimmer is used while waiting or running', () => {
    const nodeSource = fs.readFileSync(path.join(componentDir, 'nodes/RequestNode.vue'), 'utf8')
    const baseNodeSource = fs.readFileSync(
      path.resolve('src/features/workflow-editor/components/BaseNode.vue'),
      'utf8',
    )

    assert.match(nodeSource, /:status="data\.status/)
    assert.match(baseNodeSource, /NodeShimmer/)
    assert.match(baseNodeSource, /effectiveStatus === 'running'/)
    assert.match(baseNodeSource, /effectiveStatus === 'waiting'/)
  })
})
