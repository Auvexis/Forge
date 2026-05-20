import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const nodesDir = path.resolve('src/features/plugin-creator/components/nodes')
const canvasPath = path.resolve('src/features/plugin-creator/components/PluginCreatorCanvas.vue')

describe('plugin creator mapper nodes', () => {
  it('render response, error and output mappings', () => {
    const files = ['ResponseMapperNode.vue', 'ErrorMapperNode.vue', 'OutputNode.vue']

    for (const file of files) {
      const source = fs.readFileSync(path.join(nodesDir, file), 'utf8')
      assert.match(source, /Handle/)
      assert.match(source, /data\.methodId/)
      assert.match(source, /data\.mappings|data\.errors|data\.outputs/)
    }
  })

  it('exposes actions for creating output and error rules', () => {
    const responseMapper = fs.readFileSync(path.join(nodesDir, 'ResponseMapperNode.vue'), 'utf8')
    const errorMapper = fs.readFileSync(path.join(nodesDir, 'ErrorMapperNode.vue'), 'utf8')

    assert.match(responseMapper, /Map selected field as output/)
    assert.match(responseMapper, /map-selected-field-as-output/)
    assert.match(errorMapper, /Create error rule from this response/)
    assert.match(errorMapper, /create-error-rule-from-response/)
  })

  it('registers mapper nodes in the canvas', () => {
    const canvas = fs.readFileSync(canvasPath, 'utf8')

    assert.match(canvas, /ResponseMapperNode/)
    assert.match(canvas, /ErrorMapperNode/)
    assert.match(canvas, /OutputNode/)
    assert.match(canvas, /responseMapper/)
    assert.match(canvas, /errorMapper/)
    assert.match(canvas, /output/)
  })
})
