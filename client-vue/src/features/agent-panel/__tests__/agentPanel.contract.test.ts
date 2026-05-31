import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

describe('agent panel page contract', () => {
  it('registers the global agents route and page', () => {
    const router = readFileSync('src/app/router.ts', 'utf8')
    assert.match(router, /AgentPanelPage/)
    assert.match(router, /path:\s*['"]\/agents['"]/)
  })

  it('renders three product columns', () => {
    const page = readFileSync('src/app/pages/AgentPanelPage.vue', 'utf8')
    assert.match(page, /AgentDirectoryList/)
    assert.match(page, /AgentSessionList/)
    assert.match(page, /AgentChatView/)
  })
})
