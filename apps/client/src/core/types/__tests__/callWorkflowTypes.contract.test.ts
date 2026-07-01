import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../..')

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('frontend workflow types expose call-workflow instead of subworkflow', () => {
  const source = read('src/core/types/workflow.types.ts')

  assert.match(source, /'call-workflow'/)
  assert.doesNotMatch(source, /'subworkflow'/)
  assert.match(source, /export interface CallWorkflowNode/)
  assert.match(source, /\| CallWorkflowNode/)
  assert.doesNotMatch(source, /export interface SubWorkflowNode/)
  assert.doesNotMatch(source, /\| SubWorkflowNode/)
})

test('frontend workflow types expose callable trigger metadata', () => {
  const source = read('src/core/types/workflow.types.ts')

  assert.match(source, /export type CallableWorkflowTriggerType = 'manual' \| 'form' \| 'webhook'/)
  assert.match(source, /export interface CallableWorkflowTriggerMetadata/)
  assert.match(source, /type: CallableWorkflowTriggerType/)
  assert.match(source, /schema\?: Record<string, any>/)
})
