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

  it('agent and session lists expose expected actions', () => {
    const directory = readFileSync(
      'src/features/agent-panel/components/AgentDirectoryList.vue',
      'utf8',
    )
    const sessions = readFileSync(
      'src/features/agent-panel/components/AgentSessionList.vue',
      'utf8',
    )
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')

    assert.match(directory, /agent\.emoji/)
    assert.match(directory, /agent\.workflowName/)
    assert.match(sessions, /createSession/)
    assert.match(sessions, /deleteSession/)
    assert.match(store, /loadSessions/)
  })

  it('chat view renders messages and sends through the agent panel api', () => {
    const view = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const composer = readFileSync(
      'src/features/agent-panel/components/AgentChatComposer.vue',
      'utf8',
    )
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')

    assert.match(view, /selectedAgent/)
    assert.match(view, /messages/)
    assert.match(composer, /Ctrl\+Enter|ctrl\.enter/)
    assert.match(store, /sendMessage/)
    assert.match(store, /agentPanelApi\.sendMessage/)
  })
})
