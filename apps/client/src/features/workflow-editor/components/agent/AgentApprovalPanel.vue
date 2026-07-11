<template>
  <section class="agent-approval-panel">
    <div class="agent-approval-panel__summary">
      <strong>{{ toolName }}</strong>
      <span>{{ sideEffect }}</span>
      <span v-if="pending">pending</span>
    </div>

    <pre class="agent-approval-panel__args">{{ formatJson(sanitizedArgs) }}</pre>

    <BaseTextarea
      v-model="reason"
      :rows="2"
      :disabled="pending"
      placeholder="Optional decision reason"
      aria-label="Approval reason"
    />

    <div class="agent-approval-panel__actions">
      <BaseButton size="sm" variant="danger" :disabled="pending" @click="rejectApproval">
        Reject
      </BaseButton>
      <BaseButton size="sm" variant="primary" :disabled="pending" @click="approveApproval">
        Approve
      </BaseButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'
import { agentChatApi } from '@/core/api/agent-chat.api'

const SECRET_FIELD_PATTERN = /authorization|password|secret|token|apiKey/i

const props = defineProps<{
  approvalId: string
  executionId: string
  toolName: string
  sideEffect: string
  args?: unknown
}>()

const emit = defineEmits<{
  refreshTrace: []
}>()

const pending = ref(false)
const reason = ref('')
const sanitizedArgs = computed(() => redactSecretLikeFields(props.args ?? {}))

async function approveApproval() {
  pending.value = true
  try {
    await agentChatApi.approveToolCall(props.approvalId, {
      executionId: props.executionId,
      reason: reason.value || undefined,
    })
    emit('refreshTrace')
  } finally {
    pending.value = false
  }
}

async function rejectApproval() {
  pending.value = true
  try {
    await agentChatApi.rejectToolCall(props.approvalId, {
      executionId: props.executionId,
      reason: reason.value || undefined,
    })
    emit('refreshTrace')
  } finally {
    pending.value = false
  }
}

function redactSecretLikeFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecretLikeFields)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SECRET_FIELD_PATTERN.test(key) ? '[REDACTED]' : redactSecretLikeFields(item),
    ]),
  )
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}
</script>

<style scoped>
.agent-approval-panel {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-2);
  padding: var(--fabric-space-2);
  border-top: 1px solid var(--fabric-border);
}

.agent-approval-panel__summary,
.agent-approval-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
}

.agent-approval-panel__summary {
  flex-wrap: wrap;
  justify-content: space-between;
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
}

.agent-approval-panel__summary span {
  color: var(--fabric-text-muted);
  font-family: var(--fabric-font-mono);
  font-size: 10px;
}

.agent-approval-panel__args {
  max-height: 120px;
  margin: 0;
  overflow: auto;
  padding: var(--fabric-space-2);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-base);
  color: var(--fabric-text-secondary);
  font-family: var(--fabric-font-mono);
  font-size: 10px;
  white-space: pre-wrap;
  word-break: break-word;
}

.agent-approval-panel__actions {
  justify-content: flex-end;
}
</style>
