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
    assert.match(source, /:items="workflowItems"/)
    assert.match(source, /pattern-color="var\(--sailor-canvas-grid\)"/)
    assert.match(source, /@items-move="handleItemsMove"/)
    assert.match(source, /#item="\{ item \}"/)
  })

  it('renders current workflow node components with Vue Flow compatible props', () => {
    const source = read('WorkflowBaseCanvas.vue')
    const host = read('WorkflowCanvasNodeHost.vue')

    assert.match(source, /nodeComponentByType/)
    assert.match(source, /TriggerNode/)
    assert.match(source, /HttpNode/)
    assert.match(source, /CodeNode/)
    assert.match(source, /AiAgentNode/)
    assert.match(source, /VectorStoreToolNode/)
    assert.match(source, /WorkflowCanvasNodeHost/)
    assert.match(host, /:id="item\.id"/)
    assert.match(host, /:type="nodeType"/)
    assert.match(host, /:data="item\.data"/)
    assert.match(source, /:selected="canvasSelection\.includes\(item\.id\)"/)
    assert.match(source, /:status="resolveNodeStatus\(item\.id\)"/)
    assert.match(source, /:has-outgoing-connection="hasNodeOutgoingConnection\(item\.id\)"/)
  })

  it('persists BaseCanvas movement and opens the existing inspector on double click', () => {
    const source = read('WorkflowBaseCanvas.vue')

    assert.match(source, /function handleItemsMove/)
    assert.match(source, /positionX/)
    assert.match(source, /positionY/)
    assert.match(read('WorkflowCanvasNodeHost.vue'), /@dblclick\.stop="\$emit\('open-inspector', item\)"/)
    assert.match(source, /inspectorStore\.openInspector/)
  })
})
