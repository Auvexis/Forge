<template>
  <form class="agent-chat-composer" :class="`agent-chat-composer--${mode}`" @submit.prevent="submit">
    <textarea
      v-model="draft"
      class="agent-chat-composer__input"
      :rows="mode === 'hero' ? 1 : 2"
      placeholder="What are the best open opportunities by company size?"
      :disabled="sending"
      @keydown.ctrl.enter.prevent="submit"
    ></textarea>

    <div class="agent-chat-composer__toolbar">
      <button type="button" class="agent-chat-composer__utility">
        Select Source
        <LucideIcon name="chevron-down" :size="12" />
      </button>
      <span class="agent-chat-composer__spacer" />
      <button type="button" class="agent-chat-composer__utility">
        <LucideIcon name="paperclip" :size="13" />
        Attach
      </button>
      <button type="button" class="agent-chat-composer__utility">
        <LucideIcon name="mic" :size="13" />
        Voice
      </button>
      <button type="submit" class="agent-chat-composer__send" :disabled="sending || !draft.trim()">
        <LucideIcon name="arrow-up" :size="14" />
        Send
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(
  defineProps<{
    sending: boolean
    mode?: 'dock' | 'hero'
  }>(),
  {
    mode: 'dock',
  },
)

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
  display: flex;
  width: min(100%, 724px);
  flex-direction: column;
  gap: var(--sailor-space-3);
  border: 1px solid rgba(12, 17, 29, 0.12);
  border-radius: var(--sailor-radius-xl);
  background: #ffffff;
  padding: var(--sailor-space-4);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
}

.agent-chat-composer--dock {
  width: min(100% - var(--sailor-space-12), 760px);
  margin: 0 auto var(--sailor-space-5);
}

.agent-chat-composer--hero {
  width: min(100%, 724px);
}

.agent-chat-composer__input {
  min-height: 28px;
  max-height: 140px;
  resize: none;
  border: 0;
  background: transparent;
  padding: 0;
  color: #0b1220;
  font: inherit;
  font-size: 13px;
  line-height: 1.45;
}

.agent-chat-composer__input:focus {
  outline: none;
}

.agent-chat-composer__input::placeholder {
  color: #0b1220;
}

.agent-chat-composer__toolbar {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
}

.agent-chat-composer__spacer {
  flex: 1;
}

.agent-chat-composer__utility {
  display: inline-flex;
  height: 24px;
  align-items: center;
  gap: 5px;
  border: 1px solid rgba(12, 17, 29, 0.08);
  border-radius: var(--sailor-radius-full);
  background: #ffffff;
  padding: 0 var(--sailor-space-3);
  color: #0b1220;
  font: inherit;
  font-size: 12px;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.06);
  cursor: pointer;
}

.agent-chat-composer__send {
  display: inline-flex;
  height: 28px;
  align-items: center;
  gap: 6px;
  align-self: end;
  border: 0;
  border-radius: var(--sailor-radius-full);
  background: #061025;
  padding: 0 var(--sailor-space-4);
  color: #ffffff;
  font: inherit;
  font-size: 12px;
  font-weight: var(--sailor-font-semibold);
  cursor: pointer;
}

.agent-chat-composer__send:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>
