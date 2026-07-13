import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const source = readFileSync(
  fileURLToPath(new URL('../WorkflowWorkbenchBottomPanel.vue', import.meta.url)),
  'utf8',
)

test('workflow bottom panel renders the selected view without internal tabs', () => {
  assert.match(source, /export type WorkflowBottomPanelView = 'timeline' \| 'tree' \| 'execution' \| 'variables'/)
  assert.match(source, /activeView === 'timeline'/)
  assert.match(source, /orderedTimelineNodes/)
  assert.match(source, /childIdsByParent/)
  assert.match(source, /branchLane/)
  assert.match(source, /TIMELINE_COLORS/)
  assert.match(source, /TIMELINE_COLUMN_WIDTH/)
  assert.match(source, /TIMELINE_LANE_HEIGHT/)
  assert.match(source, /workflow-timeline__playhead/)
  assert.match(source, /workflow-timeline__branch/)
  assert.match(source, /--workflow-timeline-x/)
  assert.match(source, /--workflow-timeline-y/)
  assert.match(source, /--workflow-timeline-color/)
  assert.match(source, /iconForNodeType/)
  assert.match(source, /timelineStats/)
  assert.match(source, /scrollIntoView/)
  assert.match(source, /<ExecutionBottomPanel v-else-if="activeView === 'execution'"/)
  assert.match(source, /activeView === 'tree'/)
  assert.match(source, /v-else class="workflow-bottom-panel__view"/)
  assert.doesNotMatch(source, /workflow-bottom-panel__tabs/)
  assert.doesNotMatch(source, /workflow-bottom-panel__tab/)
  assert.doesNotMatch(source, /emit\('update:activeView'/)
  assert.doesNotMatch(source, /'logs'/)
})
