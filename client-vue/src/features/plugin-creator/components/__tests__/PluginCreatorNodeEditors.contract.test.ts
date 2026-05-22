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
  })
})
