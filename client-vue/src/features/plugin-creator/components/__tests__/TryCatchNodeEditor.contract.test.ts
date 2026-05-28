import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const componentsDir = path.resolve('src/features/plugin-creator/components')

describe('TryCatchNodeEditor contract', () => {
  it('edits error variable and multiple stable catch cases', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'node-editors/TryCatchNodeEditor.vue'),
      'utf8',
    )

    assert.match(source, /Try\/Catch/)
    assert.match(source, /errorVariable/)
    assert.match(source, /catchCases/)
    assert.match(source, /errorCode/)
    assert.match(source, /handle/)
    assert.match(source, /Add catch/)
    assert.match(source, /Fallback catch/)
    assert.match(source, /BaseBadge/)
    assert.match(source, /LucideIcon/)
    assert.match(source, /name="x"/)
    assert.match(source, /updateNodeData/)
  })

  it('settings panel routes tryCatch nodes to TryCatchNodeEditor', () => {
    const source = fs.readFileSync(
      path.join(componentsDir, 'PluginCreatorNodeSettingsPanel.vue'),
      'utf8',
    )

    assert.match(source, /TryCatchNodeEditor/)
    assert.match(source, /case 'tryCatch':\s*return TryCatchNodeEditor/)
  })
})
