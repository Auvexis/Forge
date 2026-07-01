import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const source = readFileSync(fileURLToPath(new URL('../ExecutionBottomPanel.vue', import.meta.url)), 'utf8')
const inspector = readFileSync(
  fileURLToPath(new URL('../../../../../shared/components/execution/ExecutionNodeInspector.vue', import.meta.url)),
  'utf8',
)

describe('execution bottom panel run explorer', () => {
  it('renders the shared Runs and Run Detail explorer', () => {
    assert.match(source, /ExecutionRunExplorer/)
    assert.match(source, /:runs="visibleRuns"/)
    assert.match(source, /:workflow="workflowStore\.activeWorkflow"/)
  })

  it('merges active SSE execution state with persisted history', () => {
    assert.match(source, /buildLiveExecutionLog/)
    assert.match(source, /executionStore\.activeExecutionId/)
    assert.match(source, /executionStore\.nodeStatuses/)
    assert.match(source, /historyRuns/)
    assert.match(source, /workflowsApi\.getExecutions\(workflowId, currentProfileId\.value\)/)
  })

  it('keeps large payload previews guarded in the shared inspector', () => {
    assert.match(inspector, /MAX_EAGER_OUTPUT_PREVIEW_BYTES/)
    assert.match(inspector, /Preview skipped for large output/)
    assert.match(inspector, /Show preview/)
    assert.match(inspector, /BaseButton/)
  })

  it('does not own panel resizing inside the execution component', () => {
    assert.doesNotMatch(source, /resize-handle|startResize|panelHeight|cursor: ns-resize/)
  })
})
