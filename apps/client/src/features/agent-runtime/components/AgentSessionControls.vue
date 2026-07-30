<template>
  <form
    v-if="pendingInteraction"
    class="agent-controls"
    @submit.prevent="submitResponse"
  >
    <label :for="inputId">{{ pendingInteraction.question }}</label>

    <div v-if="pendingInteraction.kind === 'approval'" class="agent-controls__actions">
      <button type="button" :disabled="busy" @click="$emit('reject', pendingInteraction)">
        Reject
      </button>
      <button
        type="button"
        class="agent-controls__primary"
        :disabled="busy"
        @click="$emit('approve', pendingInteraction)"
      >
        Approve
      </button>
    </div>

    <div v-else class="agent-controls__response">
      <input
        :id="inputId"
        v-model="response"
        :disabled="busy"
        autocomplete="off"
        :placeholder="pendingInteraction.kind === 'selection' ? 'Choose an option' : 'Reply'"
      >
      <button class="agent-controls__primary" :disabled="busy || !response.trim()" type="submit">
        Continue
      </button>
    </div>

    <div class="agent-controls__secondary">
      <button type="button" :disabled="busy" @click="$emit('retry')">Retry</button>
      <button type="button" :disabled="busy" @click="$emit('cancel')">Cancel</button>
    </div>
  </form>

  <div v-else-if="canCancel || canRetry" class="agent-controls agent-controls--inline">
    <button v-if="canRetry" type="button" :disabled="busy" @click="$emit('retry')">Retry</button>
    <button v-if="canCancel" type="button" :disabled="busy" @click="$emit('cancel')">Cancel</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AgentSessionSnapshot, AgentSessionPart } from '../types/agent.types'

const props = withDefaults(defineProps<{
  snapshot: AgentSessionSnapshot
  busy?: boolean
}>(), {
  busy: false,
})

const emit = defineEmits<{
  respond: [value: string, interaction: InteractionPart]
  approve: [interaction: InteractionPart]
  reject: [interaction: InteractionPart]
  retry: []
  cancel: []
}>()

type InteractionPart = Extract<AgentSessionPart, { type: 'interaction' }>

const response = ref('')
const pendingInteraction = computed(() => props.snapshot.pendingInteraction)
const inputId = computed(() => `agent-interaction-${pendingInteraction.value?.interactionId ?? 'none'}`)
const canCancel = computed(() =>
  props.snapshot.activeTurn?.state === 'queued' ||
  props.snapshot.activeTurn?.state === 'running',
)
const canRetry = computed(() => props.snapshot.activeTurn?.state === 'failed')

function submitResponse() {
  const value = response.value.trim()
  const interaction = pendingInteraction.value
  if (!value || !interaction || props.busy) return
  emit('respond', value, interaction)
  response.value = ''
}
</script>

<style scoped>
.agent-controls {
  display: flex;
  flex-direction: column;
  gap: 7px;
  border-top: 1px solid var(--fabric-chat-session-panel-border);
  background: var(--fabric-chat-session-panel-bg-surface);
  padding: 8px;
}

.agent-controls--inline,
.agent-controls__actions,
.agent-controls__response,
.agent-controls__secondary {
  display: flex;
  align-items: center;
  gap: 5px;
}

.agent-controls--inline {
  flex-direction: row;
  justify-content: flex-end;
}

.agent-controls label {
  overflow: hidden;
  color: var(--fabric-chat-session-panel-text-primary);
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-controls__response input {
  height: 24px;
  min-width: 0;
  flex: 1;
  border: 1px solid var(--fabric-chat-session-panel-border);
  border-radius: 3px;
  outline: none;
  background: var(--fabric-chat-session-panel-bg-elevated);
  color: var(--fabric-chat-session-panel-text-primary);
  font-size: 11px;
  padding: 0 7px;
}

.agent-controls__response input:focus {
  border-color: var(--fabric-chat-session-panel-border-strong);
}

.agent-controls__secondary {
  justify-content: flex-end;
}

.agent-controls button {
  min-height: 24px;
  border: 1px solid var(--fabric-chat-session-panel-border);
  border-radius: 3px;
  background: transparent;
  color: var(--fabric-chat-session-panel-text-secondary);
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
  padding: 0 8px;
}

.agent-controls button:hover:not(:disabled) {
  background: var(--fabric-chat-session-panel-bg-elevated);
  color: var(--fabric-chat-session-panel-text-primary);
}

.agent-controls button.agent-controls__primary {
  border-color: var(--fabric-chat-session-panel-border-strong);
  background: var(--fabric-chat-session-panel-bg-inverse);
  color: var(--fabric-chat-session-panel-text-inverse);
}

.agent-controls button:disabled {
  cursor: wait;
  opacity: 0.5;
}
</style>
