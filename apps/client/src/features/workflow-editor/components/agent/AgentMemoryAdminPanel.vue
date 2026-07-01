<template>
  <section class="agent-memory-admin-panel">
    <header class="agent-memory-admin-panel__header">
      <h3>Memory</h3>
      <BaseButton size="sm" variant="outline" icon-left="refresh-cw" @click="loadMemories">
        Refresh
      </BaseButton>
    </header>

    <div v-if="loading" class="agent-memory-admin-panel__status">Loading memories...</div>
    <div v-else-if="error" class="agent-memory-admin-panel__status agent-memory-admin-panel__status--error">
      {{ error }}
    </div>

    <div v-else class="agent-memory-admin-panel__list">
      <article v-for="memory in memories" :key="memory.id" class="agent-memory-admin-panel__item">
        <div class="agent-memory-admin-panel__item-main">
          <strong>{{ memory.namespace }} / {{ memory.key }}</strong>
          <span>{{ memory.source }}</span>
          <p>{{ memoryValuePreview(memory.value) }}</p>
        </div>

        <BaseButton
          size="sm"
          variant="danger"
          icon-left="trash-2"
          :aria-label="`Delete memory ${memory.key}`"
          @click="removeMemory(memory.id)"
        >
          Delete
        </BaseButton>
      </article>

      <div v-if="!memories.length" class="agent-memory-admin-panel__status">No memories stored.</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { agentToolsApi } from '@/core/api/agent-tools.api'
import type { AgentMemoryRecord } from '@/features/agent-runtime/types/agent.types'

const MAX_MEMORY_PREVIEW_CHARS = 160

const memories = ref<AgentMemoryRecord[]>([])
const loading = ref(false)
const error = ref('')

async function loadMemories() {
  loading.value = true
  error.value = ''

  try {
    memories.value = await agentToolsApi.listMemory()
  } catch {
    error.value = 'Unable to load agent memories.'
  } finally {
    loading.value = false
  }
}

async function removeMemory(memoryId: string) {
  await agentToolsApi.deleteMemory(memoryId)
  memories.value = memories.value.filter((memory) => memory.id !== memoryId)
}

function memoryValuePreview(value: unknown) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)
  if (serialized.length <= MAX_MEMORY_PREVIEW_CHARS) return serialized

  return `${serialized.slice(0, MAX_MEMORY_PREVIEW_CHARS)}...`
}

onMounted(loadMemories)
</script>

<style scoped>
.agent-memory-admin-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-3);
}

.agent-memory-admin-panel__header,
.agent-memory-admin-panel__item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sailor-space-3);
}

.agent-memory-admin-panel__header h3 {
  margin: 0;
  font-size: var(--sailor-text-sm);
}

.agent-memory-admin-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}

.agent-memory-admin-panel__item {
  padding: var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-overlay);
}

.agent-memory-admin-panel__item-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.agent-memory-admin-panel__item-main strong,
.agent-memory-admin-panel__item-main span,
.agent-memory-admin-panel__item-main p,
.agent-memory-admin-panel__status {
  font-size: var(--sailor-text-xs);
}

.agent-memory-admin-panel__item-main span,
.agent-memory-admin-panel__status {
  color: var(--sailor-text-muted);
}

.agent-memory-admin-panel__item-main p {
  margin: var(--sailor-space-1) 0 0;
  color: var(--sailor-text-secondary);
  word-break: break-word;
}

.agent-memory-admin-panel__status--error {
  color: var(--sailor-text-error);
}
</style>
