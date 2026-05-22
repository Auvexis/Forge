import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const editorDir = path.resolve('src/features/plugin-creator/components/node-editors')

describe('ErrorMapperNodeEditor contract', () => {
  it('uses ErrorConditionEditor and latest response preview', () => {
    const source = fs.readFileSync(path.join(editorDir, 'ErrorMapperNodeEditor.vue'), 'utf8')

    assert.match(source, /ErrorConditionEditor/)
    assert.match(source, /lastTestResult/)
    assert.match(source, /latestResponse/)
    assert.match(source, /Add error mapping/)
  })

  it('condition editor supports condition and message builder controls', () => {
    const source = fs.readFileSync(path.join(editorDir, 'ErrorConditionEditor.vue'), 'utf8')

    assert.match(source, /source/)
    assert.match(source, /operator/)
    assert.match(source, /Body path/)
    assert.match(source, /Compare value/)
    assert.match(source, /Message/)
    assert.match(source, /Duplicate/)
    assert.match(source, /Remove/)
  })
})
