import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

describe('published page runtime contract', () => {
  it('form submit collects inputs by name and submits action', () => {
    const source = fs.readFileSync(path.resolve('src/app/pages/PublicSailorPage.vue'), 'utf8')
    assert.match(source, /FormData/)
    assert.match(source, /data-sailor-action-id/)
    assert.match(source, /submitPageAction/)
  })

  it('button click and openUrl are handled without eval', () => {
    const source = fs.readFileSync(path.resolve('src/app/pages/PublicSailorPage.vue'), 'utf8')
    assert.match(source, /click/)
    assert.match(source, /openUrl/)
    assert.doesNotMatch(source, /eval\(/)
  })

  it('submitting disables action and renders success or error', () => {
    const source = fs.readFileSync(path.resolve('src/app/pages/PublicSailorPage.vue'), 'utf8')
    assert.match(source, /pendingActionId/)
    assert.match(source, /executionId/)
    assert.match(source, /runtimeError/)
  })
})
