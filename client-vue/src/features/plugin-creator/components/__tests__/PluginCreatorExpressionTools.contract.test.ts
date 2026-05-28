import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentDir = path.resolve('src/features/plugin-creator/components')

describe('PluginCreator expression tools contract', () => {
  it('creates plugin creator expression components and variable tree', () => {
    for (const file of [
      'expressions/PluginCreatorExpressionInput.vue',
      'expressions/PluginCreatorExpressionTextarea.vue',
      'PluginCreatorVariableTree.vue',
    ]) {
      const source = fs.readFileSync(path.join(componentDir, file), 'utf8')
      assert.match(source, /params/)
      assert.match(source, /credentials/)
      assert.match(source, /steps/)
    }
  })

  it('renders expression inputs through BaseInput without insert-variable controls', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'expressions/PluginCreatorExpressionInput.vue'),
      'utf8',
    )

    assert.match(source, /BaseInput/)
    assert.doesNotMatch(source, /PluginCreatorVariablePicker/)
    assert.doesNotMatch(source, /Insert variable/)
    assert.doesNotMatch(source, /<input/)
    assert.match(source, /plugin-creator-expression-input__field/)
  })

  it('uses expression components in control flow node settings', () => {
    const source = fs.readFileSync(
      path.join(componentDir, 'node-editors/PluginCreatorNodeEditorFields.vue'),
      'utf8',
    )

    assert.match(source, /PluginCreatorExpressionInput/)
    assert.match(source, /PluginCreatorExpressionTextarea/)
    assert.match(source, /PluginCreatorVariableTree/)
  })
})
