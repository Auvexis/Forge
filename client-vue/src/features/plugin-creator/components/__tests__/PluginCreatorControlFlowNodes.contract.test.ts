import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreator control flow nodes contract', () => {
  it('registers control flow nodes in the palette and canvas', () => {
    const addPanel = fs.readFileSync(path.join(componentDir, 'PluginCreatorAddItemPanel.vue'), 'utf8')
    const canvas = fs.readFileSync(path.join(componentDir, 'PluginCreatorCanvas.vue'), 'utf8')

    for (const type of ['if', 'switch', 'tryCatch', 'jsonTransform', 'return', 'for', 'forEach']) {
      assert.match(addPanel, new RegExp(`'${type}'`))
      assert.match(canvas, new RegExp(`${type}: markRaw`))
    }
  })

  it('creates node components with BaseNode handles for control flow', () => {
    for (const file of [
      'IfNode.vue',
      'SwitchNode.vue',
      'TryCatchNode.vue',
      'JsonTransformNode.vue',
      'ReturnNode.vue',
      'ForNode.vue',
      'ForEachNode.vue',
    ]) {
      const source = fs.readFileSync(path.join(componentDir, 'nodes', file), 'utf8')
      assert.match(source, /BaseNode/)
      assert.match(source, /has-target/)
      assert.match(source, /has-source/)
      assert.match(source, /:status="data\.status/)
    }
  })

  it('adds settings editor sections for control flow node data', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'node-editors/PluginCreatorNodeEditorFields.vue'),
      'utf8',
    )

    assert.match(source, /kind === 'if'/)
    assert.match(source, /condition/)
    assert.match(source, /kind === 'switch'/)
    assert.match(source, /expression/)
    assert.match(source, /kind === 'tryCatch'/)
    assert.match(source, /errorVariable/)
    assert.match(source, /kind === 'jsonTransform'/)
    assert.match(source, /outputName/)
    assert.match(source, /kind === 'return'/)
    assert.match(source, /valueExpression/)
    assert.match(source, /kind === 'for'/)
    assert.match(source, /fromExpression/)
    assert.match(source, /kind === 'forEach'/)
    assert.match(source, /arrayExpression/)
  })
})
