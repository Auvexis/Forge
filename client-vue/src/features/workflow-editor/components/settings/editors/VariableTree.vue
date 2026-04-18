<template>
  <div class="variable-tree">
    <!-- Search bar -->
    <div class="vt-search">
      <LucideIcon name="search" size="12" class="vt-search-icon" />
      <input
        class="vt-search-input"
        placeholder="Buscar variáveis..."
        v-model="search"
      />
    </div>

    <!-- Grouped chips -->
    <div v-for="(paths, groupName) in groupedPaths" :key="groupName" class="vt-group">
      <span class="vt-group-title">{{ groupName }}</span>
      <div class="vt-chips">
        <button
          v-for="(p, idx) in paths"
          :key="`${p.path}:${idx}`"
          type="button"
          class="vt-chip"
          :title="p.path"
          @click="onInject(paramKey, p.path)"
        >
          <LucideIcon name="check" size="10" class="vt-chip-icon" />
          <span class="vt-chip-label">{{ getVariableDisplayLabel(p.path, p.label) }}</span>
          <span class="vt-chip-type">{{ p.type }}</span>
        </button>
      </div>
    </div>

    <p v-if="filteredPaths.length === 0" class="vt-empty">
      Nenhuma variável encontrada para "{{ search }}"
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GraphNode } from '@vue-flow/core'
import { useApi } from '@/shared/composables/useApi'
import { pluginsApi } from '@/core/api/plugins.api'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { resolveSchemaTree, resolveTriggerPaths, type SchemaPath } from '@/core/utils/schemaResolver'

const props = defineProps<{
  paramKey: string
  upstreamNodes: GraphNode<any>[]
  nodes: GraphNode<any>[]
}>()

const emit = defineEmits<{
  (e: 'inject', paramKey: string, path: string): void
}>()

const search = ref('')

const { data: plugins, execute: fetchPlugins } = useApi(pluginsApi.getAll, [])
fetchPlugins()

const getVariableDisplayLabel = (path: string, fallbackLabel: string): string => {
  if (path.startsWith('steps.')) {
    const parts = path.split('.')
    if (parts.length >= 3) {
      const [, nodeId, ...rest] = parts
      if (nodeId && rest.length > 0) {
        return `${nodeId}.${rest.join('.')}`
      }
    }
  }
  return fallbackLabel
}

const allPaths = computed(() => {
  const paths: SchemaPath[] = []
  
  for (const upNode of props.upstreamNodes) {
    if (upNode.id === 'trigger') {
      const triggerData = upNode.data as any
      if (triggerData?.schema) {
        paths.push(...resolveTriggerPaths(triggerData.schema))
      }
      if (!triggerData?.schema || Object.keys(triggerData.schema).length === 0) {
        paths.push({
          path: 'trigger',
          label: 'trigger.payload',
          type: 'object',
          sourceNodeName: 'Trigger'
        })
      }
      continue
    }

    const upData = upNode.data as any
    const nodeName: string = upData.name || upNode.id

    if (!upData.pluginId) {
      paths.push({
        path: `steps.${upNode.id}.output`,
        label: 'output',
        type: 'any',
        sourceNodeName: nodeName
      })
      continue
    }

    const upPlugin = plugins.value?.find((p) => p.id === upData.pluginId)
    const upMethod = upPlugin?.manifest.methods[upData.action]
    
    if (upMethod?.responseSchema) {
      paths.push(...resolveSchemaTree(upNode.id, nodeName, upMethod.responseSchema))
    } else {
      paths.push({
        path: `steps.${upNode.id}.output`,
        label: 'output',
        type: 'any',
        sourceNodeName: nodeName
      })
    }
  }

  // Deduplicate
  const deduped: SchemaPath[] = []
  const seen = new Set<string>()
  for (const p of paths) {
    if (seen.has(p.path)) continue
    seen.add(p.path)
    deduped.push(p)
  }
  
  return deduped
})

const filteredPaths = computed(() => {
  if (!search.value) return allPaths.value
  const lowerSearch = search.value.toLowerCase()
  return allPaths.value.filter(
    (p) =>
      p.path.toLowerCase().includes(lowerSearch) ||
      p.label.toLowerCase().includes(lowerSearch) ||
      p.sourceNodeName.toLowerCase().includes(lowerSearch)
  )
})

const groupedPaths = computed(() => {
  const grouped: Record<string, SchemaPath[]> = {}
  for (const p of filteredPaths.value) {
    grouped[p.sourceNodeName] = grouped[p.sourceNodeName] || []
    grouped[p.sourceNodeName]!.push(p)
  }
  return grouped
})

const onInject = (paramKey: string, path: string) => {
  emit('inject', paramKey, path)
}
</script>

<style scoped>
.variable-tree {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
  margin-top: var(--nod8-space-1);
}

.vt-search {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-1);
  padding: 6px 8px;
  border-radius: var(--nod8-radius-md);
  border: 1px solid var(--nod8-border);
  background-color: var(--nod8-bg-canvas);
}

.vt-search-icon {
  color: var(--nod8-text-muted);
  flex-shrink: 0;
}

.vt-search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 11px;
  outline: none;
  color: var(--nod8-text-primary);
}

.vt-search-input::placeholder {
  color: var(--nod8-text-muted);
  opacity: 0.5;
}

.vt-group {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-1);
}

.vt-group-title {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--nod8-text-muted);
  opacity: 0.6;
  margin-left: 2px;
}

.vt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.vt-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  padding: 6px 10px;
  border-radius: var(--nod8-radius-md);
  cursor: pointer;
  max-width: 100%;
  transition: all var(--nod8-duration-fast);
}

.vt-chip:hover {
  background-color: rgba(16, 185, 129, 0.2);
}

.vt-chip:active {
  transform: scale(0.97);
}

.vt-chip-icon {
  color: rgb(16, 185, 129);
  opacity: 0.5;
  flex-shrink: 0;
}

.vt-chip-label {
  font-size: 11px;
  font-weight: 700;
  color: rgb(16, 185, 129);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vt-chip-type {
  font-size: 9px;
  color: rgb(16, 185, 129);
  opacity: 0.6;
  flex-shrink: 0;
}

.vt-empty {
  font-size: 11px;
  color: var(--nod8-text-muted);
  font-style: italic;
  padding: 0 4px;
}
</style>
