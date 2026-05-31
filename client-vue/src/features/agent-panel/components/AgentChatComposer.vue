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
  gap: 10px;
  padding: 14px 18px 18px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
}

.agent-chat-composer__input {
  min-height: 72px;
  resize: vertical;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 8px;
  padding: 10px 12px;
  color: #111827;
  font: inherit;
  line-height: 1.45;
}

.agent-chat-composer__input:focus {
  border-color: #0ea5e9;
  outline: none;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
}

.agent-chat-composer__send {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  align-self: end;
  border: 0;
  border-radius: 8px;
  background: #0f172a;
  color: #ffffff;
  cursor: pointer;
}

.agent-chat-composer__send:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>
