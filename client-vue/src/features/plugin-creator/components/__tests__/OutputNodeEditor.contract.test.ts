import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentsDir = path.resolve('src/features/plugin-creator/components')

describe('OutputNodeEditor contract', () => {
  it('supports multiple fields source modes and schema preview', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'node-editors/OutputNodeEditor.vue'),
      'utf8',
    )

    assert.match(source, /v-for/)
    assert.match(source, /Add output/)
    assert.match(source, /LucideIcon/)
    assert.match(source, /name="x"/)
    assert.doesNotMatch(source, />\s*Remove\s*</)
    assert.doesNotMatch(source, /Duplicate/)
    assert.match(source, /source mode/)
    assert.match(source, /path/)
    assert.match(source, /expression/)
    assert.match(source, /Output schema preview/)
    assert.match(source, /required/)
  })
})
