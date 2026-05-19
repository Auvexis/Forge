import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const source = readFileSync(
  fileURLToPath(new URL('../ExecutionBottomPanel.vue', import.meta.url)),
  'utf8',
)

describe('execution bottom panel runtime detail view', () => {
  it('has a history toggle that loads previous workflow runs into the body', () => {
    assert.match(source, /showHistory/)
    assert.match(source, /loadHistory/)
    assert.match(source, /workflowsApi\.getExecutions/)
    assert.match(source, /historyRuns/)
    assert.match(source, /ebp-history-btn/)
  })

  it('lets users expand a step to inspect payload, body, output, or error', () => {
    assert.match(source, /expandedEventIds/)
    assert.match(source, /toggleEventDetails/)
    assert.match(source, /eventBody/)
    assert.match(source, /ebp-event-detail/)
    assert.match(source, /item\.error/)
  })

  it('animates step rows smoothly while realtime events arrive', () => {
    assert.match(source, /TransitionGroup/)
    assert.match(source, /<TransitionGroup\s+[^>]*name="ebp-event-list"[^>]*tag="div"[^>]*class="ebp-timeline"/)
    assert.match(source, /\.ebp-event-list-enter-active/)
    assert.doesNotMatch(source, /\.ebp-event-list-leave-active/)
    assert.doesNotMatch(source, /\.ebp-event-list-leave-to/)
  })

  it('keeps realtime rows in the scoped template so styling applies cleanly', () => {
    assert.doesNotMatch(source, /defineComponent\(\{\s*name:\s*'ExecutionEventList'/)
    assert.doesNotMatch(source, /h\(\s*TransitionGroup/)
    assert.match(source, /ebp-event-main/)
    assert.match(source, /ebp-event-status/)
    assert.match(source, /ebp-event-time/)
    assert.match(source, /ebp-event-detail__header/)
  })

  it('keeps log rows compact without card gaps or outer row borders', () => {
    assert.match(source, /\.ebp-event\s*\{[\s\S]*border-bottom: 1px solid var\(--sailor-border-muted\)/)
    assert.doesNotMatch(source, /\.ebp-timeline\s*\{[\s\S]*gap:/)
    assert.doesNotMatch(source, /\.ebp-timeline\s*\{[\s\S]*padding:/)
    assert.doesNotMatch(source, /\.ebp-event\s*\{[\s\S]*border-radius:/)
    assert.doesNotMatch(source, /\.ebp-event\s*\{[\s\S]*border: 1px/)
  })

  it('can be resized vertically from the top border', () => {
    assert.match(source, /ebp-resize-handle/)
    assert.match(source, /startResize/)
    assert.match(source, /panelHeight/)
    assert.match(source, /mousemove/)
    assert.match(source, /--ebp-panel-height/)
    assert.match(source, /cursor: ns-resize/)
  })
})
