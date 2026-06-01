import type { AgentChatMessage } from '../../agent-runtime/types/agent.types'

export function mergeServerMessagesWithStableLocalTurn(
  localMessages: AgentChatMessage[],
  serverMessages: AgentChatMessage[],
  sessionId: string,
) {
  const localTurnStart = findLastMessageIndex(localMessages, (message) =>
    message.sessionId === sessionId && message.id.startsWith('local-user-'),
  )
  if (localTurnStart < 0) return serverMessages

  const waitingUserMessage = latestServerWaitingUserMessage(serverMessages, sessionId)
  const finalAssistantMessage = latestCurrentTurnServerFinalAssistantMessage(serverMessages, sessionId)
  const stableLocalTurn = localMessages
    .slice(localTurnStart)
    .filter((message) => message.sessionId === sessionId)
    .map((message) => finalizeLocalAssistantMessage(message, waitingUserMessage, finalAssistantMessage))
  const previousLocalMessages = localMessages.slice(0, localTurnStart)
  return [...previousLocalMessages, ...stableLocalTurn]
}

function finalizeLocalAssistantMessage(
  message: AgentChatMessage,
  waitingUserMessage?: AgentChatMessage,
  finalAssistantMessage?: AgentChatMessage,
): AgentChatMessage {
  if (!message.id.startsWith('local-assistant-stream-')) return message
  if (waitingUserMessage && isWaitingUserContent(waitingUserMessage.content)) {
    return {
      ...message,
      content: waitingUserMessage.content,
      createdAt: waitingUserMessage.createdAt,
    }
  }
  const content = normalizeAssistantContent(message.content)
  const finalText = finalAssistantMessage ? normalizeMessageText(finalAssistantMessage.content) : ''
  return {
    ...message,
    content: {
      text: finalText || content.text,
      thinking: content.thinking,
      pending: false,
    },
    createdAt: finalAssistantMessage?.createdAt ?? message.createdAt,
  }
}

function latestServerWaitingUserMessage(
  serverMessages: AgentChatMessage[],
  sessionId: string,
): AgentChatMessage | undefined {
  return [...serverMessages].reverse().find((message) =>
    message.sessionId === sessionId &&
    message.role === 'assistant' &&
    isWaitingUserContent(message.content),
  )
}

function latestCurrentTurnServerFinalAssistantMessage(
  serverMessages: AgentChatMessage[],
  sessionId: string,
): AgentChatMessage | undefined {
  const currentTurnUserIndex = findLastMessageIndex(serverMessages, (message) =>
    message.sessionId === sessionId && message.role === 'user',
  )
  if (currentTurnUserIndex < 0) return undefined

  return serverMessages.slice(currentTurnUserIndex + 1).find((message) =>
    message.sessionId === sessionId &&
    message.role === 'assistant' &&
    !isWaitingUserContent(message.content) &&
    Boolean(normalizeMessageText(message.content)),
  )
}

function normalizeMessageText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!content || typeof content !== 'object' || Array.isArray(content)) return ''
  const record = content as Record<string, unknown>
  if (typeof record.text === 'string') return record.text
  if (typeof record.content === 'string') return record.content
  return ''
}

function normalizeAssistantContent(content: unknown): { text: string; thinking: string; pending: boolean } {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return { text: typeof content === 'string' ? content : '', thinking: '', pending: false }
  }
  const record = content as Record<string, unknown>
  return {
    text: typeof record.text === 'string' ? record.text : '',
    thinking: typeof record.thinking === 'string' ? record.thinking : '',
    pending: record.pending === true,
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

function findLastMessageIndex(
  items: AgentChatMessage[],
  predicate: (message: AgentChatMessage) => boolean,
): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const message = items[index]
    if (message && predicate(message)) return index
  }
  return -1
}
