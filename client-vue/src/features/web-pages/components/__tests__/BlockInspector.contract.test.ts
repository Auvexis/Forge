import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8')
}

describe('block inspector contract', () => {
  it('selected block shows content fields by tag', () => {
    const source = read('src/features/web-pages/components/BlockContentPanel.vue')
    assert.match(source, /block\.tag/)
    assert.match(source, /text/)
    assert.match(source, /image/)
    assert.match(source, /link/)
  })

  it('style panel uses controls for allowlisted properties', () => {
    const source = read('src/features/web-pages/components/BlockStylePanel.vue')
    assert.match(source, /padding/)
    assert.match(source, /backgroundColor/)
    assert.match(source, /BaseColorPicker/)
    assert.match(source, /sanitizeStyles/)
  })

  it('action panel supports form submit, workflow trigger, open URL without custom JS', () => {
    const source = read('src/features/web-pages/components/BlockActionPanel.vue')
    assert.match(source, /submitForm/)
    assert.match(source, /triggerWorkflow/)
    assert.match(source, /openUrl/)
    assert.doesNotMatch(source, /customJavaScript|eval\(|javascript:/)
  })

  it('image and link inputs validate URL input', () => {
    const content = read('src/features/web-pages/components/BlockContentPanel.vue')
    const action = read('src/features/web-pages/components/BlockActionPanel.vue')
    assert.match(content, /isSafeUrl/)
    assert.match(action, /isSafeUrl/)
  })
})
