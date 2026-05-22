import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const editorDir = path.resolve('src/features/plugin-creator/components/node-editors')

describe('CodeBlockNodeEditor contract', () => {
  it('provides source editor, output variable, snippets and safety warnings', () => {
    const source = fs.readFileSync(path.join(editorDir, 'CodeBlockNodeEditor.vue'), 'utf8')

    assert.match(source, /BaseCodeEditor/)
    assert.match(source, /Output variable/)
    assert.match(source, /insertSnippet/)
    assert.match(source, /return previous;/)
    assert.match(source, /return \{ \.\.\.previous \};/)
    assert.match(source, /context\.credentials/)
    assert.match(source, /Blocked runtime access/)
    assert.match(source, /import|require|process|eval|Function/)
  })
})
