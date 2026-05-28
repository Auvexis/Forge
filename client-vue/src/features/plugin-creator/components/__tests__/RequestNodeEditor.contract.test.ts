import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const editorDir = path.resolve('src/features/plugin-creator/components/node-editors')

describe('RequestNodeEditor contract', () => {
  it('uses dedicated key-value and body editors for rich request editing', () => {
    const source = fs.readFileSync(path.join(editorDir, 'RequestNodeEditor.vue'), 'utf8')

    assert.match(source, /KeyValueTableEditor/)
    assert.match(source, /RequestBodyEditor/)
    assert.match(source, /PluginCreatorExpressionInput/)
    assert.match(source, /requestPreview/)
  })

  it('key-value table uses compact icon-only remove actions', () => {
    const source = fs.readFileSync(path.join(editorDir, 'KeyValueTableEditor.vue'), 'utf8')

    assert.match(source, /LucideIcon/)
    assert.match(source, /name="x"/)
    assert.doesNotMatch(source, />\s*Remove\s*</)
    assert.doesNotMatch(source, /Duplicate/)
    assert.doesNotMatch(source, /Move up/)
    assert.doesNotMatch(source, /Move down/)
    assert.match(source, /PluginCreatorExpressionInput/)
    assert.match(source, /empty/i)
  })

  it('request body editor exposes body mode controls and JSON validation', () => {
    const source = fs.readFileSync(path.join(editorDir, 'RequestBodyEditor.vue'), 'utf8')

    assert.match(source, /none/)
    assert.match(source, /json/)
    assert.match(source, /text/)
    assert.match(source, /form/)
    assert.match(source, /jsonError/)
    assert.match(source, /BaseCodeEditor/)
  })
})
