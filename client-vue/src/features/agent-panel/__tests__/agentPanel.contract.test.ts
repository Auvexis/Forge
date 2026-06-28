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

  it('renders chat history as a dedicated dated aside and removes the header history menu', () => {
    const modal = readFileSync('src/features/agent-panel/components/AppGlobalAgentPanel.vue', 'utf8')
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const sessions = readFileSync('src/features/agent-panel/components/AgentSessionList.vue', 'utf8')

    assert.match(modal, /AgentDirectoryList/)
    assert.match(modal, /AgentSessionList/)
    assert.match(modal, /global-agent-panel--history-collapsed/)
    assert.match(modal, /agentStore\.directoryCollapsed/)
    assert.match(modal, /grid-template-columns:\s*68px\s+256px\s+minmax\(0,\s*1fr\)/)
    assert.match(modal, /grid-template-columns:\s*68px\s+0\s+minmax\(0,\s*1fr\)/)
    assert.match(sessions, /sessionGroups/)
    assert.match(sessions, /createdAt/)
    assert.match(sessions, /agent-session-list__new/)
    assert.doesNotMatch(chat, /agent-chat-view__floating-menu/)
    assert.doesNotMatch(chat, /historyMenuOpen/)
    assert.match(chat, /openDraftSession/)
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

  it('confirms protected profile switches and preserves the current profile on cancel', () => {
    const directory = readFileSync(
      'src/features/agent-panel/components/AgentDirectoryList.vue',
      'utf8',
    )

    assert.match(directory, /ProfilePasswordConfirmationDialog/)
    assert.match(directory, /BaseDropdownSelect/)
    assert.match(directory, /profileSelectOptions/)
    assert.match(directory, /selectedProfileValue/)
    assert.match(directory, /pendingProfile/)
    assert.match(directory, /profile\.passwordProtected/)
    assert.match(directory, /profile\.id === profileStore\.currentProfile\?\.id/)
    assert.match(directory, /confirmProtectedProfile\(password: string\)/)
    assert.match(directory, /profileStore\.switchProfile\(profile\.id, password\)/)
    assert.match(directory, /cancelProtectedProfile/)
    assert.doesNotMatch(directory, /profileMenuOpen/)
  })

  it('keeps an empty agent directory visually blank', () => {
    const directory = readFileSync(
      'src/features/agent-panel/components/AgentDirectoryList.vue',
      'utf8',
    )

    assert.doesNotMatch(directory, />\s*0\s*<\/div>/)
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

  it('supports composer file attachments, drag/drop, pasted images, and speech language support gating', () => {
    const composer = readFileSync(
      'src/features/agent-panel/components/AgentChatComposer.vue',
      'utf8',
    )
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const api = readFileSync('src/core/api/agent-panel.api.ts', 'utf8')
    const endpoints = readFileSync('src/core/api/endpoints.ts', 'utf8')
    const types = readFileSync('src/features/agent-panel/types/agent-panel.types.ts', 'utf8')

    assert.match(composer, /pendingAttachments/)
    assert.match(composer, /@drop\.prevent/)
    assert.match(composer, /@dragover\.prevent/)
    assert.match(composer, /@paste/)
    assert.match(composer, /clipboardData/)
    assert.match(composer, /LucideIcon/)
    assert.match(composer, /URL\.createObjectURL/)
    assert.match(composer, /isImageAttachment/)
    assert.match(composer, /:disabled="props\.sending \|\| !speechSupported"/)
    assert.match(composer, /send: \[message: string, attachments: AgentPanelPendingAttachment\[\]\]/)
    assert.match(store, /uploadMessageAttachments/)
    assert.match(store, /attachments/)
    assert.match(api, /uploadAttachment/)
    assert.match(endpoints, /AGENT_PANEL_SESSION_ATTACHMENTS/)
    assert.match(types, /AgentPanelAttachmentRef/)
    assert.match(types, /AgentPanelPendingAttachment/)
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
    const modal = readFileSync('src/shared/components/base/BaseModal.vue', 'utf8')

    assert.match(chat, /useConfirm/)
    assert.match(chat, /transcript-only/)
    assert.match(chat, /session/)
    assert.match(chat, /all-agent-memory/)
    assert.match(chat, /dangerousMemoryMode/)
    assert.match(modal, /z-index:\s*10000/)
    assert.match(confirmPanel, /z-index:\s*10020/)
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

  it('shows agent send failures through toast and settles the local chat transcript', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')

    assert.match(store, /useToast/)
    assert.match(store, /toastError\(chatError\.value, 'Agent execution failed'\)/)
    assert.match(store, /appendAgentErrorMessage\([^)]*chatError\.value/s)
    assert.match(store, /settleActiveProgressMessages\(chatError\.value\)/)
    assert.match(chat, /isAgentErrorContent/)
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
    assert.match(store, /function progressMessageId/)
    assert.match(store, /local-agent-progress-\$\{turnId\}-active/)
    assert.match(store, /const id = `local-agent-summary-\$\{currentAssistantTurnId\(sessionId\)\}`/)
    assert.match(store, /agentPanelApi\.sendMessageStream/)
    assert.match(store, /for await \(const event of agentPanelApi\.sendMessageStream/)
    assert.match(types, /type: 'start'/)
    assert.doesNotMatch(types, /type: 'thinking'/)
    assert.doesNotMatch(store, /event\.type === 'thinking'/)
  })

  it('syncs agent execution mode between the global composer and workflow agent node', () => {
    const composer = readFileSync('src/features/agent-panel/components/AgentChatComposer.vue', 'utf8')
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const api = readFileSync('src/core/api/agent-panel.api.ts', 'utf8')
    const types = readFileSync('src/features/agent-panel/types/agent-panel.types.ts', 'utf8')

    assert.match(types, /executionMode: 'loop' \| 'plan'/)
    assert.match(types, /executionMode\?: 'loop' \| 'plan'/)
    assert.match(composer, /BaseDropdownSelect/)
    assert.match(composer, /EXECUTION_MODE_OPTIONS/)
    assert.match(composer, /executionMode: 'loop'/)
    assert.match(composer, /const EXECUTION_MODE_OPTIONS[\s\S]*value: 'loop'[\s\S]*value: 'plan'/)
    assert.match(store, /selectedAgent\.value\?\.executionMode \?\? 'loop'/)
    assert.match(composer, /update:execution-mode/)
    assert.match(chat, /:execution-mode="store\.selectedExecutionMode"/)
    assert.match(chat, /@update:execution-mode="store\.setSelectedExecutionMode"/)
    assert.match(store, /selectedExecutionMode/)
    assert.match(store, /workflowsApi\.getById/)
    assert.match(store, /workflow\.nodes\[agent\.agentNodeId\]/)
    assert.match(store, /saveActiveWorkflow/)
    assert.match(api, /executionMode: payload\.executionMode/)
  })

  it('auto-scrolls the transcript and animates message reflow on new steps', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /ref="messagesEl"/)
    assert.match(chat, /<TransitionGroup[\s\S]*name="agent-chat-message"/)
    assert.match(chat, /displayedMessagesScrollKey/)
    assert.match(chat, /watch\(\s*displayedMessagesScrollKey/)
    assert.doesNotMatch(chat, /JSON\.stringify\(store\.messages\.map/)
    assert.match(chat, /messageContentScrollVersion/)
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

  it('models live progress stream events with one active status and persistent tool steps', () => {
    const types = readFileSync('src/features/agent-panel/types/agent-panel.types.ts', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const merge = readFileSync('src/features/agent-panel/stores/agentPanelMessageMerge.ts', 'utf8')

    assert.match(types, /type: 'progress'/)
    assert.match(types, /toolCallId: string/)
    assert.match(types, /pluginId\?: string/)
    assert.match(store, /appendAgentProgressMessage/)
    assert.match(store, /event\.type === 'progress'/)
    assert.match(store, /kind: 'agentProgress'/)
    assert.match(store, /event\.status/)
    assert.match(store, /local-agent-progress-\$\{turnId\}-active/)
    assert.match(store, /local-agent-progress-\$\{turnId\}-\$\{event\.tool\.toolCallId\}-\$\{event\.status\}/)
    assert.match(store, /mergeServerMessagesWithStableLocalTurn/)
    assert.match(merge, /findLastMessageIndex/)
  })

  it('renders global agent tool progress with backend-provided deterministic EN-US text', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /activeStatusMessage\(message\.content\)/)
    assert.match(chat, /content\.message/)
    assert.match(chat, /agent-chat-view__progress--retrying/)
    assert.doesNotMatch(chat, /Vou usar|Usei|I'll use|Used .* successfully/)
  })

  it('renders persisted agent progress statuses with shimmering running text', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const api = readFileSync('src/core/api/agent-panel.api.ts', 'utf8')
    const progressBlock = chat.slice(
      chat.indexOf('function progressMessage'),
      chat.indexOf('function progressIcon'),
    )

    for (const label of [
      'Thinking',
      'Generating Plan',
      'Choosing the best tools',
      'Generating parameters',
      'Executing',
      'Success',
      'Analyzing errors',
      'Creating new parameters',
    ]) {
      assert.match(chat, new RegExp(label))
    }

    assert.match(chat, /agent-chat-view__status-text/)
    assert.match(chat, /agent-chat-status-shimmer/)
    assert.match(chat, /isShimmeringProgress/)
    assert.match(chat, /var\(--sailor-text-secondary\)/)
    assert.match(store, /isAgentProgressContent/)
    assert.match(api, /agent:thinking/)
    assert.match(api, /agent:plan-end/)
    assert.match(api, /agent:repair-start/)
    assert.doesNotMatch(progressBlock, /store\.sending/)
  })

  it('renders global agent pending loading dots like workflow editor chat', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /agent-chat-view__typing-dots/)
    assert.match(chat, /isPendingAssistantMessage/)
    assert.match(chat, /agent-chat-typing-bounce/)
    assert.doesNotMatch(chat, /messageThinking/)
    assert.doesNotMatch(chat, /agent-chat-view__thinking/)
  })

  it('keeps global agent chat idle on the GPU after progress rows are rendered', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const modal = readFileSync('src/shared/components/base/BaseModal.vue', 'utf8')

    assert.doesNotMatch(chat, /agent-progress-spin/)
    assert.doesNotMatch(chat, /agent-chat-view__progress--running svg[\s\S]*animation:/)
    assert.doesNotMatch(modal, /backdrop-filter/)
  })

  it('lets users cancel an active global agent execution from the composer', () => {
    const composer = readFileSync(
      'src/features/agent-panel/components/AgentChatComposer.vue',
      'utf8',
    )
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const panel = readFileSync('src/features/agent-panel/components/AppGlobalAgentPanel.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const api = readFileSync('src/core/api/agent-panel.api.ts', 'utf8')
    const types = readFileSync('src/features/agent-panel/types/agent-panel.types.ts', 'utf8')

    assert.match(types, /type: 'start'; executionId: string/)
    assert.match(api, /cancelExecution/)
    assert.match(api, /ENDPOINTS\.CANCEL_EXECUTION/)
    assert.match(api, /sendMessageStream:[\s\S]*options: \{ signal\?: AbortSignal \}/)
    assert.match(api, /addEventListener\('abort'/)
    assert.match(store, /activeExecutionId/)
    assert.match(store, /AbortController/)
    assert.match(store, /cancelActiveExecution/)
    assert.match(store, /disposeActiveExecution/)
    assert.match(store, /clearActiveAssistantPlaceholder/)
    assert.match(store, /activeStreamAbortController\?\.abort\(\)/)
    assert.match(store, /if \(executionId\) await agentPanelApi\.cancelExecution\(executionId\)/)
    assert.match(panel, /agentStore\.disposeActiveExecution\(\)/)
    assert.match(store, /event\.type === 'start'[\s\S]*activeExecutionId\.value = event\.executionId/)
    assert.match(composer, /cancelable/)
    assert.match(composer, /emit\('cancel'\)/)
    assert.match(composer, /props\.sending \? 'Stop' : 'Send'/)
    assert.match(composer, /Stop|Cancel/)
    assert.match(chat, /@cancel="store\.cancelActiveExecution"/)
    assert.doesNotMatch(chat, /:cancelable="Boolean\(store\.activeExecutionId\)"/)
  })

  it('settles animated global agent progress rows when an execution is cancelled or disposed', () => {
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')

    assert.match(store, /settleActiveProgressMessages/)
    assert.match(store, /cancelActiveExecution[\s\S]*settleActiveProgressMessages\(/)
    assert.match(store, /disposeActiveExecution[\s\S]*settleActiveProgressMessages\(/)
    assert.match(store, /status: 'failed'/)
    assert.match(store, /settleActiveProgressMessages\(message = 'Cancelled\.'\)/)
    assert.match(store, /message: message/)
  })

  it('keeps chat intent responses visually plain without progress shimmer', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const progressBlock = chat.match(/v-else-if="isAgentProgressContent\(message\.content\)"[\s\S]*?<\/div>/)?.[0] ?? ''
    const pendingBlock = chat.match(/v-else-if="isPendingAssistantMessage\(message\)"[\s\S]*?<\/div>/)?.[0] ?? ''

    assert.match(store, /event\.type === 'progress'/)
    assert.match(progressBlock, /isShimmeringProgress\(message\.content\)/)
    assert.match(progressBlock, /agent-chat-view__status-text--shimmer/)
    assert.match(pendingBlock, /agent-chat-view__typing-dots/)
    assert.doesNotMatch(pendingBlock, /agent-chat-view__status-text--shimmer/)
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

  it('updates non-tool progress in one animated status line and keeps tool steps persistent', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')

    assert.match(store, /local-agent-progress-\$\{turnId\}-active/)
    assert.match(store, /function progressMessageId/)
    assert.match(store, /local-agent-progress-\$\{turnId\}-\$\{event\.tool\.toolCallId\}-\$\{event\.status\}/)
    assert.match(chat, /agent-chat-view__status-viewport/)
    assert.match(chat, /:key="activeStatusMessage\(message\.content\)"/)
    assert.match(chat, /agent-chat-status-swap-enter-active/)
    assert.match(chat, /agent-chat-status-swap-enter-from/)
  })

  it('spins running progress icons and clips status swap in a single line', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /:class="\{ 'agent-chat-view__plugin-icon--spin': isSpinningProgress\(message\.content\) \}"/)
    assert.match(chat, /function isSpinningProgress/)
    assert.match(chat, /\.agent-chat-view__status-viewport\s*\{[\s\S]*overflow: hidden/)
    assert.match(chat, /\.agent-chat-view__plugin-icon--spin[\s\S]*animation: agent-chat-icon-spin/)
    assert.match(chat, /@keyframes agent-chat-icon-spin/)
  })

  it('keeps transient status local and removes it when a durable tool step arrives', () => {
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(store, /function removeActiveProgressMessage/)
    assert.match(store, /if \(event\.tool\) removeActiveProgressMessage\(sessionId\)/)
    assert.match(store, /appendAgentSummaryMessage[\s\S]*removeActiveProgressMessage\(sessionId\)/)
    assert.match(store, /appendAgentApprovalMessage[\s\S]*removeActiveProgressMessage\(sessionId\)/)
    assert.match(store, /appendAgentErrorMessage[\s\S]*removeActiveProgressMessage\(sessionId\)/)
    assert.match(chat, /activeStatusMessage\(message\.content\)/)
    assert.match(chat, /statusCycleIndex/)
  })

  it('spins only transient status icons and keeps plugin step icons stable', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /return !content\.tool && \(content\.status === 'running' \|\| content\.status === 'retrying'\)/)
  })

  it('renders tool progress details as expandable params and output blocks', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const types = readFileSync('src/features/agent-panel/types/agent-panel.types.ts', 'utf8')
    const api = readFileSync('src/core/api/agent-panel.api.ts', 'utf8')

    assert.match(types, /details\?:/)
    assert.match(types, /params\?: unknown/)
    assert.match(types, /output\?: unknown/)
    assert.match(api, /data\?\.details/)
    assert.match(api, /nestedTool/)
    assert.match(chat, /agent-chat-view__progress-toggle/)
    assert.match(chat, /agent-chat-view__progress-details/)
    assert.match(chat, /agent-chat-view__progress-detail/)
    assert.match(chat, /Params/)
    assert.match(chat, /Output/)
    assert.match(chat, /formatToolDetail/)
  })

  it('renders tool details with an inline lucide toggle and smooth expand transition', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')

    assert.match(chat, /button[\s\S]*agent-chat-view__progress-toggle/)
    assert.match(chat, /LucideIcon[\s\S]*chevron-down/)
    assert.match(chat, /aria-expanded/)
    assert.match(chat, /Transition[\s\S]*name="agent-chat-details"/)
    assert.match(chat, /agent-chat-details-enter-active/)
    assert.match(chat, /agent-chat-details-leave-active/)
  })

  it('settles only the latest active progress row on terminal stream errors', () => {
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')

    assert.match(store, /function latestActiveProgressMessageId/)
    assert.match(store, /candidate\.id !== latestActiveId/)
    assert.match(store, /terminalProgressToolCallIds/)
    assert.match(store, /completedToolCallIds\.has\(candidate\.content\.tool\.toolCallId\)/)
    assert.doesNotMatch(store, /if \(!\['planned', 'running', 'retrying'\]\.includes\(candidate\.content\.status\)\) return candidate[\s\S]*status: 'failed'/)
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
    assert.match(chat, /type="button"/)
    assert.match(chat, /sendWaitingUserOption/)
    assert.match(chat, /sendWaitingUserRetry/)
    assert.match(chat, /Try another query/)
    assert.match(chat, /waitingUserOptions/)
    assert.match(chat, /waitingOptionLabel/)
  })

  it('renders explicit agent choice cards and continues with the selected value only', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const types = readFileSync('src/features/agent-panel/types/agent-panel.types.ts', 'utf8')
    const api = readFileSync('src/core/api/agent-panel.api.ts', 'utf8')

    assert.match(types, /AgentPanelChoiceContent/)
    assert.match(types, /type: 'choice'/)
    assert.match(types, /selectedValue\?: unknown/)
    assert.match(chat, /isAgentChoiceContent/)
    assert.match(chat, /agent-chat-view__choice/)
    assert.match(chat, /sendAgentChoiceOption/)
    assert.match(store, /appendAgentChoiceMessage/)
    assert.match(store, /event\.type === 'choice'/)
    assert.match(store, /continueAgentChoice/)
    assert.match(store, /markChoiceResolved/)
    assert.match(api, /selectedValue/)
    assert.doesNotMatch(chat, /store\.sendMessage\(`Use \$\{label\}`\)/)
    assert.doesNotMatch(chat, /sendWaitingUserOption\(option\)[\s\S]*Use /)
  })

  it('renders global agent approval actions and resolves them through the approval api', () => {
    const chat = readFileSync('src/features/agent-panel/components/AgentChatView.vue', 'utf8')
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const api = readFileSync('src/core/api/agent-panel.api.ts', 'utf8')
    const types = readFileSync('src/features/agent-panel/types/agent-panel.types.ts', 'utf8')

    assert.match(types, /type: 'approval'/)
    assert.match(types, /type: 'waiting-approval'/)
    assert.match(chat, /isAgentApprovalContent/)
    assert.match(chat, /Confirm/)
    assert.match(chat, /Decline/)
    assert.match(chat, /approveAgentApproval/)
    assert.match(chat, /rejectAgentApproval/)
    assert.match(store, /appendAgentApprovalMessage/)
    assert.match(store, /approveApproval/)
    assert.match(store, /rejectApproval/)
    assert.match(api, /approveToolCallStream/)
    assert.match(api, /rejectToolCall/)
    assert.match(api, /STREAM_EXECUTION/)
    assert.match(api, /eventSource\.onopen/)
    assert.match(api, /event\.type === 'done' \|\| event\.type === 'waiting-approval' \|\| event\.type === 'error'/)
    assert.match(store, /event\.type === 'done' \|\| event\.type === 'waiting-approval'/)
  })

  it('continues global agent progress from the approved execution stream', () => {
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const api = readFileSync('src/core/api/agent-panel.api.ts', 'utf8')
    const approveBlock = store.slice(
      store.indexOf('async function approveApproval'),
      store.indexOf('async function rejectApproval'),
    )

    assert.match(approveBlock, /for await \(const event of agentPanelApi\.approveToolCallStream/)
    assert.match(approveBlock, /appendAgentProgressMessage/)
    assert.match(approveBlock, /appendAgentSummaryMessage/)
    assert.match(approveBlock, /appendAgentApprovalMessage/)
    assert.match(approveBlock, /appendStreamingAssistantMessage/)
    assert.match(approveBlock, /sawApprovalOutput/)
    assert.match(approveBlock, /event\.type === 'approval-complete'/)
    assert.match(api, /agent:approval-created/)
    assert.match(api, /workflow:waiting-approval/)
  })

  it('does not claim approval completion without real output or follow-up events', () => {
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const approveBlock = store.slice(
      store.indexOf('async function approveApproval'),
      store.indexOf('async function rejectApproval'),
    )

    assert.doesNotMatch(approveBlock, /Concluido|Concluded/)
    assert.match(approveBlock, /sawApprovalResult/)
    assert.match(approveBlock, /Agent approval finished without a confirmed result/)
  })

  it('keeps local chat steps when resolving approval actions', () => {
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const approveBlock = store.slice(
      store.indexOf('async function approveApproval'),
      store.indexOf('async function rejectApproval'),
    )
    const rejectBlock = store.slice(
      store.indexOf('async function rejectApproval'),
      store.indexOf('function normalizeAssistantContent'),
    )

    assert.doesNotMatch(approveBlock, /loadMessages\(/)
    assert.doesNotMatch(rejectBlock, /loadMessages\(/)
    assert.match(store, /markApprovalResolved/)
  })

  it('keeps the streamed user and assistant messages stable when the final server result arrives', () => {
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const merge = readFileSync('src/features/agent-panel/stores/agentPanelMessageMerge.ts', 'utf8')

    assert.match(store, /mergeServerMessagesWithStableLocalTurn/)
    assert.match(merge, /local-user-/)
    assert.match(merge, /local-assistant-stream-/)
    assert.match(merge, /previousLocalMessages/)
    assert.match(merge, /localMessages\.slice\(0, localTurnStart\)/)
    assert.match(merge, /latestServerWaitingUserMessage/)
    assert.match(merge, /isWaitingUserContent/)
    assert.doesNotMatch(store, /messages\.value = mergeServerMessagesWithLocalAgentEvents\(result\.messages\)/)
  })

  it('replaces the local streamed assistant text with the final server assistant response', () => {
    const store = readFileSync('src/features/agent-panel/stores/agentPanel.store.ts', 'utf8')
    const merge = readFileSync('src/features/agent-panel/stores/agentPanelMessageMerge.ts', 'utf8')

    assert.match(merge, /latestCurrentTurnServerFinalAssistantMessage/)
    assert.match(merge, /finalAssistantMessage/)
    assert.match(merge, /normalizeMessageText\(finalAssistantMessage\.content\)/)
    assert.match(merge, /content:\s*\{[\s\S]*text:\s*finalText/)
    assert.match(store, /mergeServerMessagesWithStableLocalTurn/)
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
