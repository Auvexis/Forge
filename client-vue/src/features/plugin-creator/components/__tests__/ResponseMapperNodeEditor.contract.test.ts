import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const editorDir = path.resolve('src/features/plugin-creator/components/node-editors')

describe('ResponseMapperNodeEditor contract', () => {
  it('uses MappingRowsEditor without the sample response preview', () => {
    const source = fs.readFileSync(path.join(editorDir, 'ResponseMapperNodeEditor.vue'), 'utf8')

    assert.match(source, /MappingRowsEditor/)
    assert.doesNotMatch(source, /Sample Response/i)
    assert.doesNotMatch(source, /sampleResponse/)
  })

  it('mapping rows use compact icon-only remove actions and path filling', () => {
    const source = fs.readFileSync(path.join(editorDir, 'MappingRowsEditor.vue'), 'utf8')

    assert.match(source, /LucideIcon/)
    assert.match(source, /name="x"/)
    assert.doesNotMatch(source, />\s*Remove\s*</)
    assert.doesNotMatch(source, /Duplicate/)
    assert.doesNotMatch(source, /Move up/)
    assert.doesNotMatch(source, /Move down/)
    assert.match(source, /Add mapping/)
    assert.match(source, /required/)
    assert.match(source, /path/)
  })
})
