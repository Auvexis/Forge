import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('workflow publish triggers the Auvexis workflow published product event', () => {
  const source = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(source, /useAuvexisProductEvents/)
  assert.match(source, /triggerAuvexisEvent/)
  assert.match(source, /emitWorkflowPublishedEvent\(updated\.metadata\.id\)/)
  assert.match(source, /type: 'sailor\.workflow\.published'/)
  assert.match(source, /eventId: `sailor\.workflow\.published:\$\{workflowId\}`/)
  assert.match(source, /evidence: \{ workflowId \}/)
})
