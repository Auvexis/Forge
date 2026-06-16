import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const source = readFileSync(
  fileURLToPath(new URL('../ExecutionBottomPanel.vue', import.meta.url)),
  'utf8',
)

function cssBlock(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return source.match(new RegExp(`${escaped}\\s*\\{(?<body>[\\s\\S]*?)\\n\\}`))?.groups?.body ?? ''
}

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
    const detailStyles = cssBlock('.ebp-event-detail')
    assert.doesNotMatch(detailStyles, /border-left:/)
    assert.doesNotMatch(detailStyles, /border-radius:/)
  })

  it('keeps step rows static when switching tabs or receiving events', () => {
    assert.match(source, /TransitionGroup/)
    assert.match(source, /<TransitionGroup\s+[^>]*name="ebp-event-list"[^>]*tag="div"[^>]*class="ebp-timeline"/)
    assert.doesNotMatch(source, /\.ebp-event-list-enter-active/)
    assert.doesNotMatch(source, /\.ebp-event-list-enter-from/)
    assert.doesNotMatch(source, /\.ebp-event-list-move/)
    assert.doesNotMatch(source, /\.ebp-event-list-leave-active/)
    assert.doesNotMatch(source, /\.ebp-event-list-leave-to/)
    assert.doesNotMatch(source, /background: color-mix\(in srgb, var\(--sailor-green-400\) 12%, transparent\)/)
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
    const timelineStyles = cssBlock('.ebp-timeline')
    const eventStyles = cssBlock('.ebp-event')
    assert.match(eventStyles, /border-bottom: 1px solid var\(--sailor-border-muted\)/)
    assert.doesNotMatch(timelineStyles, /gap:/)
    assert.doesNotMatch(timelineStyles, /padding:/)
    assert.doesNotMatch(eventStyles, /border-radius:/)
    assert.doesNotMatch(eventStyles, /border: 1px/)
  })

  it('does not own panel resizing inside the execution component', () => {
    assert.doesNotMatch(source, /ebp-resize-handle/)
    assert.doesNotMatch(source, /startResize/)
    assert.doesNotMatch(source, /panelHeight/)
    assert.doesNotMatch(source, /--ebp-panel-height/)
    assert.doesNotMatch(source, /cursor: ns-resize/)
  })

  it('loads history with the current profile id, including default', () => {
    assert.match(source, /useProfileStore/)
    assert.match(source, /currentProfile\?\.id/)
    assert.match(source, /workflowsApi\.getExecutions\(workflowId,\s*currentProfileId/)
  })

  it('shows newest executions from top to bottom', () => {
    assert.match(source, /sortedHistoryRuns/)
    assert.match(source, /startedAt/)
    assert.match(source, /b\.startedAt - a\.startedAt/)
    assert.match(source, /v-for="run in sortedHistoryRuns"/)
  })

  it('avoids eager rendering for large outputs', () => {
    assert.match(source, /MAX_EAGER_OUTPUT_PREVIEW_BYTES/)
    assert.match(source, /outputPreviewState/)
    assert.match(source, /Preview skipped for large output/)
    assert.match(source, /Show preview/)
  })
})
