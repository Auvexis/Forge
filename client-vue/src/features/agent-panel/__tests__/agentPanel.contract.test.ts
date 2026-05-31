import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

describe('agent panel modal contract', () => {
  it('mounts the global agent panel as a BaseModal overlay instead of a page route', () => {
    const app = readFileSync('src/app/App.vue', 'utf8')
    const router = readFileSync('src/app/router.ts', 'utf8')
    const modal = readFileSync('src/features/agent-panel/components/AppGlobalAgentPanel.vue', 'utf8')

    assert.match(app, /AppGlobalAgentPanel/)
    assert.match(modal, /BaseModal/)
    assert.match(modal, /AgentDirectoryList/)
    assert.match(modal, /AgentChatView/)
    assert.doesNotMatch(router, /AgentPanelPage/)
    assert.doesNotMatch(router, /path:\s*['"]\/agents['"]/)
  })

  it('keeps only one aside and opens chat history from a floating chat menu', () => {
    const modal = readFileSync('src/features/agent-panel/components/AppGlobalAgentPanel.vue', 'utf8')
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(modal, /AgentDirectoryList/)
    assert.doesNotMatch(modal, /AgentSessionList/)
    assert.match(chat, /agent-chat-view__floating-menu/)
    assert.match(chat, /openDraftSession/)
    assert.match(chat, /selectSession/)
    assert.match(chat, /deleteSession/)
  })

  it('agent and session lists expose expected actions', () => {
    const directory = readFileSync(
      'src/features/agent-panel/components/AgentDirectoryList.vue',
      'utf8',
    )
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')

    assert.match(directory, /agent\.emoji/)
    assert.match(directory, /agent\.workflowName/)
    assert.match(chat, /openDraftSession/)
    assert.match(chat, /deleteSession/)
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

  it('opens unsaved draft chats and persists only on first prompt', () => {
    const view = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const api = readFileSync('src/core/api/agent-panel.api.ts', 'utf8')
    const endpoints = readFileSync('src/core/api/endpoints.ts', 'utf8')

    assert.match(view, /hasOpenChat/)
    assert.match(view, /openDraftSession/)
    assert.doesNotMatch(view, /Create a chat\./)
    assert.match(store, /draftSessionOpen/)
    assert.match(store, /hasOpenChat/)
    assert.match(store, /openDraftSession/)
    assert.match(store, /sendFirstMessage/)
    assert.match(store, /agentPanelApi\.sendFirstMessage/)
    assert.match(api, /sendFirstMessage/)
    assert.match(endpoints, /AGENT_PANEL_AGENT_MESSAGES/)
  })

  it('session delete exposes memory cleanup choices with dangerous confirmation', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /useConfirm/)
    assert.match(chat, /transcript-only/)
    assert.match(chat, /session/)
    assert.match(chat, /all-agent-memory/)
    assert.match(chat, /dangerousMemoryMode/)
  })

  it('uses theme tokens and renders message identity with timestamps', () => {
    const directory = readFileSync(
      'src/features/agent-panel/components/AgentDirectoryList.vue',
      'utf8',
    )
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.doesNotMatch(`${directory}\n${chat}`, /#[0-9a-fA-F]{3,8}/)
    assert.doesNotMatch(`${directory}\n${chat}`, /rgba?\(/)
    assert.match(chat, /formatMessageTime/)
    assert.match(chat, /messageDisplayName/)
    assert.match(chat, /messageAvatar/)
    assert.match(chat, /sailor-text-secondary/)
  })

  it('keeps chat execution errors out of the agents list and avoids nested buttons', () => {
    const directory = readFileSync(
      'src/features/agent-panel/components/AgentDirectoryList.vue',
      'utf8',
    )
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')

    assert.match(directory, /directoryError/)
    assert.doesNotMatch(directory, /store\.error/)
    assert.doesNotMatch(chat, /store\.chatError/)
    assert.match(store, /directoryError/)
    assert.match(store, /chatError/)
    assert.doesNotMatch(chat, /<button[^>]*\\s+v-for="session in store\\.sessions"[\\s\\S]*<button/)
  })

  it('clears stale chat errors when opening another chat context', () => {
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')

    assert.match(store, /function clearChatError/)
    assert.match(store, /selectAgent[\s\S]*clearChatError\(\)/)
    assert.match(store, /loadSessions[\s\S]*clearChatError\(\)/)
    assert.match(store, /selectSession[\s\S]*clearChatError\(\)/)
    assert.match(store, /openDraftSession[\s\S]*clearChatError\(\)/)
  })

  it('shows agent send failures through the global toast instead of the chat transcript', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')

    assert.match(store, /useToast/)
    assert.match(store, /toastError\(chatError\.value, 'Agent execution failed'\)/)
    assert.doesNotMatch(chat, /agent-chat-view__chat-error/)
    assert.doesNotMatch(chat, /store\.chatError/)
  })
})
