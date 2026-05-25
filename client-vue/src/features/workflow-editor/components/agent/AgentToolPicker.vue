<template>
  <div class="agent-tool-picker">
    <BaseInput
      v-model="query"
      icon-left="search"
      placeholder="Search plugin, method, or description"
      aria-label="Search agent tools"
    />

    <div class="agent-tool-picker__status" v-if="loading">Loading tools...</div>
    <div class="agent-tool-picker__status agent-tool-picker__status--error" v-else-if="error">
      {{ error }}
    </div>

    <div v-else class="agent-tool-picker__list">
      <div
        v-for="tool in filteredTools"
        :key="`${tool.pluginId}:${tool.methodId}`"
        class="agent-tool-picker__option"
        :class="{ 'agent-tool-picker__option--selected': isSelected(tool) }"
      >
        <button
          class="agent-tool-picker__select"
          type="button"
          @click="selectTool(tool)"
        >
          <span class="agent-tool-picker__main">
            <span class="agent-tool-picker__name">{{ tool.name || tool.methodId }}</span>
            <span class="agent-tool-picker__ids">{{ tool.pluginId }} / {{ tool.methodId }}</span>
            <span class="agent-tool-picker__description">{{ tool.description }}</span>
          </span>

          <span class="agent-tool-picker__meta">
            <span
              class="agent-tool-picker__badge"
              :class="{ 'agent-tool-picker__badge--danger': isDestructiveSideEffect(tool.sideEffect) }"
              :data-side-effect="tool.sideEffect"
            >
              {{ formatSideEffect(tool.sideEffect) }}
            </span>
            <span
              class="agent-tool-picker__badge"
              :class="{ 'agent-tool-picker__badge--approval': tool.requiresApproval }"
              :aria-label="tool.requiresApproval ? 'Tool approval required' : 'Tool approval not required'"
            >
              {{ tool.requiresApproval ? 'Approval required' : 'No approval' }}
            </span>
          </span>
        </button>

        <button
          class="agent-tool-picker__schema-toggle"
          type="button"
          :aria-label="schemaToggleLabel(tool)"
          @click="toggleSchema(tool)"
        >
          Schema preview
        </button>
        <pre
          v-if="expandedSchemas.has(schemaKey(tool))"
          class="agent-tool-picker__schema"
        >{{ schemaPreview(tool.inputSchema) }}</pre>
      </div>

      <div v-if="!filteredTools.length" class="agent-tool-picker__status">No tools found.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import { agentToolsApi } from '@/core/api/agent-tools.api'
import type { AgentToolDefinition } from '@/features/agent-runtime/types/agent.types'

const props = defineProps<{
  pluginId?: string
  methodId?: string
}>()

const emit = defineEmits<{
  select: [
    value: {
      pluginId: string
      methodId: string
      sideEffect: AgentToolDefinition['sideEffect']
      requiresApproval: boolean
      timeoutMs: number
    },
  ]
}>()

const query = ref('')
const tools = ref<AgentToolDefinition[]>([])
const loading = ref(false)
const error = ref('')
const expandedSchemas = ref(new Set<string>())

const filteredTools = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return tools.value

  return tools.value.filter((tool) => {
    return [tool.pluginId, tool.methodId, tool.name, tool.description].some((value) =>
      value.toLowerCase().includes(needle),
    )
  })
})

async function loadTools() {
  loading.value = true
  error.value = ''

  try {
    tools.value = await agentToolsApi.listTools()
  } catch {
    error.value = 'Unable to load agent tools.'
  } finally {
    loading.value = false
  }
}

function isSelected(tool: AgentToolDefinition) {
  return tool.pluginId === props.pluginId && tool.methodId === props.methodId
}

function selectTool(tool: AgentToolDefinition) {
  emit('select', {
    pluginId: tool.pluginId,
    methodId: tool.methodId,
    sideEffect: tool.sideEffect,
    requiresApproval: tool.requiresApproval,
    timeoutMs: tool.timeoutMs,
  })
}

function schemaPreview(inputSchema: AgentToolDefinition['inputSchema']) {
  return JSON.stringify(inputSchema ?? {}, null, 2)
}

function schemaKey(tool: AgentToolDefinition) {
  return `${tool.pluginId}:${tool.methodId}`
}

function toggleSchema(tool: AgentToolDefinition) {
  const next = new Set(expandedSchemas.value)
  const key = schemaKey(tool)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedSchemas.value = next
}

function schemaToggleLabel(tool: AgentToolDefinition) {
  return `${expandedSchemas.value.has(schemaKey(tool)) ? 'Hide' : 'Show'} schema preview for ${tool.name || tool.methodId}`
}

function isDestructiveSideEffect(sideEffect: AgentToolDefinition['sideEffect']) {
  return ['delete', 'external-payment', 'filesystem'].includes(sideEffect)
}

function formatSideEffect(sideEffect: AgentToolDefinition['sideEffect']) {
  return sideEffect
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

onMounted(loadTools)
</script>

<style scoped>
.agent-tool-picker {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}

.agent-tool-picker__list {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
  max-height: 360px;
  overflow: auto;
}

.agent-tool-picker__option {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--sailor-space-2);
  width: 100%;
  padding: var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-overlay);
  color: var(--sailor-text-primary);
  text-align: left;
}

.agent-tool-picker__option:hover,
.agent-tool-picker__option--selected {
  border-color: var(--sailor-border-strong);
  background: var(--sailor-bg-elevated);
}

.agent-tool-picker__select {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--sailor-space-2);
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.agent-tool-picker__main,
.agent-tool-picker__meta {
  display: flex;
  min-width: 0;
}

.agent-tool-picker__main {
  flex-direction: column;
  gap: 2px;
}

.agent-tool-picker__meta {
  flex-wrap: wrap;
  gap: var(--sailor-space-2);
}

.agent-tool-picker__name {
  font-size: var(--sailor-text-sm);
  font-weight: var(--sailor-font-semibold);
}

.agent-tool-picker__ids,
.agent-tool-picker__description,
.agent-tool-picker__status {
  font-size: var(--sailor-text-xs);
  color: var(--sailor-text-muted);
}

.agent-tool-picker__status {
  padding: var(--sailor-space-2) 0;
}

.agent-tool-picker__status--error {
  color: var(--sailor-text-error);
}

.agent-tool-picker__badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 var(--sailor-space-2);
  border-radius: var(--sailor-radius-sm);
  border: 1px solid var(--sailor-border);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
}

.agent-tool-picker__badge--approval {
  border-color: var(--sailor-warning-border, var(--sailor-border-strong));
  color: var(--sailor-text-warning, var(--sailor-text-primary));
}

.agent-tool-picker__badge--danger {
  border-color: var(--sailor-red-400);
  color: var(--sailor-red-400);
}

.agent-tool-picker__schema-toggle {
  width: fit-content;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--sailor-text-muted);
  cursor: pointer;
  font-size: var(--sailor-text-xs);
  text-align: left;
}

.agent-tool-picker__schema {
  max-height: 96px;
  overflow: auto;
  margin: 0;
  padding: var(--sailor-space-2);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-muted);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
