import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

const pagePath = path.resolve('src/app/pages/PluginCreatorPage.vue')

describe('PluginCreatorPage contract', () => {
  it('initializes a usable draft workspace when the route opens', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /useRoute/)
    assert.match(source, /onMounted/)
    assert.match(source, /loadInitialBlueprint/)
    assert.match(source, /includeDefaultMethod:\s*true/)
  })

  it('wires header and floating toolbar lifecycle actions to the store', () => {
    const source = fs.readFileSync(pagePath, 'utf8')

    assert.match(source, /@run="runSelectedMethod"/)
    assert.match(source, /@save="store\.saveDraft"/)
    assert.match(source, /@publish="publishActiveBlueprint"/)
    assert.match(source, /@undo="store\.undo"/)
    assert.match(source, /@redo="store\.redo"/)
  })
})
