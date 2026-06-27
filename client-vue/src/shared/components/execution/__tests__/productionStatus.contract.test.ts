import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

test('production workflow status carries the published workflow definition', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../../../../core/api/workflows.api.ts', import.meta.url)),
    'utf8',
  )

  assert.match(source, /export interface ProductionWorkflowStatus[\s\S]*workflow: WorkflowItem/)
})
