<template>
  <form class="agent-chat-composer" @submit.prevent="submit">
    <textarea
      v-model="draft"
      class="agent-chat-composer__input"
      rows="3"
      placeholder="Message this agent"
      :disabled="sending"
      @keydown.ctrl.enter.prevent="submit"
    ></textarea>
    <button type="submit" class="agent-chat-composer__send" :disabled="sending || !draft.trim()">
      <LucideIcon name="send" :size="16" />
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps<{
  sending: boolean
}>()

const emit = defineEmits<{
  send: [message: string]
}>()

const draft = ref('')

function submit() {
  const message = draft.value.trim()
  if (!message) return
  emit('send', message)
  draft.value = ''
}
</script>

<style scoped>
.agent-chat-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-3) var(--sailor-space-4) var(--sailor-space-4);
  border-top: 1px solid var(--sailor-border);
  background: var(--sailor-bg-base);
}

.agent-chat-composer__input {
  min-height: 72px;
  resize: vertical;
  border: 1px solid var(--sailor-input-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-input-bg);
  padding: 10px var(--sailor-space-3);
  color: var(--sailor-input-text);
  font: inherit;
  line-height: 1.45;
}

.agent-chat-composer__input:focus {
  border-color: var(--sailor-input-border-focus);
  outline: none;
  box-shadow: var(--sailor-shadow-sm);
}

.agent-chat-composer__send {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  align-self: end;
  border: 0;
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-inverse);
  color: var(--sailor-text-inverse);
  cursor: pointer;
}

.agent-chat-composer__send:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>
