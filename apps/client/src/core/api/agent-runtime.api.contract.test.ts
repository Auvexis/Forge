import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import { ENDPOINTS } from './endpoints.ts'
import type {
  AgentMemoryScope,
  AgentToolSideEffect,
} from '../../features/agent-runtime/types/agent.types.ts'

describe('agent runtime api contract', () => {
  it('endpoints expose chat messages, tools, memory, and approvals', () => {
    assert.equal(
      ENDPOINTS.AGENT_CHAT_MESSAGES('support agent'),
      '/agent-chat/support%20agent/messages',
    )
    assert.equal(
      ENDPOINTS.AGENT_CHAT_SESSION_MESSAGES('chat_1'),
      '/agent-chat/sessions/chat_1/messages',
    )
    assert.equal(
      ENDPOINTS.AGENT_SESSION_SNAPSHOT('chat_1'),
      '/agent-sessions/chat_1/snapshot',
    )
    assert.equal(ENDPOINTS.AGENT_CHATS, '/agent-chats')
    assert.equal(
      ENDPOINTS.AGENT_CHAT_SESSIONS('support agent'),
      '/agent-chats/support%20agent/sessions',
    )
    assert.equal(ENDPOINTS.AGENT_TOOLS, '/agent-tools')
    assert.equal(ENDPOINTS.AGENT_MEMORY, '/agent-memory')
    assert.equal(ENDPOINTS.AGENT_MEMORY_BY_ID('memory 1'), '/agent-memory/memory%201')
    assert.equal(
      ENDPOINTS.AGENT_APPROVAL_APPROVE('approval_1'),
      '/agent-approvals/approval_1/approve',
    )
    assert.equal(
      ENDPOINTS.AGENT_APPROVAL_REJECT('approval_1'),
      '/agent-approvals/approval_1/reject',
    )
  })

  it('agent API modules expose expected helpers', () => {
    const chatSource = fs.readFileSync(path.resolve('src/core/api/agent-chat.api.ts'), 'utf8')
    const toolsSource = fs.readFileSync(path.resolve('src/core/api/agent-tools.api.ts'), 'utf8')

    assert.match(chatSource, /export const agentChatApi/)
    assert.match(chatSource, /listChats:/)
    assert.match(chatSource, /createSession:/)
    assert.match(chatSource, /sendMessage:/)
    assert.match(chatSource, /listSessionMessages:/)
    assert.match(chatSource, /getSessionSnapshot:/)
    assert.match(chatSource, /approveToolCall:/)
    assert.match(chatSource, /rejectToolCall:/)
    assert.match(toolsSource, /export const agentToolsApi/)
    assert.match(toolsSource, /listTools:/)
    assert.match(toolsSource, /listMemory:/)
    assert.match(toolsSource, /saveMemory:/)
    assert.match(toolsSource, /deleteMemory:/)
  })

  it('type union includes memory scopes and side effects', () => {
    const scopes: AgentMemoryScope[] = ['none', 'session', 'workflow', 'profile', 'user']
    const sideEffects: AgentToolSideEffect[] = [
      'read',
      'write',
      'delete',
      'external-message',
      'external-payment',
      'filesystem',
    ]

    assert.equal(scopes.length, 5)
    assert.equal(sideEffects.length, 6)
  })

  it('frontend contracts do not expose LangGraph internals', () => {
    const source = fs.readFileSync(
      path.resolve('src/features/agent-runtime/types/agent.types.ts'),
      'utf8',
    )

    assert.doesNotMatch(source, /LangGraph|thread_id|checkpoint/i)
  })
})
