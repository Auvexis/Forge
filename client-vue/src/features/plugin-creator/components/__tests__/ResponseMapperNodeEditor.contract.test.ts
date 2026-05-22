import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const editorDir = path.resolve('src/features/plugin-creator/components/node-editors')

describe('ResponseMapperNodeEditor contract', () => {
  it('uses MappingRowsEditor and latest response preview', () => {
    const source = fs.readFileSync(path.join(editorDir, 'ResponseMapperNodeEditor.vue'), 'utf8')

    assert.match(source, /MappingRowsEditor/)
    assert.match(source, /lastTestResult/)
    assert.match(source, /sampleResponse/)
  })

  it('mapping rows support duplicate remove reorder and path filling', () => {
    const source = fs.readFileSync(path.join(editorDir, 'MappingRowsEditor.vue'), 'utf8')

    assert.match(source, /Duplicate/)
    assert.match(source, /Remove/)
    assert.match(source, /Move up/)
    assert.match(source, /Move down/)
    assert.match(source, /Add mapping/)
    assert.match(source, /required/)
    assert.match(source, /path/)
  })
})
