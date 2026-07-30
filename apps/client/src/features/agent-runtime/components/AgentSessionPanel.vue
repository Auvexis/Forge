<template>
  <section class="agent-session-panel" :aria-busy="loading">
    <header class="agent-session-panel__header">
      <div>
        <strong>{{ snapshot?.session.title ?? 'Agent session' }}</strong>
        <span v-if="snapshot">rev {{ snapshot.revision }}</span>
      </div>
      <span v-if="snapshot?.activeTurn" class="agent-session-panel__status">
        {{ snapshot.activeTurn.state }}
      </span>
      <button type="button" :disabled="loading" title="Refresh session" @click="refresh">
        Refresh
      </button>
    </header>

    <div class="agent-session-panel__body">
      <AgentSessionTimeline v-if="snapshot" :snapshot="snapshot" />
      <p v-else-if="loading" class="agent-session-panel__empty">Loading session…</p>
      <p v-else class="agent-session-panel__empty">Session unavailable.</p>
    </div>

    <AgentSessionControls
      v-if="snapshot"
      :snapshot="snapshot"
      :busy="actionPending"
      @respond="respond"
      @approve="approve"
      @reject="reject"
      @retry="retry"
      @cancel="cancel"
    />

  </section>
</template>

<script setup lang="ts">
import { ref, toRef, watch } from 'vue'
import { agentChatApi } from '@/core/api/agent-chat.api'
import { useAgentSessionSnapshot } from '../composables/useAgentSessionSnapshot'
import type { AgentSessionPart } from '../types/agent.types'
import AgentSessionControls from './AgentSessionControls.vue'
import AgentSessionTimeline from './AgentSessionTimeline.vue'
import { useAgentErrorReporter } from '../composables/useAgentErrorReporter'

const props = defineProps<{
  sessionId: string
  chatSlug: string
}>()

type InteractionPart = Extract<AgentSessionPart, { type: 'interaction' }>

const sessionId = toRef(props, 'sessionId')
const actionPending = ref(false)
const { snapshot, loading, error, refresh, invalidate } = useAgentSessionSnapshot(
  () => sessionId.value,
)
const { reportAgentError } = useAgentErrorReporter()

watch(error, (cause) => {
  if (cause) reportAgentError(cause, 'Could not load the agent session.', 'session.refresh')
})

async function sendControlMessage(message: string) {
  if (actionPending.value) return
  actionPending.value = true
  try {
    await agentChatApi.sendMessage(props.chatSlug, {
      sessionId: props.sessionId,
      message,
      metadata: { source: 'agent-session-control' },
    })
    await refresh()
  } catch (error) {
    reportAgentError(error, 'Could not update the agent session.', 'session.control')
  } finally {
    actionPending.value = false
  }
}

function respond(value: string, _interaction: InteractionPart) {
  return sendControlMessage(value)
}

function approve(_interaction: InteractionPart) {
  return sendControlMessage('sim')
}

function reject(_interaction: InteractionPart) {
  return sendControlMessage('não')
}

function retry() {
  return sendControlMessage('tente novamente')
}

function cancel() {
  return sendControlMessage('cancelar')
}

defineExpose({ refresh, invalidate })
</script>

<style scoped>
.agent-session-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border: 1px solid var(--fabric-chat-session-panel-border);
  background: var(--fabric-chat-session-panel-bg-elevated);
}

.agent-session-panel__header {
  display: flex;
  min-height: 28px;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--fabric-chat-session-panel-border);
  background: var(--fabric-chat-session-panel-bg-surface);
  padding: 0 8px;
}

.agent-session-panel__header > div {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: baseline;
  gap: 6px;
}

.agent-session-panel__header strong {
  overflow: hidden;
  color: var(--fabric-chat-session-panel-text-primary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-session-panel__header span,
.agent-session-panel__header button {
  color: var(--fabric-chat-session-panel-text-muted);
  font: 10px var(--fabric-font-mono);
}

.agent-session-panel__status {
  text-transform: uppercase;
}

.agent-session-panel__header button {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.agent-session-panel__header button:hover:not(:disabled) {
  color: var(--fabric-chat-session-panel-text-primary);
}

.agent-session-panel__body {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 10px 8px;
}

.agent-session-panel__empty {
  margin: 0;
  color: var(--fabric-chat-session-panel-text-muted);
  font-size: 11px;
}

</style>
