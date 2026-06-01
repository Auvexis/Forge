import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mergeServerMessagesWithStableLocalTurn } from './agentPanelMessageMerge.ts'
import type { AgentChatMessage } from '../../agent-runtime/types/agent.types'

describe('agent panel message merge', () => {
  it('does not reuse an older assistant reply when the current tool turn has no final assistant text', () => {
    const localMessages = [
      message('user-1', 'chat_1', 'user', 'O que voce consegue fazer?'),
      message('assistant-1', 'chat_1', 'assistant', 'Lista antiga de ferramentas'),
      message('local-user-2', 'chat_1', 'user', 'Envie meu curriculo por email'),
      message('local-assistant-stream-chat_1-2', 'chat_1', 'assistant', {
        text: 'Perfeito, vou cuidar disso agora.',
        pending: false,
      }),
    ]
    const serverMessages = [
      message('user-1', 'chat_1', 'user', 'O que voce consegue fazer?'),
      message('assistant-1', 'chat_1', 'assistant', 'Lista antiga de ferramentas'),
      message('user-2', 'chat_1', 'user', 'Envie meu curriculo por email'),
    ]

    const merged = mergeServerMessagesWithStableLocalTurn(localMessages, serverMessages, 'chat_1')

    assert.equal(merged[3]?.content && typeof merged[3].content === 'object'
      ? (merged[3].content as { text?: string }).text
      : merged[3]?.content, 'Perfeito, vou cuidar disso agora.')
  })
})

function message(
  id: string,
  sessionId: string,
  role: AgentChatMessage['role'],
  content: AgentChatMessage['content'],
): AgentChatMessage {
  return {
    id,
    profileId: 'profile_a',
    sessionId,
    role,
    content,
    createdAt: new Date(0).toISOString(),
  }
}
