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
    assert.match(store, /agentPanelApi\.createSession/)
    assert.match(store, /agentPanelApi\.sendMessageStream/)
    assert.match(api, /sendFirstMessage/)
    assert.match(endpoints, /AGENT_PANEL_AGENT_MESSAGES/)
  })

  it('session delete exposes memory cleanup choices with dangerous confirmation', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const confirmPanel = readFileSync('src/shared/components/layout/AppConfirmPanel.vue', 'utf8')

    assert.match(chat, /useConfirm/)
    assert.match(chat, /transcript-only/)
    assert.match(chat, /session/)
    assert.match(chat, /all-agent-memory/)
    assert.match(chat, /dangerousMemoryMode/)
    assert.match(confirmPanel, /z-index:\s*10001/)
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

  it('streams agent panel sends with optimistic user messages', () => {
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const api = readFileSync('src/core/api/agent-panel.api.ts', 'utf8')
    const endpoints = readFileSync('src/core/api/endpoints.ts', 'utf8')
    const types = readFileSync('src/features/agent-panel/types/agent-panel.types.ts', 'utf8')

    assert.match(endpoints, /AGENT_PANEL_SESSION_MESSAGES_STREAM/)
    assert.match(endpoints, /AGENT_PANEL_SESSION_MESSAGES_STREAM_START/)
    assert.match(api, /sendMessageStream/)
    assert.match(api, /EventSource/)
    assert.match(api, /startMessageStream/)
    assert.match(store, /appendOptimisticUserMessage/)
    assert.match(store, /appendStreamingAssistantMessage/)
    assert.match(store, /appendPendingAssistantMessage/)
    assert.match(store, /appendPendingAssistantMessage\(selectedSessionId\.value\)[\s\S]*for await/)
    assert.doesNotMatch(store, /id:\s*`local-assistant-stream-\$\{sessionId\}`/)
    assert.match(store, /activeAssistantStreamId/)
    assert.match(store, /const id = `local-agent-progress-\$\{currentAssistantTurnId\(sessionId\)\}-/)
    assert.match(store, /const id = `local-agent-summary-\$\{currentAssistantTurnId\(sessionId\)\}`/)
    assert.match(store, /appendStreamingAssistantThinking/)
    assert.match(store, /agentPanelApi\.sendMessageStream/)
    assert.match(store, /for await \(const event of agentPanelApi\.sendMessageStream/)
    assert.match(types, /type: 'start'/)
    assert.match(types, /type: 'thinking'/)
  })

  it('auto-scrolls the transcript and animates message reflow on new steps', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /ref="messagesEl"/)
    assert.match(chat, /TransitionGroup\s+name="agent-chat-message"/)
    assert.match(chat, /displayedMessagesScrollKey/)
    assert.match(chat, /watch\(\s*displayedMessagesScrollKey/)
    assert.match(chat, /scrollMessagesToBottom/)
    assert.match(chat, /scrollTo\(\{[\s\S]*behavior: 'smooth'/)
    assert.match(chat, /\.agent-chat-message-move/)
    assert.match(chat, /\.agent-chat-message-leave-active[\s\S]*display: none/)
  })

  it('refreshes global agents when the profile or active workflow metadata changes', () => {
    const modal = readFileSync('src/features/agent-panel/components/AppGlobalAgentPanel.vue', 'utf8')

    assert.match(modal, /useAgentPanelStore/)
    assert.match(modal, /useProfileStore/)
    assert.match(modal, /useWorkflowStore/)
    assert.match(modal, /watch\(/)
    assert.match(modal, /currentProfile\?\.name/)
    assert.match(modal, /currentProfile\?\.avatarEmoji/)
    assert.match(modal, /activeWorkflow\?\.metadata\.name/)
    assert.match(modal, /agentStore\.loadAgents\('global'\)/)
  })

  it('models progress stream events as one assistant message per tool status', () => {
    const types = readFileSync('src/features/agent-panel/types/agent-panel.types.ts', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')

    assert.match(types, /type: 'progress'/)
    assert.match(types, /toolCallId: string/)
    assert.match(types, /pluginId\?: string/)
    assert.match(store, /appendAgentProgressMessage/)
    assert.match(store, /event\.type === 'progress'/)
    assert.match(store, /kind: 'agentProgress'/)
    assert.match(store, /event\.tool\?\.toolCallId/)
    assert.match(store, /event\.status/)
    assert.match(store, /local-agent-progress-\$\{currentAssistantTurnId\(sessionId\)\}-\$\{toolKey\}-\$\{event\.status\}/)
    assert.match(store, /mergeServerMessagesWithStableLocalTurn/)
    assert.match(store, /findLastMessageIndex/)
  })

  it('renders global agent pending loading dots like workflow editor chat', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /agent-chat-view__thinking/)
    assert.match(chat, /agent-chat-view__typing-dots/)
    assert.match(chat, /isPendingAssistantMessage/)
    assert.match(chat, /agent-chat-typing-bounce/)
  })

  it('renders agent progress rows with plugin icons from the plugin catalog', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /isAgentProgressContent/)
    assert.match(chat, /agent-chat-view__progress/)
    assert.match(chat, /agent-chat-view__progress--running/)
    assert.match(chat, /progressMessage/)
    assert.match(chat, /resolvePluginIcon/)
    assert.match(chat, /pluginsApi\.getAll/)
    assert.match(chat, /pluginIconName/)
    assert.match(chat, /agent-chat-view__plugin-icon/)
  })

  it('renders definitive agent tool summaries with plugin icons', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const types = readFileSync('src/features/agent-panel/types/agent-panel.types.ts', 'utf8')

    assert.match(types, /type: 'summary'/)
    assert.match(types, /AgentPanelSummaryContent/)
    assert.match(chat, /isAgentSummaryContent/)
    assert.match(chat, /agent-chat-view__summary/)
    assert.match(chat, /agent-chat-view__summary-tools/)
    assert.match(chat, /pluginIconName\(tool\.pluginId/)
    assert.match(store, /appendAgentSummaryMessage/)
    assert.match(store, /kind: 'agentSummary'/)
  })

  it('renders waiting-user questions with selectable option labels', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /isWaitingUserContent/)
    assert.match(chat, /agent-chat-view__waiting-options/)
    assert.match(chat, /waitingUserOptions/)
    assert.match(chat, /waitingOptionLabel/)
  })

  it('keeps the streamed user and assistant messages stable when the final server result arrives', () => {
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')

    assert.match(store, /mergeServerMessagesWithStableLocalTurn/)
    assert.match(store, /local-user-/)
    assert.match(store, /local-assistant-stream-/)
    assert.match(store, /previousLocalMessages/)
    assert.match(store, /messages\.value\.slice\(0, localTurnStart\)/)
    assert.doesNotMatch(store, /messages\.value = mergeServerMessagesWithLocalAgentEvents\(result\.messages\)/)
  })

  it('groups consecutive assistant messages under the first avatar and name', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /v-for="\([^"]*message[^"]*, index\) in store\.messages"/)
    assert.match(chat, /isGroupedWithPrevious\(message, index\)/)
    assert.match(chat, /agent-chat-view__message--grouped/)
    assert.match(chat, /v-if="!isGroupedWithPrevious\(message, index\)"/)
    assert.match(chat, /\.agent-chat-view__message--grouped/)
    assert.doesNotMatch(chat, /margin-top:\s*calc\(var\(--sailor-space-3\) \* -1\)/)
    assert.match(chat, /\.agent-chat-view__progress \{[\s\S]*font-size: var\(--sailor-text-sm\)/)
  })

  it('keeps chat messages and tool status rows visually plain', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /\.agent-chat-view__message p,[\s\S]*border: 0;[\s\S]*background: transparent;[\s\S]*padding: 0;/)
    assert.match(chat, /\.agent-chat-view__progress \{[\s\S]*border: 0;[\s\S]*background: transparent;[\s\S]*padding: 0;/)
    assert.match(chat, /\.agent-chat-view__summary \{[\s\S]*border: 0;[\s\S]*background: transparent;[\s\S]*padding: 0;/)
    assert.match(chat, /\.agent-chat-view__summary-tools li \{[\s\S]*border: 0;[\s\S]*padding: 0;/)
  })

  it('animates user and assistant messages from their side of the chat', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /agent-chat-view__message--enter-user/)
    assert.match(chat, /agent-chat-view__message--enter-assistant/)
    assert.match(chat, /agent-message-in-user/)
    assert.match(chat, /agent-message-in-assistant/)
    assert.match(chat, /translate3d\(18px, 18px, 0\)/)
    assert.match(chat, /translate3d\(-18px, 18px, 0\)/)
  })
})
