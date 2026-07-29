import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

describe('AgentPanelPage empty shell', () => {
  it('contains no runtime hooks, requests, stores, or interactive components', () => {
    const page = readFileSync('src/app/pages/AgentPanelPage.vue', 'utf8')

    assert.match(page, /<main class="agent-panel-page" aria-label="Agents"><\/main>/)
    assert.doesNotMatch(page, /<script|onMounted|watch\(|use[A-Z]\w*Store|Api|fetch\(|EventSource|WebSocket/)
    assert.doesNotMatch(page, /AgentChat|AgentSession|AgentDirectory|status|progress/)
  })
})
