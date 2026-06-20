<template>
  <div class="global-add-node-panel">
    <div class="global-add-node-panel__toolbar">
      <BaseInput
        ref="searchInput"
        v-model="search"
        icon-left="search"
        placeholder="Search nodes..."
      />
    </div>

    <div v-if="isLoading" class="global-add-node-panel__loading">
      <LucideIcon name="loader-2" :size="18" class="global-add-node-panel__spinner" />
      <span>Loading nodes...</span>
    </div>

    <div v-else class="global-add-node-panel__sections">
      <section class="global-add-node-panel__section">
        <button
          class="global-add-node-panel__section-header"
          type="button"
          @click="utilitiesOpen = !utilitiesOpen"
        >
          <span>Utilities</span>
          <LucideIcon :name="utilitiesOpen ? 'chevron-up' : 'chevron-down'" :size="14" />
        </button>
        <div v-if="utilitiesOpen" class="global-add-node-panel__grid">
          <button
            v-for="item in utilityItems"
            :key="item.id"
            class="global-add-node-panel__item"
            type="button"
            draggable="true"
            @click="props.onAddLogicNodeAtCenter?.(item.nodeType, item.defaults)"
            @dragstart="handleDragStart($event, {
              kind: 'logic',
              nodeType: item.nodeType,
              defaults: item.defaults,
            })"
          >
            <span
              class="global-add-node-panel__icon"
              :style="item.style ? {
                '--node-icon-bg': item.style.bgColor,
                '--node-icon-border': item.style.borderColor,
                '--node-icon-color': item.style.iconColor,
              } : undefined"
            >
              <LucideIcon :name="item.icon" :size="15" />
            </span>
            <span>{{ item.label }}</span>
          </button>
          <div v-if="utilityItems.length === 0" class="global-add-node-panel__empty">
            No utilities found.
          </div>
        </div>
      </section>

      <section class="global-add-node-panel__section">
        <button
          class="global-add-node-panel__section-header"
          type="button"
          @click="integrationsOpen = !integrationsOpen"
        >
          <span>Integrations</span>
          <LucideIcon :name="integrationsOpen ? 'chevron-up' : 'chevron-down'" :size="14" />
        </button>
        <div v-if="integrationsOpen" class="global-add-node-panel__grid">
          <template v-for="plugin in integrationItems" :key="plugin.id">
            <button
              class="global-add-node-panel__item"
              type="button"
              :draggable="pluginActionItems(plugin).length === 1"
              @click="selectPlugin(plugin)"
              @dragstart="handlePluginDragStart($event, plugin)"
            >
              <span class="global-add-node-panel__icon">
                <LucideIcon :name="pluginIcon(plugin)" :size="15" />
              </span>
              <span>{{ plugin.manifest.metadata.name }}</span>
            </button>
            <div
              v-if="expandedPluginId === plugin.id && pluginActionItems(plugin).length > 1"
              class="global-add-node-panel__actions"
            >
              <button
                v-for="action in pluginActionItems(plugin)"
                :key="action.id"
                class="global-add-node-panel__action"
                type="button"
                draggable="true"
                @click="props.onAddPluginNodeAtCenter?.(plugin.id, action.methodKey, action.label)"
                @dragstart="handleDragStart($event, {
                  kind: 'plugin',
                  pluginId: plugin.id,
                  action: action.methodKey,
                  actionName: action.label,
                })"
              >
                {{ action.label }}
              </button>
            </div>
          </template>
          <div v-if="integrationItems.length === 0" class="global-add-node-panel__empty">
            No integrations found.
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { pluginsApi } from '@/core/api/plugins.api'
import { workflowNodesApi } from '@/core/api/workflowNodes.api'
import type { PluginSummary } from '@/core/types/plugin.types'
import type { WorkflowNodeType } from '@/core/types/workflow.types'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import { useApi } from '@/shared/composables/useApi'
import { useTheme } from '@/shared/composables/useTheme'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'
import { replaceNodeDefinitions } from '../../catalog/nodeDefinitionRegistry'
import {
  buildPickerActionItems,
  catalogItemsToPickerPresets,
  filterDefaultPickerPresets,
  isVectorStoreProvider,
  type AddNodePickerPreset,
} from './addNodePickerModel'

type GlobalAddNodeDragPayload =
  | {
      kind: 'logic'
      nodeType: WorkflowNodeType
      defaults?: Record<string, unknown>
    }
  | {
      kind: 'plugin'
      pluginId: string
      action: string
      actionName: string
    }

const props = defineProps<{
  onAddLogicNodeAtCenter?: (type: WorkflowNodeType, defaults?: Record<string, unknown>) => void
  onAddPluginNodeAtCenter?: (pluginId: string, action: string, actionName: string) => void
}>()

const search = ref('')
const searchInput = ref<InstanceType<typeof BaseInput>>()
const utilitiesOpen = ref(true)
const integrationsOpen = ref(true)
const expandedPluginId = ref<string | null>(null)
const { isDark } = useTheme()
const { data: plugins, loading: pluginsLoading, execute: loadPlugins } = useApi(pluginsApi.getAll)
const {
  data: workflowNodeCatalog,
  loading: workflowNodeCatalogLoading,
  execute: loadWorkflowNodeCatalog,
} = useApi(workflowNodesApi.getCatalog)

watch(workflowNodeCatalog, (catalog) => replaceNodeDefinitions(catalog?.nodes ?? []), {
  immediate: true,
})

onMounted(() => {
  loadPlugins()
  loadWorkflowNodeCatalog()
  searchInput.value?.focus()
})

const isLoading = computed(() => pluginsLoading.value || workflowNodeCatalogLoading.value)
const normalizedSearch = computed(() => search.value.trim().toLowerCase())

const matchesSearch = (...values: Array<string | undefined>) => {
  const query = normalizedSearch.value
  if (!query) return true
  return values.some((value) => value?.toLowerCase().includes(query))
}

const utilityItems = computed<AddNodePickerPreset[]>(() =>
  filterDefaultPickerPresets(catalogItemsToPickerPresets(workflowNodeCatalog.value?.nodes ?? []))
    .filter((item) => matchesSearch(item.label, item.description)),
)

const integrationItems = computed(() =>
  (plugins.value ?? [])
    .filter((plugin) => !isVectorStoreProvider(plugin))
    .filter((plugin) =>
      matchesSearch(plugin.manifest.metadata.name, plugin.manifest.metadata.description),
    ),
)

const pluginIcon = (plugin: PluginSummary) =>
  resolvePluginIcon(plugin.manifest.metadata, { isDark: isDark.value, fallback: 'box' })

const pluginActionItems = (plugin: PluginSummary) => buildPickerActionItems({ plugin, search: '' })

const handleDragStart = (event: DragEvent, payload: GlobalAddNodeDragPayload) => {
  event.dataTransfer?.setData('application/x-sailor-add-node', JSON.stringify(payload))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}

const handlePluginDragStart = (event: DragEvent, plugin: PluginSummary) => {
  const action = pluginActionItems(plugin)[0]
  if (!action || pluginActionItems(plugin).length !== 1) {
    event.preventDefault()
    return
  }

  handleDragStart(event, {
    kind: 'plugin',
    pluginId: plugin.id,
    action: action.methodKey,
    actionName: action.label,
  })
}

const selectPlugin = (plugin: PluginSummary) => {
  const actions = pluginActionItems(plugin)
  if (actions.length === 1) {
    const action = actions[0]
    if (action) {
      expandedPluginId.value = null
      props.onAddPluginNodeAtCenter?.(plugin.id, action.methodKey, action.label)
    }
    return
  }

  expandedPluginId.value = expandedPluginId.value === plugin.id ? null : plugin.id
}
</script>

<style scoped>
.global-add-node-panel {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

.global-add-node-panel__toolbar {
  flex: 0 0 auto;
  padding: var(--sailor-space-3);
  border-bottom: 1px solid var(--sailor-border);
}

.global-add-node-panel__loading,
.global-add-node-panel__empty {
  display: flex;
  min-height: 96px;
  align-items: center;
  justify-content: center;
  gap: var(--sailor-space-2);
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-sm);
}

.global-add-node-panel__spinner {
  animation: global-add-node-spin 1s linear infinite;
}

.global-add-node-panel__sections {
  min-height: 0;
  overflow-y: auto;
  padding: var(--sailor-space-2) var(--sailor-space-3) var(--sailor-space-4);
}

.global-add-node-panel__section {
  border-bottom: 1px solid var(--sailor-border);
}

.global-add-node-panel__section-header {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: var(--sailor-space-3) 0;
  border: 0;
  background: transparent;
  color: var(--sailor-text-primary);
  font: inherit;
  font-size: var(--sailor-text-sm);
  font-weight: 700;
  cursor: pointer;
}

.global-add-node-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sailor-space-2);
  padding-bottom: var(--sailor-space-3);
}

.global-add-node-panel__item,
.global-add-node-panel__action {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--sailor-space-2);
  border: 0;
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-primary);
  font: inherit;
  font-size: var(--sailor-text-sm);
  text-align: left;
  cursor: grab;
}

.global-add-node-panel__item {
  min-height: 38px;
  padding: var(--sailor-space-1);
}

.global-add-node-panel__item:hover,
.global-add-node-panel__action:hover {
  background: var(--sailor-button-ghost-hover);
}

.global-add-node-panel__icon {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--node-icon-border, var(--sailor-border));
  border-radius: var(--sailor-radius-sm);
  background: var(--node-icon-bg, var(--sailor-bg-surface));
  color: var(--node-icon-color, var(--sailor-text-muted));
}

.global-add-node-panel__item span:last-child,
.global-add-node-panel__action {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-add-node-panel__actions {
  grid-column: 1 / -1;
  display: grid;
  gap: var(--sailor-space-1);
  padding: 0 0 var(--sailor-space-2) 36px;
}

.global-add-node-panel__action {
  min-height: 30px;
  padding: 0 var(--sailor-space-2);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
}

@keyframes global-add-node-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
