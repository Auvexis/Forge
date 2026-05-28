import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const editorDir = path.resolve('src/features/plugin-creator/components/node-editors')

function readEditorFile(fileName: string) {
  return fs.readFileSync(path.join(editorDir, fileName), 'utf8')
}

describe('PluginCreator node editor foundation', () => {
  it('provides shared context helpers for focused node editors', () => {
    const source = readEditorFile('usePluginCreatorNodeEditorContext.ts')

    assert.match(source, /usePluginCreatorNodeEditorContext/)
    assert.match(source, /node = computed/)
    assert.match(source, /method = computed/)
    assert.match(source, /methodId = computed/)
    assert.match(source, /updateNodeData/)
    assert.match(source, /updateMethodPatch/)
  })

  it('provides reusable editor value parsing helpers', () => {
    const source = readEditorFile('editorValueUtils.ts')

    assert.match(source, /stringifyEditorValue/)
    assert.match(source, /parseEditorValue/)
    assert.match(source, /parseJsonObject/)
    assert.match(source, /parseJsonArray/)
  })

  it('provides a consistent editor section shell', () => {
    const source = readEditorFile('NodeEditorSection.vue')

    assert.match(source, /node-editor-section/)
    assert.match(source, /<slot name="toolbar"/)
    assert.match(source, /<slot \/>/)
    assert.match(source, /eyebrow/)
    assert.match(source, /LucideIcon/)
    assert.match(source, /node-editor-section--flush/)
    assert.doesNotMatch(source, /border-bottom:\s*1px solid var\(--sailor-border-subtle\)/)
  })

  it('expression controls share Workflow Editor field and hint chrome', () => {
    const inputSource = fs.readFileSync(
      path.resolve('src/features/plugin-creator/components/expressions/PluginCreatorExpressionInput.vue'),
      'utf8',
    )
    const textareaSource = fs.readFileSync(
      path.resolve(
        'src/features/plugin-creator/components/expressions/PluginCreatorExpressionTextarea.vue',
      ),
      'utf8',
    )

    for (const source of [inputSource, textareaSource]) {
      assert.match(source, /editor-field/)
      assert.match(source, /editor-field__label/)
      assert.match(source, /editor-expression-control/)
      assert.match(source, /editor-hint/)
      assert.match(source, /editor-code-snippet/)
    }
  })

  it('does not render insert-variable buttons inside node editor expression fields', () => {
    const inputSource = fs.readFileSync(
      path.resolve('src/features/plugin-creator/components/expressions/PluginCreatorExpressionInput.vue'),
      'utf8',
    )
    const textareaSource = fs.readFileSync(
      path.resolve('src/features/plugin-creator/components/expressions/PluginCreatorExpressionTextarea.vue'),
      'utf8',
    )

    for (const source of [inputSource, textareaSource]) {
      assert.doesNotMatch(source, /PluginCreatorVariablePicker/)
      assert.doesNotMatch(source, /Insert variable/)
      assert.doesNotMatch(source, /plugin-creator-variable-picker/)
    }
  })
})

describe('PluginCreator focused node editors', () => {
  for (const fileName of [
    'RequestNodeEditor.vue',
    'MethodNodeEditor.vue',
    'ResponseMapperNodeEditor.vue',
    'ErrorMapperNodeEditor.vue',
    'CodeBlockNodeEditor.vue',
    'OutputNodeEditor.vue',
  ]) {
    it(`${fileName} is a focused editor and not a monolith wrapper`, () => {
      const source = readEditorFile(fileName)

      assert.match(source, /NodeEditorSection/)
      assert.match(source, /usePluginCreatorNodeEditorContext/)
      assert.doesNotMatch(source, /PluginCreatorNodeEditorFields/)
    })
  }

  it('settings panel routes core node types to focused editors', () => {
    const source = fs.readFileSync(
      path.resolve('src/features/plugin-creator/components/PluginCreatorNodeSettingsPanel.vue'),
      'utf8',
    )

    assert.match(source, /CodeBlockNodeEditor/)
    assert.match(source, /OutputNodeEditor/)
    assert.match(source, /case 'codeBlock':\s*return CodeBlockNodeEditor/s)
    assert.match(source, /case 'output':\s*return OutputNodeEditor/s)
  })

  it('method editor exposes a detailed workflow-style method overview', () => {
    const source = readEditorFile('MethodNodeEditor.vue')

    assert.match(source, /usePluginCreatorNodeEditorContext/)
    assert.match(source, /te-hint/)
    assert.match(source, /editor-code-snippet/)
    assert.match(source, /Inputs/)
    assert.match(source, /Credentials/)
    assert.match(source, /Method metadata/)
    assert.match(source, /Add input/)
    assert.match(source, /Add credential/)
    assert.match(source, /method-node-editor__row-action/)
    assert.doesNotMatch(source, /PluginCreatorNodeEditorFields/)
  })
})
