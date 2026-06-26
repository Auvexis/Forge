import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

function read(relative: string) {
  return readFileSync(fileURLToPath(new URL(`../${relative}`, import.meta.url)), 'utf8')
}

describe('workflow BaseCanvas shell contract', () => {
  it('keeps Vue Flow as the default and gates the parallel BaseCanvas shell behind a flag', () => {
    const source = read('SailorWorkflowCanvas.vue')

    assert.match(source, /shouldUseWorkflowBaseCanvas/)
    assert.match(source, /WorkflowBaseCanvas/)
    assert.match(source, /v-if="useWorkflowBaseCanvas"/)
    assert.match(source, /v-else/)
    assert.match(source, /<VueFlow/)
  })

  it('renders the shared BaseCanvas without changing the shared implementation', () => {
    const source = read('WorkflowBaseCanvas.vue')

    assert.match(source, /import \{ BaseCanvas \} from '@\/shared\/base-canvas\/components\.ts'/)
    assert.match(source, /workflowToBaseCanvasItems/)
    assert.match(source, /v-model:viewport="viewport"/)
    assert.match(source, /:items="\[\]"/)
    assert.match(source, /pattern-color="var\(--sailor-canvas-grid\)"/)
    assert.doesNotMatch(source, /@items-move/)
  })
})
