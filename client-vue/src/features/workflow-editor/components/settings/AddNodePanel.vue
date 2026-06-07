<template>
  <div class="add-node-panel">
    <div class="add-node-search-wrapper">
      <BaseInput
        ref="searchInput"
        v-model="search"
        icon-left="search"
        :placeholder="searchPlaceholder"
        autofocus
      />
    </div>

    <div class="add-node-content" @wheel.stop>
      <div v-if="pluginsLoading" class="add-node-loading">
        <LucideIcon name="loader-2" :size="20" class="add-node-spinner" />
        <span>Loading plugins...</span>
      </div>

      <div v-else class="add-node-picker-shell">
        <div class="add-node-picker-grid">
          <AddNodePickerColumn
            title="Add to workflow"
            :count="categoryItems.length"
            :empty="categoryItems.length === 0"
            empty-label="No categories found."
          >
            <AddNodePickerItem
              v-for="item in categoryItems"
              :key="item.category"
              :label="item.label"
              :description="item.description"
              :icon="item.icon"
              :count="item.count"
              :active="activeCategory === item.category"
              chevron
              @click="selectCategory(item.category)"
            />
          </AddNodePickerColumn>

          <AddNodePickerColumn
            :title="activeCategory || 'Plugins'"
            :count="secondColumnItems.length"
            :empty="secondColumnItems.length === 0"
            empty-label="No plugins or presets found."
          >
            <AddNodePickerItem
              v-for="item in secondColumnItems"
              :key="item.id"
              :label="item.label"
              :description="item.description"
              :icon="item.kind === 'plugin' ? pluginIcon(item.plugin) : item.icon"
              :active="selectedPickerItemId === item.id"
              :chevron="item.kind === 'plugin'"
              @click="selectSecondColumnItem(item)"
            />
          </AddNodePickerColumn>

          <AddNodePickerColumn
            title="Actions"
            :count="thirdColumnItems.length"
            :empty="!selectedPluginForActions || thirdColumnItems.length === 0"
            :empty-label="selectedPluginForActions ? 'No actions found.' : 'Select a plugin.'"
          >
            <AddNodePickerItem
              v-for="item in thirdColumnItems"
              :key="item.id"
              :label="item.label"
              :description="item.description"
              icon="workflow"
              @click="addPluginAction(item.methodKey, item.label)"
            />
          </AddNodePickerColumn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useApi } from '@/shared/composables/useApi'
import { pluginsApi } from '@/core/api/plugins.api'
import type { PluginCategory, PluginSummary } from '@/core/types/plugin.types'
import type { WorkflowNodeType } from '@/core/types/workflow.types'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useTheme } from '@/shared/composables/useTheme'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'
import AddNodePickerColumn from './AddNodePickerColumn.vue'
import AddNodePickerItem from './AddNodePickerItem.vue'
import {
  buildPickerActionItems,
  buildPickerCategoryItems,
  buildPickerSecondColumnItems,
  type AddNodePickerPreset,
  type AddNodePickerSecondColumnItem,
} from './addNodePickerModel'

const props = defineProps<{
  onAddLogicNode?: (type: WorkflowNodeType, defaults?: Record<string, unknown>) => void
  onAddPluginNode?: (pluginId: string, action: string, actionName: string) => void
  onAddAgentToolNode?: (pluginId: string, action: string, actionName: string) => void
  agentConfigHandle?: 'chatModel' | 'memory' | 'tool'
}>()

const SUPPORTED_CHAT_MODEL_ADAPTERS = new Set(['openai-compatible', 'generic', 'ollama'])

const search = ref('')
const selectedCategory = ref<PluginCategory | null>(null)
const selectedPickerItemId = ref<string | null>(null)
const searchInput = ref<InstanceType<typeof BaseInput>>()
const { isDark } = useTheme()
const { data: plugins, loading: pluginsLoading, execute: loadPlugins } = useApi(pluginsApi.getAll)

onMounted(() => {
  loadPlugins()
  searchInput.value?.focus()
})

const isAgentModelContext = computed(() => props.agentConfigHandle === 'chatModel')
const isAgentMemoryContext = computed(() => props.agentConfigHandle === 'memory')
const isAgentToolContext = computed(() => props.agentConfigHandle === 'tool')

const searchPlaceholder = computed(() => {
  if (isAgentModelContext.value) return 'Search chat models...'
  if (isAgentMemoryContext.value) return 'Search memory...'
  if (isAgentToolContext.value) return 'Search tools...'
  return 'Search components...'
})

const LOGIC_NODES: AddNodePickerPreset[] = [
  {
    id: 'trigger',
    nodeType: 'trigger' as WorkflowNodeType,
    label: 'Trigger',
    description: 'Add another workflow entry point',
    icon: 'zap',
    categories: ['Core'],
  },
  {
    id: 'code',
    nodeType: 'code' as WorkflowNodeType,
    label: 'Code Block',
    description: 'Run custom JavaScript in a sandbox',
    icon: 'code-2',
    categories: ['Core', 'Developer'],
  },
  {
    id: 'http',
    nodeType: 'http' as WorkflowNodeType,
    label: 'HTTP Request',
    description: 'Send an HTTP request to an external API',
    icon: 'globe',
    categories: ['Core', 'Developer'],
  },
  {
    id: 'if',
    nodeType: 'if' as WorkflowNodeType,
    label: 'If / Else',
    description: 'Branch the flow based on a condition',
    icon: 'git-branch',
    categories: ['Flow'],
  },
  {
    id: 'switch',
    nodeType: 'switch' as WorkflowNodeType,
    label: 'Switch',
    description: 'Route to multiple paths based on a value',
    icon: 'git-branch-plus',
    categories: ['Flow'],
  },
  {
    id: 'loop',
    nodeType: 'loop' as WorkflowNodeType,
    label: 'Loop / ForEach',
    description: 'Iterate over a collection item by item',
    icon: 'repeat',
    categories: ['Flow'],
  },
  {
    id: 'merge',
    nodeType: 'merge' as WorkflowNodeType,
    label: 'Merge',
    description: 'Merge parallel flows into a single path',
    icon: 'merge',
    categories: ['Flow'],
  },
  {
    id: 'split-in-batches',
    nodeType: 'split-in-batches' as WorkflowNodeType,
    label: 'Split In Batches',
    description: 'Split an array into batches and process each one',
    icon: 'layers',
    categories: ['Flow', 'Data transformation'],
  },
  {
    id: 'set',
    nodeType: 'set' as WorkflowNodeType,
    label: 'Set Fields',
    description: 'Set or rename fields without JavaScript',
    icon: 'sliders-horizontal',
    categories: ['Data transformation', 'Core'],
  },
  {
    id: 'event',
    nodeType: 'event' as WorkflowNodeType,
    label: 'Event Emitter',
    description: 'Publish an event to trigger other flows',
    icon: 'zap',
    categories: ['Core'],
  },
  {
    id: 'event-listener',
    nodeType: 'event-listener' as WorkflowNodeType,
    label: 'Event Listener',
    description: 'Wait for an event to trigger a sub-flow',
    icon: 'target',
    categories: ['Core', 'Flow'],
  },
  {
    id: 'subworkflow',
    nodeType: 'subworkflow' as WorkflowNodeType,
    label: 'Sub-Workflow',
    description: 'Call another workflow as a sub-step',
    icon: 'layers',
    categories: ['Flow'],
  },
  {
    id: 'respond-webhook',
    nodeType: 'respond-webhook' as WorkflowNodeType,
    label: 'Respond to Webhook',
    description: 'Respond to the HTTP caller with a custom status and body',
    icon: 'send',
    categories: ['Core'],
  },
  {
    id: 'wait-form',
    nodeType: 'wait-form' as WorkflowNodeType,
    label: 'Wait for Form',
    description: 'Create a temporary form and continue after submission',
    icon: 'clipboard-list',
    categories: ['Flow'],
  },
]

const AI_NODES: AddNodePickerPreset[] = [
  {
    id: 'ai-agent',
    nodeType: 'ai-agent' as WorkflowNodeType,
    label: 'AI Agent',
    description: 'Run a governed agent with tools and memory',
    icon: 'bot',
    categories: ['AI'],
  },
]

const AGENT_MEMORY_PRESETS: AddNodePickerPreset[] = [
  {
    id: 'sqlite-memory',
    nodeType: 'ai-memory' as WorkflowNodeType,
    label: 'SQLite Memory',
    description: 'Store short-term agent memory in SQLite',
    icon: 'database',
    categories: ['AI', 'Core'],
    defaults: { name: 'SQLite Memory', adapter: 'sailor-internal', scope: 'session' },
  },
]

const agentChatModelPlugins = computed(() =>
  (plugins.value ?? []).filter((plugin) => {
    const capability = plugin.manifest.metadata.agentCapabilities?.chatModel
    const adapter = capability?.adapter
    return capability?.enabled === true && typeof adapter === 'string' && SUPPORTED_CHAT_MODEL_ADAPTERS.has(adapter)
  }),
)

const agentMemoryStorePlugins = computed(() =>
  (plugins.value ?? []).filter((plugin) =>
    plugin.manifest.metadata.agentCapabilities?.memoryStore?.enabled === true &&
    plugin.manifest.metadata.agentCapabilities.memoryStore.adapter === 'plugin-memory-store',
  ),
)

const pluginHasAgentTools = (plugin: PluginSummary) =>
  Object.values(plugin.manifest.methods).some((method) => method.agentTool?.enabled === true)

const pickerPlugins = computed(() => {
  if (isAgentModelContext.value) return agentChatModelPlugins.value
  if (isAgentMemoryContext.value) return agentMemoryStorePlugins.value
  if (isAgentToolContext.value) return (plugins.value ?? []).filter(pluginHasAgentTools)
  return plugins.value ?? []
})

const pickerPresets = computed(() => {
  if (isAgentModelContext.value || isAgentToolContext.value) return []
  if (isAgentMemoryContext.value) return AGENT_MEMORY_PRESETS
  return [...LOGIC_NODES, ...AI_NODES]
})

const filteredAiNodes = computed(() =>
  AI_NODES.filter((node) => node.label.toLowerCase().includes(search.value.toLowerCase())),
)

const categoryItems = computed(() =>
  buildPickerCategoryItems({
    plugins: pickerPlugins.value,
    presets: pickerPresets.value,
    search: search.value,
  }),
)

const activeCategory = computed(() => selectedCategory.value || categoryItems.value[0]?.category || null)

const secondColumnItems = computed(() =>
  buildPickerSecondColumnItems({
    category: activeCategory.value,
    plugins: pickerPlugins.value,
    presets: pickerPresets.value,
    search: search.value,
  }),
)

const selectedSecondColumnItem = computed(() =>
  secondColumnItems.value.find((item) => item.id === selectedPickerItemId.value) ?? null,
)

const selectedPluginForActions = computed(() => {
  const item = selectedSecondColumnItem.value
  return item?.kind === 'plugin' ? item.plugin : null
})

const thirdColumnItems = computed(() =>
  buildPickerActionItems({
    plugin: selectedPluginForActions.value,
    agentConfigHandle: props.agentConfigHandle,
    search: search.value,
  }),
)

const pluginIcon = (plugin: PluginSummary) =>
  resolvePluginIcon(plugin.manifest.metadata, { isDark: isDark.value, fallback: 'box' })

const selectCategory = (category: PluginCategory) => {
  selectedCategory.value = category
  selectedPickerItemId.value = null
}

const selectSecondColumnItem = (item: AddNodePickerSecondColumnItem) => {
  selectedPickerItemId.value = item.id
  if (item.kind === 'preset') {
    props.onAddLogicNode?.(item.preset.nodeType, item.preset.defaults)
    return
  }

  if (isAgentModelContext.value) addAgentModelNode(item.plugin)
  if (isAgentMemoryContext.value) addAgentMemoryNode(item.plugin)
}

const addPluginAction = (methodKey: string, label: string) => {
  const plugin = selectedPluginForActions.value
  if (!plugin) return

  if (isAgentToolContext.value) {
    props.onAddAgentToolNode?.(plugin.id, methodKey, label)
    return
  }

  props.onAddPluginNode?.(plugin.id, methodKey, label)
}

const chatModelCapability = (plugin: PluginSummary) =>
  plugin.manifest.metadata.agentCapabilities?.chatModel

const memoryStoreCapability = (plugin: PluginSummary) =>
  plugin.manifest.metadata.agentCapabilities?.memoryStore

const addAgentModelNode = (plugin: PluginSummary) => {
  const capability = chatModelCapability(plugin)
  if (!capability?.adapter || !capability.defaultModel) return

  props.onAddLogicNode?.('ai-model' as WorkflowNodeType, {
    name: capability.label || `${plugin.manifest.metadata.name} Chat Model`,
    pluginId: capability.credentialPluginId || plugin.manifest.metadata.id,
    adapter: capability.adapter,
    model: capability.defaultModel,
    baseUrl: capability.defaultBaseUrl,
    thinkingSupported: capability.thinking?.enabled === true,
    thinkingRequest: capability.thinking?.request,
    thinkingEnabled: false,
  })
}

const addAgentMemoryNode = (plugin: PluginSummary) => {
  const capability = memoryStoreCapability(plugin)
  if (!capability?.adapter || !capability.searchMethodId || !capability.putMethodId) return

  props.onAddLogicNode?.('ai-memory' as WorkflowNodeType, {
    name: capability.label || `${plugin.manifest.metadata.name} Memory`,
    pluginId: plugin.manifest.metadata.id,
    adapter: capability.adapter,
    searchMethodId: capability.searchMethodId,
    putMethodId: capability.putMethodId,
    scope: 'profile',
    readEnabled: true,
    writeEnabled: true,
    maxRetrievedMemories: 4,
    maxMemoryChars: 4000,
  })
}
</script>

<style scoped>
.add-node-panel {
  display: flex;
  flex-direction: column;
  min-width: min(920px, calc(100vw - 48px));
  max-width: calc(100vw - 48px);
  height: min(620px, calc(100vh - 120px));
  max-height: calc(100vh - 120px);
  overflow: hidden;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-elevated);
  box-shadow: var(--sailor-shadow-lg);
}

.add-node-search-wrapper {
  padding: var(--sailor-space-3);
  border-bottom: 1px solid var(--sailor-border);
  flex-shrink: 0;
}

.add-node-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

.add-node-picker-shell {
  height: 100%;
  min-height: 0;
}

.add-node-picker-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(240px, 286px));
  height: 100%;
  min-height: 0;
}

:deep(.add-node-picker-column) {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid var(--sailor-border);
  background: var(--sailor-bg-elevated);
}

:deep(.add-node-picker-column:last-child) {
  border-right: 0;
}

:deep(.add-node-picker-column__header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  padding: 0 var(--sailor-space-3);
  border-bottom: 1px solid var(--sailor-border);
  color: var(--sailor-text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

:deep(.add-node-picker-column__header code) {
  color: var(--sailor-text-muted);
  font-size: 10px;
}

:deep(.add-node-picker-column__scroller) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: var(--sailor-space-2);
}

:deep(.add-node-picker-column__empty) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-sm);
}

:deep(.add-node-picker-item) {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-3);
  width: 100%;
  min-height: 58px;
  padding: var(--sailor-space-2);
  border: 0;
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

:deep(.add-node-picker-item:hover),
:deep(.add-node-picker-item--active) {
  background: var(--sailor-button-ghost-hover);
}

:deep(.add-node-picker-item__icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-muted);
}

:deep(.add-node-picker-item__body) {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

:deep(.add-node-picker-item__label) {
  overflow: hidden;
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.add-node-picker-item__description) {
  display: -webkit-box;
  overflow: hidden;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
  line-height: 1.25;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

:deep(.add-node-picker-item__count),
:deep(.add-node-picker-item__chevron) {
  flex: 0 0 auto;
  color: var(--sailor-text-muted);
}

.add-node-loading {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: var(--sailor-space-2);
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-sm);
}

.add-node-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 860px) {
  .add-node-panel {
    min-width: min(360px, calc(100vw - 32px));
  }

  .add-node-picker-grid {
    grid-template-columns: 1fr;
  }

  :deep(.add-node-picker-column) {
    min-height: 220px;
    border-right: 0;
    border-bottom: 1px solid var(--sailor-border);
  }
}
</style>
