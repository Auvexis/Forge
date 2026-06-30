import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('workflows api exposes callable workflow endpoint and DTOs', () => {
  const endpoints = read('src/core/api/endpoints.ts')
  const api = read('src/core/api/workflows.api.ts')

  assert.match(endpoints, /WORKFLOWS_CALLABLE: '\/workflows\/callable'/)
  assert.match(api, /export interface CallableWorkflowSummary/)
  assert.match(api, /export interface CallableWorkflowTrigger/)
  assert.match(api, /listCallable: \(\) =>\s*apiRequest<CallableWorkflowSummary\[\]>\(ENDPOINTS\.WORKFLOWS_CALLABLE\)/)
})

test('call workflow editor loads callable workflows and renders target selectors', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/CallWorkflowEditor.vue')

  assert.match(source, /workflowsApi\.listCallable/)
  assert.match(source, /executeCallableWorkflows\(\)/)
  assert.match(source, /BaseSelect[\s\S]*:options="workflowOptions"/)
  assert.match(source, /BaseSelect[\s\S]*:options="triggerOptions"/)
  assert.match(source, /handleWorkflowChange/)
  assert.match(source, /handleTriggerChange/)
})

test('call workflow editor shows selected trigger metadata and renders defaults from schema', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/CallWorkflowEditor.vue')

  assert.match(source, /selectedTrigger/)
  assert.match(source, /LucideIcon/)
  assert.match(source, /selectedTrigger\.icon/)
  assert.match(source, /selectedTrigger\.id/)
  assert.match(source, /selectedTrigger\.type/)
  assert.match(source, /schemaProperties/)
  assert.match(source, /Parameter Defaults/)
  assert.match(source, /updateInputDefault/)
  assert.match(source, /inputDefaults/)
})

test('call workflow editor supports tool instructions approval and timeout controls', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/CallWorkflowEditor.vue')

  assert.match(source, /Tool Instructions/)
  assert.match(source, /toolDescription/)
  assert.match(source, /updateToolDescription/)
  assert.match(source, /BaseSwitch/)
  assert.match(source, /requiresApproval/)
  assert.match(source, /timeoutMs/)
})
