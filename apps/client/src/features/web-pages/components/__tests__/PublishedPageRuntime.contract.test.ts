import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

describe('published page runtime contract', () => {
  it('form submit collects inputs by name and submits action', () => {
    const source = fs.readFileSync(path.resolve('../server/src/core/modules/pages/page-renderer.ts'), 'utf8')
    assert.match(source, /FormData/)
    assert.match(source, /data-fabric-action-id/)
    assert.match(source, /fetch/)
    assert.match(source, /encodeURIComponent\(slug\).*\/actions\/.*encodeURIComponent\(actionId\)/s)
  })

  it('button click and openUrl are handled without eval', () => {
    const source = fs.readFileSync(path.resolve('../server/src/core/modules/pages/page-renderer.ts'), 'utf8')
    assert.match(source, /click/)
    assert.match(source, /openUrl/)
    assert.doesNotMatch(source, /eval\(/)
  })

  it('submitting tracks pending action and logs errors without rendering status', () => {
    const source = fs.readFileSync(path.resolve('../server/src/core/modules/pages/page-renderer.ts'), 'utf8')
    assert.match(source, /pendingActionId/)
    assert.match(source, /console\.error\("\[Fabric Pages\] Action failed"/)
    assert.doesNotMatch(source, /data-fabric-runtime-status/)
    assert.doesNotMatch(source, /updateStatus/)
  })
})
