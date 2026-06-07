import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('workflows api exposes git snapshot endpoints', () => {
  const endpoints = read('src/core/api/endpoints.ts')
  const api = read('src/core/api/workflows.api.ts')

  assert.match(endpoints, /WORKFLOW_GIT_SNAPSHOTS/)
  assert.match(endpoints, /WORKFLOW_GIT_SNAPSHOT/)
  assert.match(api, /WorkflowGitSnapshotSummary/)
  assert.match(api, /WorkflowGitSnapshotFile/)
  assert.match(api, /listGitSnapshots/)
  assert.match(api, /getGitSnapshot/)
  assert.match(endpoints, /WORKFLOW_GIT_SNAPSHOT_RESTORE/)
  assert.match(api, /restoreGitSnapshot/)
})
