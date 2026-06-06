import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { agentPanelApi } from '@/core/api/agent-panel.api'
import { workflowsApi } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import { mergeServerMessagesWithStableLocalTurn as mergeStableLocalTurn } from './agentPanelMessageMerge'
import type { AgentChatMessage, AgentChatSession } from '@/features/agent-runtime/types/agent.types'
import type {
  AgentPanelApprovalContent,
  AgentPanelChoiceContent,
  AgentPanelChoiceOption,
  AgentPanelErrorContent,
  AgentPanelProgressContent,
  AgentPanelSummaryContent,
  AgentPanelStreamEvent,
  PublishedAgentSummary,
} from '@/features/agent-panel/types/agent-panel.types'

type AgentPanelScope = 'current' | 'global' | 'dev-session'

interface AgentPanelDevSessionContext {
  scope: 'dev-session'
  workflowId: string
  triggerNodeId?: string
  agentNodeId?: string
}

export const useAgentPanelStore = defineStore('agent-panel', () => {
  const agents = ref<PublishedAgentSummary[]>([])
  const sessions = ref<AgentChatSession[]>([])
  const messages = ref<AgentChatMessage[]>([])
  const selectedAgentKey = ref('')
  const selectedSessionId = ref('')
  const draftSessionOpen = ref(false)
  const loading = ref(false)
  const sending = ref(false)
  const activeExecutionId = ref('')
  const error = ref('')
  const directoryError = ref('')
  const chatError = ref('')
  const activeAssistantStreamId = ref('')
  const approvalPendingId = ref('')
  const agentScope = ref<AgentPanelScope>('global')
  const agentSearch = ref('')
  const directoryCollapsed = ref(false)
  const devSessionContext = ref<AgentPanelDevSessionContext | null>(null)
  let activeStreamAbortController: AbortController | null = null

  const selectedAgent = computed(
    () => agents.value.find((agent) => agent.key === selectedAgentKey.value) ?? null,
  )
  const selectedExecutionMode = computed(() => selectedAgent.value?.executionMode ?? 'loop')
  const filteredAgents = computed(() => {
    const query = agentSearch.value.trim().toLowerCase()
    if (!query) return agents.value
    return agents.value.filter((agent) =>
      [
        agent.name,
        agent.workflowName,
        agent.profileId,
        agent.chatTitle,
        agent.chatSlug,
      ].some((value) => value.toLowerCase().includes(query)),
    )
  })
  const selectedSession = computed(
    () => sessions.value.find((session) => session.id === selectedSessionId.value) ?? null,
  )
  const hasOpenChat = computed(() => Boolean(selectedAgent.value && (draftSessionOpen.value || selectedSession.value)))

  function clearChatError() {
    chatError.value = ''
    if (error.value && error.value !== directoryError.value) error.value = ''
  }

  async function loadAgents(
    scope: AgentPanelScope = agentScope.value,
    options: { workflowId?: string; triggerNodeId?: string; agentNodeId?: string } = {},
  ) {
    loading.value = true
    error.value = ''
    directoryError.value = ''
    clearChatError()
    agentScope.value = scope
    try {
      agents.value = await agentPanelApi.listAgents(scope, { workflowId: options.workflowId })
      const preferredAgent = agents.value.find((agent) =>
        (!options.triggerNodeId || agent.triggerNodeId === options.triggerNodeId) &&
        (!options.agentNodeId || agent.agentNodeId === options.agentNodeId),
      )
      selectedAgentKey.value = preferredAgent?.key ??
        (agents.value.some((agent) => agent.key === selectedAgentKey.value)
          ? selectedAgentKey.value
          : agents.value[0]?.key || '')
    } catch (err) {
      directoryError.value = err instanceof Error ? err.message : 'Failed to load agents'
      error.value = directoryError.value
    } finally {
      loading.value = false
    }
    if (!directoryError.value && selectedAgentKey.value) await loadSessions(selectedAgentKey.value)
  }

  async function selectAgent(agentKey: string) {
    clearChatError()
    selectedAgentKey.value = agentKey
    selectedSessionId.value = ''
    draftSessionOpen.value = false
    messages.value = []
    await loadSessions(agentKey)
  }

  async function setSelectedExecutionMode(mode: 'loop' | 'plan') {
    if (!selectedAgent.value || selectedAgent.value.executionMode === mode) return
    const agent = selectedAgent.value
    const workflowStore = useWorkflowStore()
    if (workflowStore.activeWorkflow?.metadata.id === agent.workflowId) {
      workflowStore.updateNodeData(agent.agentNodeId, { executionMode: mode })
      await workflowStore.saveActiveWorkflow({ silent: true })
    } else {
      const workflow = await workflowsApi.getById(agent.workflowId)
      const node = workflow.nodes[agent.agentNodeId]
      if (!node || node.type !== 'ai-agent') return
      node.executionMode = mode
      await workflowsApi.update(workflow.metadata.id, workflow)
    }
    agents.value = agents.value.map((candidate) =>
      candidate.key === agent.key ? { ...candidate, executionMode: mode } : candidate,
    )
  }

  async function loadSessions(agentKey = selectedAgentKey.value) {
    clearChatError()
    if (!agentKey) {
      sessions.value = []
      selectedSessionId.value = ''
      draftSessionOpen.value = false
      messages.value = []
      return
    }
    try {
      chatError.value = ''
      sessions.value = await agentPanelApi.listSessions(agentKey)
      selectedSessionId.value = sessions.value[0]?.id ?? ''
      draftSessionOpen.value = !selectedSessionId.value
      messages.value = []
      if (selectedSessionId.value) await loadMessages(selectedSessionId.value)
    } catch (err) {
      chatError.value = err instanceof Error ? err.message : 'Failed to load chats'
      error.value = chatError.value
    }
  }

  async function selectSession(sessionId: string) {
    clearChatError()
    selectedSessionId.value = sessionId
    draftSessionOpen.value = false
    await loadMessages(sessionId)
  }

  async function loadMessages(sessionId = selectedSessionId.value) {
    messages.value = sessionId ? await agentPanelApi.listMessages(sessionId) : []
  }

  function openDraftSession() {
    if (!selectedAgentKey.value) return
    clearChatError()
    selectedSessionId.value = ''
    draftSessionOpen.value = true
    messages.value = []
  }

  const createSession = openDraftSession

  async function setAgentScope(scope: AgentPanelScope) {
    if (agentScope.value === scope && agents.value.length) return
    await loadAgents(scope)
  }

  function prepareDevSession(input: Omit<AgentPanelDevSessionContext, 'scope'> & { scope?: 'dev-session' }) {
    devSessionContext.value = { scope: 'dev-session', ...input }
    selectedAgentKey.value = ''
    selectedSessionId.value = ''
    draftSessionOpen.value = false
    messages.value = []
  }

  function clearDevSessionContext() {
    devSessionContext.value = null
  }

  function toggleDirectoryCollapsed() {
    directoryCollapsed.value = !directoryCollapsed.value
  }

  async function deleteSession(
    sessionId: string,
    memoryMode: 'session' | 'transcript-only' | 'all-agent-memory' = 'session',
  ) {
    await agentPanelApi.deleteSession(sessionId, { memoryMode })
    sessions.value = sessions.value.filter((session) => session.id !== sessionId)
    if (selectedSessionId.value !== sessionId) return

    selectedSessionId.value = sessions.value[0]?.id ?? ''
    draftSessionOpen.value = !selectedSessionId.value
    messages.value = []
    if (selectedSessionId.value) await loadMessages(selectedSessionId.value)
  }

  function appendOptimisticUserMessage(sessionId: string, content: unknown) {
    messages.value = [
      ...messages.value,
      {
        id: `local-user-${Date.now()}`,
        profileId: '',
        sessionId,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        entrance: 'user',
      } as AgentChatMessage,
    ]
  }

  function appendPendingAssistantMessage(sessionId: string) {
    activeAssistantStreamId.value = activeAssistantStreamId.value || createAssistantStreamId(sessionId)
    upsertStreamingAssistantMessage(sessionId, { pending: true })
  }

  function appendStreamingAssistantMessage(sessionId: string, delta = '') {
    if (!delta) return
    upsertStreamingAssistantMessage(sessionId, { textDelta: delta, pending: false })
  }

  function appendAgentProgressMessage(
    sessionId: string,
    event: Extract<AgentPanelStreamEvent, { type: 'progress' }>,
  ) {
    if (event.tool) removeActiveProgressMessage(sessionId)
    const id = progressMessageId(sessionId, event)
    const content: AgentPanelProgressContent = {
      kind: 'agentProgress',
      status: event.status,
      message: event.message,
      tool: event.tool,
    }
    const existing = messages.value.find((message) => message.id === id)
    if (existing) {
      existing.content = content
      return
    }

    messages.value = [
      ...messages.value,
      {
        id,
        profileId: '',
        sessionId,
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
        entrance: 'assistant',
      } as AgentChatMessage,
    ]
  }

  function progressMessageId(
    sessionId: string,
    event: Extract<AgentPanelStreamEvent, { type: 'progress' }>,
  ): string {
    const turnId = currentAssistantTurnId(sessionId)
    if (!event.tool) return `local-agent-progress-${turnId}-active`
    return `local-agent-progress-${turnId}-${event.tool.toolCallId}-${event.status}`
  }

  function removeActiveProgressMessage(sessionId: string) {
    const id = `local-agent-progress-${currentAssistantTurnId(sessionId)}-active`
    messages.value = messages.value.filter((message) => message.id !== id)
  }

  function appendAgentSummaryMessage(
    sessionId: string,
    event: Extract<AgentPanelStreamEvent, { type: 'summary' }>,
  ) {
    removeActiveProgressMessage(sessionId)
    const id = `local-agent-summary-${currentAssistantTurnId(sessionId)}`
    const content: AgentPanelSummaryContent = {
      kind: 'agentSummary',
      message: event.message,
      tools: event.tools,
    }
    messages.value = [
      ...messages.value.filter((message) =>
        message.id !== id,
      ),
      {
        id,
        profileId: '',
        sessionId,
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
        entrance: 'assistant',
      } as AgentChatMessage,
    ]
  }

  function appendAgentApprovalMessage(
    sessionId: string,
    event: Extract<AgentPanelStreamEvent, { type: 'approval' }>,
  ) {
    removeActiveProgressMessage(sessionId)
    const id = `local-agent-approval-${event.approvalId}`
    const content: AgentPanelApprovalContent = {
      kind: 'agentApproval',
      approvalId: event.approvalId,
      executionId: event.executionId,
      toolName: event.toolName,
      sideEffect: event.sideEffect,
      message: event.message,
    }
    messages.value = [
      ...messages.value.filter((message) => message.id !== id),
      {
        id,
        profileId: '',
        sessionId,
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
        entrance: 'assistant',
      } as AgentChatMessage,
    ]
  }

  function appendAgentChoiceMessage(
    sessionId: string,
    event: Extract<AgentPanelStreamEvent, { type: 'choice' }>,
  ) {
    removeActiveProgressMessage(sessionId)
    const id = `local-agent-choice-${currentAssistantTurnId(sessionId)}-${event.repeatedTool}`
    const content: AgentPanelChoiceContent = {
      kind: 'agentChoice',
      status: event.status,
      reason: event.reason,
      question: event.question,
      repeatedTool: event.repeatedTool,
      options: event.options,
      selectedValue: event.selectedValue,
    }
    messages.value = [
      ...messages.value.filter((message) => message.id !== id),
      {
        id,
        profileId: '',
        sessionId,
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
        entrance: 'assistant',
      } as AgentChatMessage,
    ]
  }

  function appendAgentErrorMessage(sessionId: string, message: string) {
    removeActiveProgressMessage(sessionId)
    const streamId = currentAssistantTurnId(sessionId)
    const id = `local-agent-error-${streamId}`
    const content: AgentPanelErrorContent = {
      kind: 'agentError',
      message,
    }
    messages.value = [
      ...messages.value.filter((candidate) => candidate.id !== id),
      {
        id,
        profileId: '',
        sessionId,
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
        entrance: 'assistant',
      } as AgentChatMessage,
    ]
  }

  function markApprovalResolved(approval: AgentPanelApprovalContent, decision: 'approved' | 'rejected') {
    messages.value = messages.value.map((message) => {
      if (
        !message.content ||
        typeof message.content !== 'object' ||
        Array.isArray(message.content) ||
        (message.content as { kind?: unknown }).kind !== 'agentApproval' ||
        (message.content as { approvalId?: unknown }).approvalId !== approval.approvalId
      ) {
        return message
      }

      const content = message.content as AgentPanelApprovalContent
      return {
        ...message,
        content: {
          ...content,
          decision,
          message: decision === 'approved'
            ? 'Approval confirmed. Continuing execution.'
            : 'Approval rejected. Execution interrupted.',
        },
      }
    })
  }

  function markChoiceResolved(choice: AgentPanelChoiceContent, option: AgentPanelChoiceOption) {
    messages.value = messages.value.map((message) => {
      if (
        !message.content ||
        typeof message.content !== 'object' ||
        Array.isArray(message.content) ||
        (message.content as { kind?: unknown }).kind !== 'agentChoice' ||
        (message.content as { repeatedTool?: unknown }).repeatedTool !== choice.repeatedTool
      ) {
        return message
      }

      return {
        ...message,
        content: {
          ...(message.content as AgentPanelChoiceContent),
          selectedValue: option.value,
        },
      }
    })
  }

  function upsertStreamingAssistantMessage(
    sessionId: string,
    patch: { textDelta?: string; pending?: boolean },
  ) {
    const id = activeAssistantStreamId.value || createAssistantStreamId(sessionId)
    activeAssistantStreamId.value = id
    const existing = messages.value.find((message) => message.id === id)
    if (existing) {
      existing.content = mergeAssistantContent(existing.content, patch)
      return
    }

    messages.value = [
      ...messages.value,
      {
        id,
        profileId: '',
        sessionId,
        role: 'assistant',
        content: mergeAssistantContent(null, patch),
        createdAt: new Date().toISOString(),
        entrance: 'assistant',
      } as AgentChatMessage,
    ]
  }

  function clearActiveAssistantPlaceholder() {
    const streamId = activeAssistantStreamId.value
    if (!streamId) return
    messages.value = messages.value.filter((message) => {
      if (message.id !== streamId) return true
      const content = normalizeAssistantContent(message.content)
      return Boolean(content.text.trim())
    }).map((message) => {
      if (message.id !== streamId) return message
      return {
        ...message,
        content: {
          ...normalizeAssistantContent(message.content),
          pending: false,
        },
      }
    })
  }

  function settleActiveProgressMessages(message = 'Cancelled.') {
    const streamId = activeAssistantStreamId.value
    if (!streamId) return
    const latestActiveId = latestActiveProgressMessageId(streamId)
    if (!latestActiveId) return
    messages.value = messages.value.map((candidate) => {
      if (candidate.id !== latestActiveId || !isAgentProgressContent(candidate.content)) return candidate
      return {
        ...candidate,
        content: {
          ...candidate.content,
          status: 'failed',
          message: message,
        },
      } as AgentChatMessage
    })
  }

  function latestActiveProgressMessageId(streamId: string): string {
    const prefix = `local-agent-progress-${streamId}-`
    const completedToolCallIds = terminalProgressToolCallIds(prefix)
    const latest = [...messages.value].reverse().find((candidate) =>
      candidate.id.startsWith(prefix) &&
      isAgentProgressContent(candidate.content) &&
      (!candidate.content.tool?.toolCallId || !completedToolCallIds.has(candidate.content.tool.toolCallId)) &&
      ['planned', 'running', 'retrying'].includes(candidate.content.status),
    )
    return latest?.id ?? ''
  }

  function terminalProgressToolCallIds(prefix: string): Set<string> {
    const ids = new Set<string>()
    for (const candidate of messages.value) {
      if (!candidate.id.startsWith(prefix) || !isAgentProgressContent(candidate.content)) continue
      if (!['success', 'failed'].includes(candidate.content.status)) continue
      const toolCallId = candidate.content.tool?.toolCallId
      if (toolCallId) ids.add(toolCallId)
    }
    return ids
  }

  function createAssistantStreamId(sessionId: string): string {
    return `local-assistant-stream-${sessionId}-${Date.now()}`
  }

  function currentAssistantTurnId(sessionId: string): string {
    activeAssistantStreamId.value = activeAssistantStreamId.value || createAssistantStreamId(sessionId)
    return activeAssistantStreamId.value
  }

  function remapLocalSessionMessages(fromSessionId: string, toSessionId: string) {
    messages.value = messages.value.map((message) => (
      message.sessionId === fromSessionId
        ? { ...message, sessionId: toSessionId, id: message.id.replace(fromSessionId, toSessionId) }
        : message
    ))
  }

  async function sendMessage(message: string) {
    const text = message.trim()
    if (!text || sending.value || (!selectedAgentKey.value && !selectedSessionId.value)) return
    if (!selectedSessionId.value && !draftSessionOpen.value) return

    const { error: toastError } = useToast()
    const localSessionId = selectedSessionId.value || `draft-${Date.now()}`
    activeAssistantStreamId.value = ''
    appendOptimisticUserMessage(localSessionId, text)
    sending.value = true
    activeStreamAbortController = new AbortController()
    chatError.value = ''
    error.value = ''
    try {
      if (!selectedSessionId.value) {
        const session = await agentPanelApi.createSession(selectedAgentKey.value, {
          title: createSessionTitle(text),
        })
        draftSessionOpen.value = false
        selectedSessionId.value = session.id
        sessions.value = [session, ...sessions.value.filter((candidate) => candidate.id !== session.id)]
        remapLocalSessionMessages(localSessionId, session.id)
      }

      appendPendingAssistantMessage(selectedSessionId.value)
      let result = null as Awaited<ReturnType<typeof agentPanelApi.sendMessage>> | null
      for await (const event of agentPanelApi.sendMessageStream(
        selectedSessionId.value,
        { message: text, executionMode: selectedExecutionMode.value },
        { signal: activeStreamAbortController.signal },
      )) {
        if (event.type === 'start') {
          activeExecutionId.value = event.executionId
          appendPendingAssistantMessage(selectedSessionId.value)
        }
        if (event.type === 'delta') appendStreamingAssistantMessage(selectedSessionId.value, event.delta)
        if (event.type === 'progress') appendAgentProgressMessage(selectedSessionId.value, event)
        if (event.type === 'summary') appendAgentSummaryMessage(selectedSessionId.value, event)
        if (event.type === 'approval') appendAgentApprovalMessage(selectedSessionId.value, event)
        if (event.type === 'choice') appendAgentChoiceMessage(selectedSessionId.value, event)
        if (event.type === 'error') throw new Error(event.message)
        if (event.type === 'done' || event.type === 'waiting-approval') result = event.result
      }
      if (!result) throw new Error('Agent message failed')
      draftSessionOpen.value = false
      selectedSessionId.value = result.session.id
      messages.value = mergeStableLocalTurn(messages.value, result.messages, result.session.id)
      sessions.value = [result.session, ...sessions.value.filter((session) => session.id !== result.session.id)]
    } catch (err) {
      if (activeStreamAbortController?.signal.aborted) return
      clearActiveAssistantPlaceholder()
      chatError.value = err instanceof Error ? err.message : 'Agent message failed'
      settleActiveProgressMessages(chatError.value)
      appendAgentErrorMessage(selectedSessionId.value || localSessionId, chatError.value)
      error.value = chatError.value
      toastError(chatError.value, 'Agent execution failed')
    } finally {
      activeStreamAbortController = null
      activeAssistantStreamId.value = ''
      activeExecutionId.value = ''
      sending.value = false
    }
  }

  async function cancelActiveExecution() {
    if (!sending.value) return
    const executionId = activeExecutionId.value
    activeStreamAbortController?.abort()
    try {
      if (executionId) await agentPanelApi.cancelExecution(executionId)
      appendStreamingAssistantMessage(selectedSessionId.value, 'Cancelled.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel agent execution'
      chatError.value = message
      error.value = message
      useToast().error(message, 'Agent cancellation failed')
    } finally {
      settleActiveProgressMessages()
      clearActiveAssistantPlaceholder()
      activeExecutionId.value = ''
      sending.value = false
      activeAssistantStreamId.value = ''
    }
  }

  function disposeActiveExecution() {
    activeStreamAbortController?.abort()
    settleActiveProgressMessages()
    clearActiveAssistantPlaceholder()
    activeStreamAbortController = null
    activeExecutionId.value = ''
    sending.value = false
    activeAssistantStreamId.value = ''
  }

  async function approveApproval(approval: AgentPanelApprovalContent) {
    if (!selectedSessionId.value || approvalPendingId.value) return
    const sessionId = selectedSessionId.value
    approvalPendingId.value = approval.approvalId
    try {
      let sawApprovalOutput = false
      let sawFollowupApproval = false
      let sawApprovalResult = false
      markApprovalResolved(approval, 'approved')
      for await (const event of agentPanelApi.approveToolCallStream(approval.approvalId, {
        executionId: approval.executionId,
        reason: 'Approved from global agent chat',
      })) {
        if (event.type === 'progress') appendAgentProgressMessage(sessionId, event)
        if (event.type === 'summary') {
          sawApprovalResult = true
          appendAgentSummaryMessage(sessionId, event)
        }
        if (event.type === 'approval') {
          sawFollowupApproval = true
          appendAgentApprovalMessage(sessionId, event)
        }
        if (event.type === 'done' || event.type === 'waiting-approval') {
          sawApprovalResult = true
        }
        if (event.type === 'delta') {
          sawApprovalOutput = true
          appendStreamingAssistantMessage(sessionId, event.delta)
        }
        if (event.type === 'error') throw new Error(event.message)
        if (event.type === 'approval-complete') {
          if (!sawApprovalOutput && !sawFollowupApproval && !sawApprovalResult) {
            throw new Error('Agent approval finished without a confirmed result')
          }
          break
        }
      }
    } finally {
      approvalPendingId.value = ''
    }
  }

  async function rejectApproval(approval: AgentPanelApprovalContent) {
    if (!selectedSessionId.value || approvalPendingId.value) return
    approvalPendingId.value = approval.approvalId
    try {
      await agentPanelApi.rejectToolCall(approval.approvalId, {
        executionId: approval.executionId,
        reason: 'Declined from global agent chat',
      })
      markApprovalResolved(approval, 'rejected')
    } finally {
      approvalPendingId.value = ''
    }
  }

  async function continueAgentChoice(choice: AgentPanelChoiceContent, option: AgentPanelChoiceOption) {
    if (!selectedSessionId.value || sending.value) return
    const { error: toastError } = useToast()
    const sessionId = selectedSessionId.value
    const message = option.label.trim() || String(option.value ?? '').trim()
    if (!message) return

    markChoiceResolved(choice, option)
    appendOptimisticUserMessage(sessionId, {
      kind: 'agentChoiceDecision',
      text: message,
      repeatedTool: choice.repeatedTool,
      selectedValue: option.value,
      label: message,
    })
    sending.value = true
    activeAssistantStreamId.value = ''
    activeStreamAbortController = new AbortController()
    chatError.value = ''
    error.value = ''

    try {
      appendPendingAssistantMessage(sessionId)
      let result = null as Awaited<ReturnType<typeof agentPanelApi.sendMessage>> | null
      for await (const event of agentPanelApi.sendMessageStream(
        sessionId,
        { message, selectedValue: option.value, executionMode: selectedExecutionMode.value },
        { signal: activeStreamAbortController.signal },
      )) {
        if (event.type === 'start') {
          activeExecutionId.value = event.executionId
          appendPendingAssistantMessage(sessionId)
        }
        if (event.type === 'delta') appendStreamingAssistantMessage(sessionId, event.delta)
        if (event.type === 'progress') appendAgentProgressMessage(sessionId, event)
        if (event.type === 'summary') appendAgentSummaryMessage(sessionId, event)
        if (event.type === 'approval') appendAgentApprovalMessage(sessionId, event)
        if (event.type === 'choice') appendAgentChoiceMessage(sessionId, event)
        if (event.type === 'error') throw new Error(event.message)
        if (event.type === 'done' || event.type === 'waiting-approval') result = event.result
      }
      if (!result) throw new Error('Agent choice continuation failed')
      messages.value = mergeStableLocalTurn(messages.value, result.messages, result.session.id)
      sessions.value = [result.session, ...sessions.value.filter((session) => session.id !== result.session.id)]
    } catch (err) {
      if (activeStreamAbortController?.signal.aborted) return
      clearActiveAssistantPlaceholder()
      chatError.value = err instanceof Error ? err.message : 'Agent choice continuation failed'
      settleActiveProgressMessages(chatError.value)
      appendAgentErrorMessage(sessionId, chatError.value)
      error.value = chatError.value
      toastError(chatError.value, 'Agent execution failed')
    } finally {
      activeStreamAbortController = null
      activeAssistantStreamId.value = ''
      activeExecutionId.value = ''
      sending.value = false
    }
  }

  function normalizeAssistantContent(content: unknown): { text: string; pending: boolean } {
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return { text: typeof content === 'string' ? content : '', pending: false }
    }
    const record = content as Record<string, unknown>
    return {
      text: typeof record.text === 'string' ? record.text : '',
      pending: record.pending === true,
    }
  }

  function mergeAssistantContent(
    content: unknown,
    patch: { textDelta?: string; pending?: boolean },
  ) {
    const current = normalizeAssistantContent(content)
    return {
      text: `${current.text}${patch.textDelta ?? ''}`,
      pending: patch.pending ?? current.pending,
    }
  }

  function isWaitingUserContent(content: unknown): boolean {
    return Boolean(
      content &&
        typeof content === 'object' &&
        !Array.isArray(content) &&
        (content as { waitingUser?: unknown }).waitingUser === true,
    )
  }

  function isAgentProgressContent(content: unknown): content is AgentPanelProgressContent {
    return Boolean(
      content &&
        typeof content === 'object' &&
        !Array.isArray(content) &&
        (content as { kind?: unknown }).kind === 'agentProgress',
    )
  }

  function isAgentSummaryContent(content: unknown): content is AgentPanelSummaryContent {
    return Boolean(
      content &&
        typeof content === 'object' &&
        !Array.isArray(content) &&
        (content as { kind?: unknown }).kind === 'agentSummary',
    )
  }

  function createSessionTitle(message: string): string {
    const cleaned = message
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!cleaned) return 'New chat'

    const stopWords = new Set([
      'a',
      'an',
      'and',
      'as',
      'de',
      'do',
      'da',
      'das',
      'dos',
      'e',
      'em',
      'for',
      'me',
      'o',
      'os',
      'para',
      'por',
      'the',
      'to',
      'um',
      'uma',
      'what',
      'with',
      'you',
    ])
    const words = cleaned
      .split(' ')
      .filter((word) => word.length > 2 && !stopWords.has(word.toLowerCase()))
      .slice(0, 6)
    const title = (words.length ? words : cleaned.split(' ').slice(0, 6)).join(' ')
    return title.length > 42 ? `${title.slice(0, 39).trim()}...` : title
  }

  return {
    agents,
    filteredAgents,
    sessions,
    messages,
    selectedAgentKey,
    selectedSessionId,
    draftSessionOpen,
    loading,
    sending,
    activeExecutionId,
    error,
    directoryError,
    chatError,
    agentScope,
    agentSearch,
    directoryCollapsed,
    devSessionContext,
    approvalPendingId,
    selectedAgent,
    selectedExecutionMode,
    selectedSession,
    hasOpenChat,
    loadAgents,
    setAgentScope,
    prepareDevSession,
    clearDevSessionContext,
    selectAgent,
    setSelectedExecutionMode,
    loadSessions,
    selectSession,
    loadMessages,
    openDraftSession,
    createSession,
    deleteSession,
    toggleDirectoryCollapsed,
    appendPendingAssistantMessage,
    appendOptimisticUserMessage,
    appendStreamingAssistantMessage,
    appendAgentProgressMessage,
    appendAgentSummaryMessage,
    appendAgentApprovalMessage,
      appendAgentChoiceMessage,
      appendAgentErrorMessage,
      approveApproval,
    rejectApproval,
    continueAgentChoice,
    sendMessage,
    cancelActiveExecution,
    disposeActiveExecution,
  }
})
