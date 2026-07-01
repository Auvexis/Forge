import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../..')

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('frontend workflow types expose return node and workflow result contracts', () => {
  const workflowTypes = read('src/core/types/workflow.types.ts')
  const executionTypes = read('src/core/types/execution.types.ts')

  assert.match(workflowTypes, /'return'/)
  assert.match(workflowTypes, /export type WorkflowReturnMode = 'all-steps' \| 'fields' \| 'expression'/)
  assert.match(workflowTypes, /export interface ReturnNode/)
  assert.match(workflowTypes, /type: 'return'/)
  assert.match(workflowTypes, /mode: WorkflowReturnMode/)
  assert.match(workflowTypes, /fields\?: ReturnNodeField\[\]/)
  assert.match(workflowTypes, /expression\?: string/)
  assert.match(workflowTypes, /\| ReturnNode/)

  assert.match(workflowTypes, /export type WorkflowResultSourceType = 'return' \| 'fallback-steps'/)
  assert.match(workflowTypes, /export interface WorkflowResultSource/)
  assert.match(executionTypes, /result\?: unknown/)
  assert.match(executionTypes, /resultSource\?: WorkflowResultSource/)
})
