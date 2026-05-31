import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'

describe('agent panel api contract', () => {
  it('exposes agent panel endpoints and api methods', () => {
    const endpoints = readFileSync('src/core/api/endpoints.ts', 'utf8')
    const api = readFileSync('src/core/api/agent-panel.api.ts', 'utf8')

    assert.match(endpoints, /AGENT_PANEL_AGENTS/)
    assert.match(endpoints, /AGENT_PANEL_AGENT_SESSIONS/)
    assert.match(endpoints, /AGENT_PANEL_SESSION_MESSAGES/)
    assert.match(api, /listAgents/)
    assert.match(api, /createSession/)
    assert.match(api, /sendMessage/)
    assert.match(api, /deleteSession/)
  })
})
