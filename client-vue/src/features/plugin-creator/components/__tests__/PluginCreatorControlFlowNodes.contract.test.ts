import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreator control flow nodes contract', () => {
  it('registers control flow nodes in the palette and canvas', () => {
    const addPanel = fs.readFileSync(
      path.join(componentDir, 'PluginCreatorAddItemPanel.vue'),
      'utf8',
    )
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
      assert.match(source, /has-source|BaseHandle/)
      assert.match(source, /:status="data\.status/)
    }
  })

  it('adds dedicated editor sections for control flow node data', () => {
    const editorAssertions = {
      'IfNodeEditor.vue': /condition/,
      'SwitchNodeEditor.vue': /expression/,
      'TryCatchNodeEditor.vue': /errorVariable/,
      'JsonTransformNodeEditor.vue': /outputName/,
      'ReturnNodeEditor.vue': /valueExpression/,
      'ForNodeEditor.vue': /fromExpression/,
      'ForEachNodeEditor.vue': /arrayExpression/,
    }

    for (const [file, pattern] of Object.entries(editorAssertions)) {
      const source = fs.readFileSync(path.join(componentDir, 'node-editors', file), 'utf8')
      assert.match(source, pattern)
      assert.match(source, /updateNodeData/)
    }
  })
})
