import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const source = readFileSync(
  fileURLToPath(new URL('../workflowGitDiff.ts', import.meta.url)),
  'utf8',
)

test('workflow git diff utility produces line diff states', () => {
  assert.match(source, /export type WorkflowGitDiffLineType = 'added' \| 'removed' \| 'modified' \| 'unchanged'/)
  assert.match(source, /export function buildWorkflowJsonDiff/)
  assert.match(source, /oldLineNumber: number \| null/)
  assert.match(source, /newLineNumber: number \| null/)
  assert.match(source, /oldContent\?: string/)
  assert.match(source, /type: 'modified'/)
})
