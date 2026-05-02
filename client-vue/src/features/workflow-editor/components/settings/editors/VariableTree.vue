<template>
  <div class="variable-tree">
    <!-- Search bar -->
    <div class="vt-search mb-4">
      <LucideIcon name="search" size="12" class="vt-search-icon" />
      <input class="vt-search-input" placeholder="Buscar variáveis..." v-model="search" />
    </div>

    <JsonTreeView 
      v-if="Object.keys(mockData).length > 0"
      :data="mockData" 
      :is-root="true" 
      :icons="iconsMap"
    />

    <p v-else class="vt-empty">
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
import JsonTreeView from '../shared/JsonTreeView.vue'
import {
  resolveSchemaTree,
  resolveTriggerPaths,
  type SchemaPath,
} from '@/core/utils/schemaResolver'
import type { WorkflowTrigger, WorkflowNode, PluginNode } from '@/core/types/workflow.types'
import type { NodeData } from './types'

const props = defineProps<{
  paramKey: string
  upstreamNodes: GraphNode<NodeData>[]
  nodes: GraphNode<NodeData>[]
}>()

const emit = defineEmits<{
  (e: 'inject', paramKey: string, path: string): void
}>()

const search = ref('')

const { data: plugins, execute: fetchPlugins } = useApi(pluginsApi.getAll, [])
fetchPlugins()

// ... (removed getVariableDisplayLabel)

const allPaths = computed(() => {
  const paths: SchemaPath[] = []

  for (const upNode of props.upstreamNodes) {
    if (upNode.id === 'trigger') {
      const triggerData = upNode.data as unknown as WorkflowTrigger
      if (triggerData?.schema) {
        paths.push(...resolveTriggerPaths(triggerData.schema))
      }
      if (!triggerData?.schema || Object.keys(triggerData.schema).length === 0) {
        paths.push({
          path: 'trigger.payload',
          label: 'trigger.payload',
          type: 'any',
          sourceNodeName: 'Trigger',
        })
      }
      continue
    }

    const upData = upNode.data as unknown as WorkflowNode
    const nodeName: string = upData.name || upNode.id

    if (!('pluginId' in upData)) {
      paths.push({
        path: `steps.${upNode.id}.output`,
        label: 'output',
        type: 'any',
        sourceNodeName: nodeName,
      })
      continue
    }

    const pluginNodeData = upData as PluginNode
    const upPlugin = plugins.value?.find((p) => p.id === pluginNodeData.pluginId)
    const upMethod = upPlugin?.manifest.methods[pluginNodeData.action]

    if (upMethod?.responseSchema) {
      paths.push(...resolveSchemaTree(upNode.id, nodeName, upMethod.responseSchema))
    } else {
      paths.push({
        path: `steps.${upNode.id}.output`,
        label: 'output',
        type: 'any',
        sourceNodeName: nodeName,
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
      p.sourceNodeName.toLowerCase().includes(lowerSearch),
  )
})

const mockData = computed(() => {
  // Pre-seed to guarantee insertion order (trigger first, then steps)
  const obj: any = { trigger: {}, steps: {} }
  
  for (const p of filteredPaths.value) {
    const parts = p.path.split('.')
    let current = obj
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] as string
      if (i === parts.length - 1) {
        current[part] = p.type || 'any'
      } else {
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {}
        }
        current = current[part]
      }
    }
  }
  
  if (Object.keys(obj.trigger).length === 0) delete obj.trigger
  if (Object.keys(obj.steps).length === 0) delete obj.steps
  
  return obj
})

const iconsMap = computed(() => {
  const map: Record<string, string> = {}
  
  // Assign a specific icon for the steps root
  map['steps'] = 'blocks'
  
  const typeIcons: Record<string, string> = {
    http: 'globe',
    code: 'code',
    loop: 'repeat',
    subworkflow: 'layers',
    event: 'bell',
    'event-listener': 'radio',
    if: 'git-branch',
  }

  for (const upNode of props.upstreamNodes) {
    if (upNode.id === 'trigger') {
      map['trigger'] = 'zap'
      map['trigger.payload'] = 'package'
      continue
    }

    const upData = upNode.data as unknown as WorkflowNode
    
    if ('pluginId' in upData) {
      const pluginNodeData = upData as PluginNode
      const upPlugin = plugins.value?.find((p) => p.id === pluginNodeData.pluginId)
      if (upPlugin?.manifest.metadata.icon) {
        map[`steps.${upNode.id}`] = upPlugin.manifest.metadata.icon
      } else {
        map[`steps.${upNode.id}`] = 'puzzle'
      }
    } else {
      map[`steps.${upNode.id}`] = upNode.type ? (typeIcons[upNode.type] || 'settings') : 'settings'
    }

    // Assign a specific icon for the output root of the node
    map[`steps.${upNode.id}.output`] = 'file-output'
  }
  
  return map
})
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



.vt-empty {
  font-size: 11px;
  color: var(--nod8-text-muted);
  font-style: italic;
  padding: 0 4px;
}
</style>
