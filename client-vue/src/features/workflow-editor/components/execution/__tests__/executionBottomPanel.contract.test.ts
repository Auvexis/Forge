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
    assert.match(source, /name:\s*'ebp-event-list'/)
    assert.match(source, /\.ebp-event-list-enter-active/)
    assert.match(source, /\.ebp-event-list-leave-active/)
  })
})
