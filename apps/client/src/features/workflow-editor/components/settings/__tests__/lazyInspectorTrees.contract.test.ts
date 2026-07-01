import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const nodeInspectorSource = readFileSync(
  fileURLToPath(new URL('../NodeInspectorModal.vue', import.meta.url)),
  'utf8',
)

const jsonTreeSource = readFileSync(
  fileURLToPath(new URL('../shared/JsonTreeView.vue', import.meta.url)),
  'utf8',
)

const variableTreeSource = readFileSync(
  fileURLToPath(new URL('../editors/VariableTree.vue', import.meta.url)),
  'utf8',
)

describe('lazy inspector trees', () => {
  it('opens the inspector before mounting heavy input and output trees', () => {
    assert.match(nodeInspectorSource, /const inputTreeReady = ref\(false\)/)
    assert.match(nodeInspectorSource, /const outputTreeReady = ref\(false\)/)
    assert.match(nodeInspectorSource, /function scheduleInspectorTrees\(\)/)
    assert.match(nodeInspectorSource, /<VariableTree[\s\S]*v-if="inputTreeReady"/)
    assert.match(nodeInspectorSource, /v-if="!outputTreeReady"[\s\S]*v-else[\s\S]*<JsonTreeView :data="displayOutput\.data"/)
  })

  it('does not recursively expand nested JSON branches by default', () => {
    assert.match(jsonTreeSource, /const isExpanded = ref\(Boolean\(props\.isRoot\)\)/)
    assert.match(jsonTreeSource, /:depth="depth \+ 1"/)
  })

  it('summarizes large variable values instead of cloning them into the picker tree', () => {
    assert.match(variableTreeSource, /function toTreePreviewValue/)
    assert.match(variableTreeSource, /<array length: \$\{value\.length\}>/)
    assert.doesNotMatch(variableTreeSource, /JSON\.parse\(JSON\.stringify\(p\.value\)\)/)
  })
})
