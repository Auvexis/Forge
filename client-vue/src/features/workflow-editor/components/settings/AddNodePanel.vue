<template>
  <div
    class="add-node-panel"
    :class="{ 'add-node-panel--secondary-left': secondarySide === 'left' }"
  >
    <div class="add-node-content" @wheel.stop>
      <div v-if="isLoading" class="add-node-loading">
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
                :style-meta="item.kind === 'plugin' ? undefined : item.preset.style"
                :chevron="item.kind === 'plugin' && pluginNeedsMethodSubmenu(item.plugin)"
                @click="selectGlobalSearchItem(item)"
              />
              <div v-if="globalSearchItems.length === 0" class="add-node-cascade__empty">
                No nodes found.
              </div>
            </template>
            <template v-else>
              <div v-if="showQuickTrigger" class="add-node-cascade__quick-section">
                <div class="add-node-cascade__section-label">Trigger</div>
                <AddNodePickerItem
                  :label="TRIGGER_PRESET.label"
                  :description="TRIGGER_PRESET.description"
                  :icon="TRIGGER_PRESET.icon"
                  :style-meta="TRIGGER_PRESET.style"
                  @click="addQuickTrigger"
                />
              </div>

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
                :style-meta="item.kind === 'plugin' ? undefined : item.preset.style"
                :active="methodSubmenuPlugin?.id === item.id.replace('plugin:', '')"
                :chevron="item.kind === 'plugin' && pluginNeedsMethodSubmenu(item.plugin)"
                @click="selectSecondColumnItem(item)"
              />
              <div v-if="secondColumnItems.length === 0" class="add-node-cascade__empty">
                No plugins or presets found.
              </div>
            </div>

            <Transition name="add-node-methods">
              <div v-if="methodSubmenuPlugin || vectorStoreProviderPickerOpen" class="add-node-cascade__methods">
                <header class="add-node-cascade__header">
                  <BaseButton
                    icon-left="chevron-left"
                    variant="ghost"
                    size="icon"
                    @click="closeMethodSubmenu"
                  />
                  <span>{{ vectorStoreProviderPickerOpen ? 'Vector Store' : methodSubmenuPlugin?.manifest.metadata.name }}</span>
                </header>
                <div class="add-node-cascade__scroller">
                  <template v-if="vectorStoreProviderPickerOpen">
                    <AddNodePickerItem
                      v-for="item in vectorStoreProviderItems"
                      :key="item.id"
                      :label="item.label"
                      :description="item.description"
                      :icon="pluginIcon(item.plugin)"
                      @click="addVectorStoreNode(item.plugin)"
                    />
                    <div v-if="vectorStoreProviderItems.length === 0" class="add-node-cascade__empty">
                      No vector store providers found.
                    </div>
                  </template>
                  <template v-else-if="methodSubmenuPlugin">
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
                  </template>
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
import { workflowNodesApi } from '@/core/api/workflowNodes.api'
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
  buildEmbeddingProviderItems,
  buildVectorStoreProviderItems,
  catalogItemsToPickerPresets,
  isVectorStoreProvider,
  type AddNodePickerPreset,
  type AddNodePickerSecondColumnItem,
} from './addNodePickerModel'
import BaseButton from '@/shared/components/base/BaseButton.vue'

const props = defineProps<{
  onAddLogicNode?: (type: WorkflowNodeType, defaults?: Record<string, unknown>) => void
  onAddPluginNode?: (pluginId: string, action: string, actionName: string) => void
  onAddAgentToolNode?: (pluginId: string, action: string, actionName: string) => void
  agentConfigHandle?: 'chatModel' | 'memory' | 'tool'
  vectorConfigHandle?: 'embedding' | 'document'
  secondarySide?: 'right' | 'left'
}>()

const SUPPORTED_CHAT_MODEL_ADAPTERS = new Set(['openai-compatible', 'generic', 'ollama'])

const search = ref('')
const searchInput = ref<InstanceType<typeof BaseInput>>()
const hoveredCategory = ref<PluginCategory | null>(null)
const methodSubmenuPlugin = ref<PluginSummary | null>(null)
const vectorStoreProviderPickerOpen = ref(false)
const { isDark } = useTheme()
const { data: plugins, loading: pluginsLoading, execute: loadPlugins } = useApi(pluginsApi.getAll)
const {
  data: workflowNodeCatalog,
  loading: workflowNodeCatalogLoading,
  execute: loadWorkflowNodeCatalog,
} = useApi(workflowNodesApi.getCatalog)

onMounted(() => {
  loadPlugins()
  loadWorkflowNodeCatalog()
  searchInput.value?.focus()
})

const secondarySide = computed(() => props.secondarySide ?? 'right')
const isLoading = computed(() => pluginsLoading.value || workflowNodeCatalogLoading.value)

const isAgentModelContext = computed(() => props.agentConfigHandle === 'chatModel')
const isAgentMemoryContext = computed(() => props.agentConfigHandle === 'memory')
const isAgentToolContext = computed(() => props.agentConfigHandle === 'tool')
const isEmbeddingContext = computed(() => props.vectorConfigHandle === 'embedding')
const isDocumentContext = computed(() => props.vectorConfigHandle === 'document')
const showQuickTrigger = computed(() =>
  !isAgentModelContext.value && !isAgentMemoryContext.value && !isAgentToolContext.value,
)

const AI_NODES: AddNodePickerPreset[] = [
  { id: 'ai-agent', nodeType: 'ai-agent' as WorkflowNodeType, label: 'AI Agent', description: 'Run a governed agent with tools and memory', icon: 'bot', categories: ['AI'] },
]

const TRIGGER_PRESET: AddNodePickerPreset = {
  id: 'trigger',
  nodeType: 'trigger' as WorkflowNodeType,
  label: 'Trigger',
  description: 'Add another workflow entry point',
  icon: 'zap',
  categories: ['Core'],
  style: {
    icon: 'zap',
    iconColor: '#facc15',
    bgColor: '#fef9c3',
    borderColor: '#fde047',
  },
}

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
  if (isDocumentContext.value) return []
  if (isEmbeddingContext.value) {
    return [...new Map(
      buildEmbeddingProviderItems({ plugins: plugins.value ?? [] })
        .map((item) => [item.plugin.id, item.plugin]),
    ).values()]
  }
  if (isAgentModelContext.value) return agentChatModelPlugins.value
  if (isAgentMemoryContext.value) return agentMemoryStorePlugins.value
  if (isAgentToolContext.value) return (plugins.value ?? []).filter(pluginHasAgentTools)
  return (plugins.value ?? []).filter((plugin) => !isVectorStoreProvider(plugin))
})

const pickerPresets = computed(() => {
  if (isEmbeddingContext.value) return []
  if (isDocumentContext.value) {
    const datasetTypes = ['text-dataset', 'file-dataset', 'database-dataset']
    return catalogItemsToPickerPresets(workflowNodeCatalog.value?.nodes ?? [])
      .filter((preset) => datasetTypes.includes(preset.nodeType))
  }
  if (isAgentModelContext.value || isAgentToolContext.value) return []
  if (isAgentMemoryContext.value) return AGENT_MEMORY_PRESETS
  return [
    ...catalogItemsToPickerPresets(workflowNodeCatalog.value?.nodes ?? []),
    ...AI_NODES,
  ]
})

const searchablePresets = computed(() => {
  if (!showQuickTrigger.value) return pickerPresets.value
  return [
    TRIGGER_PRESET,
    ...pickerPresets.value.filter((preset) => preset.nodeType !== 'trigger'),
  ]
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

const vectorStoreProviderItems = computed(() =>
  buildVectorStoreProviderItems({ plugins: plugins.value ?? [] }),
)

const globalSearchItems = computed(() => {
  const query = normalizedSearch.value
  if (!query) return []

  const presets = searchablePresets.value
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
  if (hoveredCategory.value !== category) {
    methodSubmenuPlugin.value = null
    vectorStoreProviderPickerOpen.value = false
  }
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
  vectorStoreProviderPickerOpen.value = false
  methodSubmenuPlugin.value = plugin
}

const closeMethodSubmenu = () => {
  methodSubmenuPlugin.value = null
  vectorStoreProviderPickerOpen.value = false
}

const addQuickTrigger = () => {
  props.onAddLogicNode?.('trigger' as WorkflowNodeType, TRIGGER_PRESET.defaults)
}

const addSinglePluginMethod = (plugin: PluginSummary) => {
  const action = pluginActionItems(plugin)[0]
  if (!action) return
  addPluginAction(plugin, action.methodKey, action.label)
}

const selectSecondColumnItem = (item: AddNodePickerSecondColumnItem) => {
  if (item.kind === 'preset') {
    if (item.preset.nodeType === 'vector-store') {
      methodSubmenuPlugin.value = null
      vectorStoreProviderPickerOpen.value = true
      return
    }
    props.onAddLogicNode?.(item.preset.nodeType, item.preset.defaults)
    return
  }

  if (isEmbeddingContext.value) {
    addEmbeddingNode(item.plugin)
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

const addEmbeddingNode = (plugin: PluginSummary) => {
  const provider = buildEmbeddingProviderItems({ plugins: [plugin] })[0]
  if (!provider) return

  const properties = plugin.manifest.methods[provider.methodKey]?.parameters.properties ?? {}
  props.onAddLogicNode?.('embeddings', {
    name: `${plugin.manifest.metadata.name} Embeddings`,
    pluginId: plugin.id,
    methodId: provider.methodKey,
    model: String(properties.model?.default ?? ''),
    dimension: Number(properties.dimension?.default ?? 1536),
    input: '',
    batchSize: Number(properties.batchSize?.default ?? 64),
  })
}

const addVectorStoreNode = (plugin: PluginSummary) => {
  props.onAddLogicNode?.('vector-store', {
    name: `${plugin.manifest.metadata.name} Vector Store`,
    pluginId: plugin.id,
    ensureCollectionMethodId: 'ensureCollection',
    upsertMethodId: 'upsertDocuments',
    queryMethodId: 'querySimilar',
    deleteMethodId: 'deleteDocuments',
    describeMethodId: 'describeCollection',
    collectionName: 'documents',
    dimension: 1536,
    metric: 'cosine',
    config: {},
  })
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
  animation: add-node-primary-in 0.18s ease-out both;
  transform-origin: left center;
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
  gap: var(--sailor-space-4);
  height: 48px;
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
  width: 36px;
  height: 36px;
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

.add-node-cascade__quick-section {
  margin-bottom: var(--sailor-space-2);
  padding-bottom: var(--sailor-space-2);
  border-bottom: 1px solid var(--sailor-border);
}

.add-node-cascade__section-label {
  padding: var(--sailor-space-1) var(--sailor-space-2) var(--sailor-space-2);
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
  font-weight: 700;
  line-height: 1.2;
  text-transform: uppercase;
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
  border-color: var(--node-icon-border, var(--sailor-border));
  border-radius: var(--sailor-radius-sm);
  background: var(--node-icon-bg, var(--sailor-bg-surface));
  color: var(--node-icon-color, var(--sailor-text-muted));
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

@keyframes add-node-primary-in {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .add-node-cascade__primary {
    animation: none;
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
