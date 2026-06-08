<template>
  <div
    class="add-node-panel"
    :class="{ 'add-node-panel--secondary-left': secondarySide === 'left' }"
  >
    <div class="add-node-content" @wheel.stop>
      <div v-if="pluginsLoading" class="add-node-loading">
        <LucideIcon name="loader-2" :size="20" class="add-node-spinner" />
        <span>Loading plugins...</span>
      </div>

      <div v-else class="add-node-cascade">
        <section class="add-node-cascade__primary">
          <header class="add-node-cascade__header add-node-cascade__header--search">
            <span>Add to workflow</span>
            <BaseInput
              ref="searchInput"
              v-model="search"
              class="add-node-cascade__search"
              icon-left="search"
              placeholder="Search"
            />
          </header>
          <div class="add-node-cascade__scroller">
            <template v-if="isSearching">
              <AddNodePickerItem
                v-for="item in globalSearchItems"
                :key="item.id"
                :label="item.label"
                :description="item.description"
                :icon="item.kind === 'plugin' ? pluginIcon(item.plugin) : item.icon"
                :chevron="item.kind === 'plugin' && pluginNeedsMethodSubmenu(item.plugin)"
                @click="selectGlobalSearchItem(item)"
              />
              <div v-if="globalSearchItems.length === 0" class="add-node-cascade__empty">
                No nodes found.
              </div>
            </template>
            <template v-else>
              <AddNodePickerItem
                v-for="item in categoryItems"
                :key="item.category"
                :label="item.label"
                :description="item.description"
                :icon="item.icon"
                :count="item.count"
                :active="activeCategory === item.category"
                chevron
                @mouseenter="hoverCategory(item.category)"
                @focus="hoverCategory(item.category)"
              />
              <div v-if="categoryItems.length === 0" class="add-node-cascade__empty">
                No categories found.
              </div>
            </template>
          </div>
        </section>

        <Transition name="add-node-secondary">
          <section
            v-if="activeCategory"
            class="add-node-cascade__secondary"
            @mouseenter="keepSecondaryOpen"
          >
            <header class="add-node-cascade__header">{{ activeCategory }}</header>
            <div class="add-node-cascade__scroller">
              <AddNodePickerItem
                v-for="item in secondColumnItems"
                :key="item.id"
                :label="item.label"
                :description="item.description"
                :icon="item.kind === 'plugin' ? pluginIcon(item.plugin) : item.icon"
                :active="methodSubmenuPlugin?.id === item.id.replace('plugin:', '')"
                :chevron="item.kind === 'plugin' && pluginNeedsMethodSubmenu(item.plugin)"
                @click="selectSecondColumnItem(item)"
              />
              <div v-if="secondColumnItems.length === 0" class="add-node-cascade__empty">
                No plugins or presets found.
              </div>
            </div>

            <Transition name="add-node-methods">
              <div v-if="methodSubmenuPlugin" class="add-node-cascade__methods">
                <header class="add-node-cascade__header">
                  <button class="add-node-cascade__back" type="button" @click="closeMethodSubmenu">
                    <LucideIcon name="chevron-left" :size="14" />
                  </button>
                  <span>{{ methodSubmenuPlugin.manifest.metadata.name }}</span>
                </header>
                <div class="add-node-cascade__scroller">
                  <AddNodePickerItem
                    v-for="item in methodSubmenuItems"
                    :key="item.id"
                    :label="item.label"
                    :description="item.description"
                    icon="workflow"
                    @click="addPluginAction(methodSubmenuPlugin, item.methodKey, item.label)"
                  />
                  <div v-if="methodSubmenuItems.length === 0" class="add-node-cascade__empty">
                    No actions found.
                  </div>
                </div>
              </div>
            </Transition>
          </section>
        </Transition>
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
  secondarySide?: 'right' | 'left'
}>()

const SUPPORTED_CHAT_MODEL_ADAPTERS = new Set(['openai-compatible', 'generic', 'ollama'])

const search = ref('')
const searchInput = ref<InstanceType<typeof BaseInput>>()
const hoveredCategory = ref<PluginCategory | null>(null)
const methodSubmenuPlugin = ref<PluginSummary | null>(null)
const { isDark } = useTheme()
const { data: plugins, loading: pluginsLoading, execute: loadPlugins } = useApi(pluginsApi.getAll)

onMounted(() => {
  loadPlugins()
  searchInput.value?.focus()
})

const secondarySide = computed(() => props.secondarySide ?? 'right')

const isAgentModelContext = computed(() => props.agentConfigHandle === 'chatModel')
const isAgentMemoryContext = computed(() => props.agentConfigHandle === 'memory')
const isAgentToolContext = computed(() => props.agentConfigHandle === 'tool')

const LOGIC_NODES: AddNodePickerPreset[] = [
  { id: 'trigger', nodeType: 'trigger' as WorkflowNodeType, label: 'Trigger', description: 'Add another workflow entry point', icon: 'zap', categories: ['Core'] },
  { id: 'code', nodeType: 'code' as WorkflowNodeType, label: 'Code Block', description: 'Run custom JavaScript in a sandbox', icon: 'code-2', categories: ['Core', 'Developer'] },
  { id: 'http', nodeType: 'http' as WorkflowNodeType, label: 'HTTP Request', description: 'Send an HTTP request to an external API', icon: 'globe', categories: ['Core', 'Developer'] },
  { id: 'if', nodeType: 'if' as WorkflowNodeType, label: 'If / Else', description: 'Branch the flow based on a condition', icon: 'git-branch', categories: ['Flow'] },
  { id: 'switch', nodeType: 'switch' as WorkflowNodeType, label: 'Switch', description: 'Route to multiple paths based on a value', icon: 'git-branch-plus', categories: ['Flow'] },
  { id: 'loop', nodeType: 'loop' as WorkflowNodeType, label: 'Loop / ForEach', description: 'Iterate over a collection item by item', icon: 'repeat', categories: ['Flow'] },
  { id: 'merge', nodeType: 'merge' as WorkflowNodeType, label: 'Merge', description: 'Merge parallel flows into a single path', icon: 'merge', categories: ['Flow'] },
  { id: 'split-in-batches', nodeType: 'split-in-batches' as WorkflowNodeType, label: 'Split In Batches', description: 'Split an array into batches and process each one', icon: 'layers', categories: ['Flow', 'Data transformation'] },
  { id: 'set', nodeType: 'set' as WorkflowNodeType, label: 'Set Fields', description: 'Set or rename fields without JavaScript', icon: 'sliders-horizontal', categories: ['Data transformation', 'Core'] },
  { id: 'event', nodeType: 'event' as WorkflowNodeType, label: 'Event Emitter', description: 'Publish an event to trigger other flows', icon: 'zap', categories: ['Core'] },
  { id: 'event-listener', nodeType: 'event-listener' as WorkflowNodeType, label: 'Event Listener', description: 'Wait for an event to trigger a sub-flow', icon: 'target', categories: ['Core', 'Flow'] },
  { id: 'subworkflow', nodeType: 'subworkflow' as WorkflowNodeType, label: 'Sub-Workflow', description: 'Call another workflow as a sub-step', icon: 'layers', categories: ['Flow'] },
  { id: 'respond-webhook', nodeType: 'respond-webhook' as WorkflowNodeType, label: 'Respond to Webhook', description: 'Respond to the HTTP caller with a custom status and body', icon: 'send', categories: ['Core'] },
  { id: 'wait-form', nodeType: 'wait-form' as WorkflowNodeType, label: 'Wait for Form', description: 'Create a temporary form and continue after submission', icon: 'clipboard-list', categories: ['Flow'] },
]

const AI_NODES: AddNodePickerPreset[] = [
  { id: 'ai-agent', nodeType: 'ai-agent' as WorkflowNodeType, label: 'AI Agent', description: 'Run a governed agent with tools and memory', icon: 'bot', categories: ['AI'] },
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

const normalizedSearch = computed(() => search.value.trim().toLowerCase())
const isSearching = computed(() => normalizedSearch.value.length > 0)

const matchesFuzzyLetters = (value: string, query: string) => {
  const haystack = value.toLowerCase()
  let cursor = 0
  for (const char of query.toLowerCase()) {
    cursor = haystack.indexOf(char, cursor)
    if (cursor === -1) return false
    cursor += 1
  }
  return true
}

const categoryItems = computed(() =>
  buildPickerCategoryItems({
    plugins: pickerPlugins.value,
    presets: pickerPresets.value,
    search: isSearching.value ? undefined : search.value,
  }),
)

const activeCategory = computed(() => {
  const categories = categoryItems.value.map((item) => item.category)
  if (hoveredCategory.value && categories.includes(hoveredCategory.value)) return hoveredCategory.value
  return null
})

const secondColumnItems = computed(() =>
  buildPickerSecondColumnItems({
    category: activeCategory.value,
    plugins: pickerPlugins.value,
    presets: pickerPresets.value,
    search: search.value,
  }),
)

const methodSubmenuItems = computed(() =>
  buildPickerActionItems({
    plugin: methodSubmenuPlugin.value,
    agentConfigHandle: props.agentConfigHandle,
    search: '',
  }),
)

const globalSearchItems = computed(() => {
  const query = normalizedSearch.value
  if (!query) return []

  const presets = pickerPresets.value
    .filter((preset) => matchesFuzzyLetters(`${preset.label} ${preset.description}`, query))
    .map((preset): AddNodePickerSecondColumnItem => ({
      kind: 'preset',
      id: `preset:${preset.id}`,
      preset,
      label: preset.label,
      description: preset.description,
      icon: preset.icon,
    }))

  const plugins = pickerPlugins.value
    .filter((plugin) =>
      matchesFuzzyLetters(
        `${plugin.manifest.metadata.name} ${plugin.manifest.metadata.description}`,
        query,
      ),
    )
    .map((plugin): AddNodePickerSecondColumnItem => ({
      kind: 'plugin',
      id: `plugin:${plugin.id}`,
      plugin,
      label: plugin.manifest.metadata.name,
      description: plugin.manifest.metadata.description,
      icon: plugin.manifest.metadata.icon || 'box',
    }))

  return [...presets, ...plugins]
})

const pluginIcon = (plugin: PluginSummary) =>
  resolvePluginIcon(plugin.manifest.metadata, { isDark: isDark.value, fallback: 'box' })

const hoverCategory = (category: PluginCategory) => {
  if (hoveredCategory.value !== category) methodSubmenuPlugin.value = null
  hoveredCategory.value = category
}

const keepSecondaryOpen = () => {
  hoveredCategory.value = activeCategory.value
}

const pluginActionItems = (plugin: PluginSummary) =>
  buildPickerActionItems({
    plugin,
    agentConfigHandle: props.agentConfigHandle,
    search: '',
  })

const pluginNeedsMethodSubmenu = (plugin: PluginSummary) => pluginActionItems(plugin).length > 1

const openMethodSubmenu = (plugin: PluginSummary) => {
  methodSubmenuPlugin.value = plugin
}

const closeMethodSubmenu = () => {
  methodSubmenuPlugin.value = null
}

const addSinglePluginMethod = (plugin: PluginSummary) => {
  const action = pluginActionItems(plugin)[0]
  if (!action) return
  addPluginAction(plugin, action.methodKey, action.label)
}

const selectSecondColumnItem = (item: AddNodePickerSecondColumnItem) => {
  if (item.kind === 'preset') {
    props.onAddLogicNode?.(item.preset.nodeType, item.preset.defaults)
    return
  }

  if (isAgentModelContext.value) {
    addAgentModelNode(item.plugin)
    return
  }
  if (isAgentMemoryContext.value) {
    addAgentMemoryNode(item.plugin)
    return
  }

  if (pluginNeedsMethodSubmenu(item.plugin)) {
    openMethodSubmenu(item.plugin)
    return
  }

  addSinglePluginMethod(item.plugin)
}

const selectGlobalSearchItem = (item: AddNodePickerSecondColumnItem) => {
  if (item.kind === 'plugin') {
    const category = item.plugin.manifest.metadata.categories[0] as PluginCategory | undefined
    if (category) hoverCategory(category)
  }
  selectSecondColumnItem(item)
}

const addPluginAction = (plugin: PluginSummary, methodKey: string, label: string) => {
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
  --anp-column-width: 288px;
  --anp-panel-height: min(458px, calc(100vh - 32px));
  position: relative;
  width: var(--anp-column-width);
  min-width: var(--anp-column-width);
  height: var(--anp-panel-height);
  overflow: visible;
}

.add-node-content,
.add-node-cascade,
.add-node-cascade__primary,
.add-node-cascade__secondary {
  height: 100%;
  min-height: 0;
}

.add-node-content {
  overflow: visible;
}

.add-node-cascade {
  position: relative;
}

.add-node-cascade__primary,
.add-node-cascade__secondary,
.add-node-cascade__methods {
  display: flex;
  width: var(--anp-column-width);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-elevated);
  box-shadow: var(--sailor-shadow-lg);
}

.add-node-cascade__primary {
  position: relative;
}

.add-node-cascade__secondary {
  position: absolute;
  top: 0;
  left: calc(100% + var(--sailor-space-2));
}

.add-node-panel--secondary-left .add-node-cascade__secondary {
  right: calc(100% + var(--sailor-space-2));
  left: auto;
}

.add-node-cascade__methods {
  position: absolute;
  inset: 0;
  z-index: 2;
  border: none;
}

.add-node-cascade__header {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  height: 38px;
  flex: 0 0 auto;
  padding: 0 var(--sailor-space-3);
  border-bottom: 1px solid var(--sailor-border);
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
  font-weight: 600;
}

.add-node-cascade__header--search {
  justify-content: space-between;
}

.add-node-cascade__header--search > span {
  flex: 0 0 auto;
}

.add-node-cascade__search {
  width: 126px;
  flex: 0 0 auto;
}

.add-node-cascade__search :deep(.base-input-container) {
  min-height: 26px;
}

.add-node-cascade__search :deep(.base-input) {
  height: 26px;
  min-height: 26px;
  font-size: var(--sailor-text-xs);
}

.add-node-cascade__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-muted);
  cursor: pointer;
}

.add-node-cascade__back:hover {
  background: var(--sailor-button-ghost-hover);
  color: var(--sailor-text-primary);
}

.add-node-cascade__scroller {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: var(--sailor-space-2);
}

.add-node-cascade__empty {
  display: flex;
  min-height: 120px;
  align-items: center;
  justify-content: center;
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
  font-size: var(--sailor-text-sm);
}

.add-node-loading {
  display: flex;
  width: var(--anp-column-width);
  height: var(--anp-panel-height);
  align-items: center;
  justify-content: center;
  gap: var(--sailor-space-2);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-sm);
  box-shadow: var(--sailor-shadow-lg);
}

.add-node-spinner {
  animation: spin 1s linear infinite;
}

.add-node-secondary-enter-active,
.add-node-secondary-leave-active,
.add-node-methods-enter-active,
.add-node-methods-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.add-node-secondary-enter-from,
.add-node-secondary-leave-to,
.add-node-methods-enter-from,
.add-node-methods-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 720px) {
  .add-node-panel {
    --anp-column-width: min(288px, calc(100vw - 32px));
  }

  .add-node-cascade__secondary {
    left: 0;
    top: calc(100% + var(--sailor-space-2));
  }
}
</style>
