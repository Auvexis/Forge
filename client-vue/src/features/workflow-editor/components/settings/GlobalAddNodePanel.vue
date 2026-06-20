<template>
  <div class="global-add-node-panel">
    <Transition name="global-add-node-view" mode="out-in">
      <div
        v-if="selectedPlugin"
        :key="selectedPlugin.id"
        class="global-add-node-panel__method-view"
      >
        <header class="global-add-node-panel__method-header">
          <BaseButton
            icon-left="chevron-left"
            variant="ghost"
            size="icon"
            @click="closePluginMethodView"
          />
          <BaseInput
            ref="methodSearchInput"
            v-model="methodSearch"
            icon-left="search"
            :placeholder="`Search ${selectedPlugin.manifest.metadata.name}...`"
          />
        </header>

        <div class="global-add-node-panel__method-title">
          <span class="global-add-node-panel__icon">
            <LucideIcon :name="pluginIcon(selectedPlugin)" :size="15" />
          </span>
          <span>{{ selectedPlugin.manifest.metadata.name }}</span>
        </div>

        <div class="global-add-node-panel__method-list">
          <button
            v-for="action in filteredSelectedPluginActions"
            :key="action.id"
            class="global-add-node-panel__method-item"
            type="button"
            draggable="true"
            @pointerdown="rememberDragOrigin"
            @click="props.onAddPluginNodeAtCenter?.(selectedPlugin.id, action.methodKey, action.label)"
            @dragstart="handleDragStart($event, {
              kind: 'plugin',
              pluginId: selectedPlugin.id,
              action: action.methodKey,
              actionName: action.label,
              preview: {
                icon: pluginIcon(selectedPlugin),
                label: action.label,
                subtitle: selectedPlugin.manifest.metadata.name,
              },
            })"
            @dragend="handleDragEnd"
          >
            <span class="global-add-node-panel__method-icon">
              <LucideIcon name="workflow" :size="15" />
            </span>
            <span class="global-add-node-panel__method-body">
              <span>{{ action.label }}</span>
              <small>{{ action.description }}</small>
            </span>
          </button>
          <div v-if="filteredSelectedPluginActions.length === 0" class="global-add-node-panel__empty">
            No methods found.
          </div>
        </div>
      </div>

      <div v-else key="sections" class="global-add-node-panel__browse-view">
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
              <span class="global-add-node-panel__section-label">
                <LucideIcon name="wrench" :size="15" />
                <span>Utilities</span>
              </span>
              <LucideIcon :name="utilitiesOpen ? 'chevron-up' : 'chevron-down'" :size="14" />
            </button>
            <Transition name="global-add-node-section">
              <div v-if="utilitiesOpen" class="global-add-node-panel__grid">
                <button
                  v-for="item in utilityItems"
                  :key="item.id"
                  class="global-add-node-panel__item"
                  type="button"
                  draggable="true"
                  @pointerdown="rememberDragOrigin"
                  @click="props.onAddLogicNodeAtCenter?.(item.nodeType, item.defaults)"
                  @dragstart="handleDragStart($event, {
                    kind: 'logic',
                    nodeType: item.nodeType,
                    defaults: item.defaults,
                    preview: {
                      icon: item.icon,
                      label: item.label,
                      subtitle: 'Utility',
                    },
                  })"
                  @dragend="handleDragEnd"
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
                <button
                  v-for="plugin in utilityPluginItems"
                  :key="plugin.id"
                  class="global-add-node-panel__item"
                  type="button"
                  :draggable="pluginActionItems(plugin).length === 1"
                  @pointerdown="rememberDragOrigin"
                  @click="selectPlugin(plugin)"
                  @dragstart="handlePluginDragStart($event, plugin)"
                  @dragend="handleDragEnd"
                >
                  <span class="global-add-node-panel__icon">
                    <LucideIcon :name="pluginIcon(plugin)" :size="15" />
                  </span>
                  <span>{{ plugin.manifest.metadata.name }}</span>
                  <span
                    v-if="pluginActionItems(plugin).length > 1"
                    class="global-add-node-panel__method-more"
                  >
                    <LucideIcon name="plus" :size="14" />
                  </span>
                </button>
                <div
                  v-if="utilityItems.length === 0 && utilityPluginItems.length === 0"
                  class="global-add-node-panel__empty"
                >
                  No utilities found.
                </div>
              </div>
            </Transition>
          </section>

          <section class="global-add-node-panel__section">
            <button
              class="global-add-node-panel__section-header"
              type="button"
              @click="integrationsOpen = !integrationsOpen"
            >
              <span class="global-add-node-panel__section-label">
                <LucideIcon name="puzzle" :size="15" />
                <span>Integrations</span>
              </span>
              <LucideIcon :name="integrationsOpen ? 'chevron-up' : 'chevron-down'" :size="14" />
            </button>
            <Transition name="global-add-node-section">
              <div v-if="integrationsOpen" class="global-add-node-panel__grid">
                <button
                  v-for="plugin in integrationItems"
                  :key="plugin.id"
                  class="global-add-node-panel__item"
                  type="button"
                  :draggable="pluginActionItems(plugin).length === 1"
                  @pointerdown="rememberDragOrigin"
                  @click="selectPlugin(plugin)"
                  @dragstart="handlePluginDragStart($event, plugin)"
                  @dragend="handleDragEnd"
                >
                  <span class="global-add-node-panel__icon">
                    <LucideIcon :name="pluginIcon(plugin)" :size="15" />
                  </span>
                  <span>{{ plugin.manifest.metadata.name }}</span>
                  <span
                    v-if="pluginActionItems(plugin).length > 1"
                    class="global-add-node-panel__method-more"
                  >
                    <LucideIcon name="plus" :size="14" />
                  </span>
                </button>
                <div v-if="integrationItems.length === 0" class="global-add-node-panel__empty">
                  No integrations found.
                </div>
              </div>
            </Transition>
          </section>
        </div>
      </div>
    </Transition>

    <Teleport to="body">
      <div
        v-if="dragPreview"
        class="global-add-node-drag-preview"
        :style="dragPreviewStyle"
      >
        <div class="global-add-node-drag-preview__node">
          <span class="global-add-node-drag-preview__icon">
            <LucideIcon :name="dragPreview.icon" :size="28" />
          </span>
        </div>
        <div class="global-add-node-drag-preview__label">{{ dragPreview.label }}</div>
        <div class="global-add-node-drag-preview__subtitle">{{ dragPreview.subtitle }}</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { pluginsApi } from '@/core/api/plugins.api'
import { workflowNodesApi } from '@/core/api/workflowNodes.api'
import type { PluginSummary } from '@/core/types/plugin.types'
import type { WorkflowNodeType } from '@/core/types/workflow.types'
import BaseButton from '@/shared/components/base/BaseButton.vue'
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
      preview?: DragPreviewMeta
    }
  | {
      kind: 'plugin'
      pluginId: string
      action: string
      actionName: string
      preview?: DragPreviewMeta
    }

interface DragPreviewMeta {
  icon: string
  label: string
  subtitle: string
}

const props = defineProps<{
  onAddLogicNodeAtCenter?: (type: WorkflowNodeType, defaults?: Record<string, unknown>) => void
  onAddPluginNodeAtCenter?: (pluginId: string, action: string, actionName: string) => void
}>()

const search = ref('')
const methodSearch = ref('')
const searchInput = ref<InstanceType<typeof BaseInput>>()
const methodSearchInput = ref<InstanceType<typeof BaseInput>>()
const utilitiesOpen = ref(true)
const integrationsOpen = ref(true)
const selectedPlugin = ref<PluginSummary | null>(null)
const dragPreview = ref<DragPreviewMeta | null>(null)
const dragPreviewPoint = ref({ x: 0, y: 0 })
const dragPreviewVelocity = ref({ x: 0, y: 0 })
const dragPreviewScale = ref(0.72)
let lastDragPoint = { x: 0, y: 0, t: 0 }
let dragOriginPoint = { x: 0, y: 0 }
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

onBeforeUnmount(() => {
  removeDragPreviewListeners()
})

const isLoading = computed(() => pluginsLoading.value || workflowNodeCatalogLoading.value)
const normalizedSearch = computed(() => search.value.trim().toLowerCase())
const normalizedMethodSearch = computed(() => methodSearch.value.trim().toLowerCase())

const matchesSearch = (...values: Array<string | undefined>) => {
  const query = normalizedSearch.value
  if (!query) return true
  return values.some((value) => value?.toLowerCase().includes(query))
}

const matchesMethodSearch = (...values: Array<string | undefined>) => {
  const query = normalizedMethodSearch.value
  if (!query) return true
  return values.some((value) => value?.toLowerCase().includes(query))
}

const utilityItems = computed<AddNodePickerPreset[]>(() =>
  filterDefaultPickerPresets(catalogItemsToPickerPresets(workflowNodeCatalog.value?.nodes ?? []))
    .filter((item) => matchesSearch(item.label, item.description)),
)

const pluginItems = computed(() => (plugins.value ?? []).filter((plugin) => !isVectorStoreProvider(plugin)))

const utilityPluginItems = computed(() =>
  pluginItems.value
    .filter((plugin) => plugin.manifest.metadata.utility === true)
    .filter((plugin) =>
      matchesSearch(plugin.manifest.metadata.name, plugin.manifest.metadata.description),
    ),
)

const integrationItems = computed(() =>
  pluginItems.value
    .filter((plugin) => plugin.manifest.metadata.utility !== true)
    .filter((plugin) =>
      matchesSearch(plugin.manifest.metadata.name, plugin.manifest.metadata.description),
    ),
)

const pluginIcon = (plugin: PluginSummary) =>
  resolvePluginIcon(plugin.manifest.metadata, { isDark: isDark.value, fallback: 'box' })

const pluginActionItems = (plugin: PluginSummary) => buildPickerActionItems({ plugin, search: '' })

const filteredSelectedPluginActions = computed(() => {
  if (!selectedPlugin.value) return []
  return pluginActionItems(selectedPlugin.value).filter((action) =>
    matchesMethodSearch(action.label, action.description, action.methodKey),
  )
})

const setTransparentDragImage = (event: DragEvent) => {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  event.dataTransfer?.setDragImage(canvas, 0, 0)
}

const eventPoint = (event: DragEvent) => {
  if (event.clientX !== 0 || event.clientY !== 0) {
    return { x: event.clientX, y: event.clientY }
  }
  return dragOriginPoint
}

const rememberDragOrigin = (event: PointerEvent) => {
  dragOriginPoint = { x: event.clientX, y: event.clientY }
}

const startDragPreview = (event: DragEvent, preview?: DragPreviewMeta) => {
  if (!preview) return
  const point = eventPoint(event)
  dragPreview.value = preview
  dragPreviewPoint.value = point
  dragPreviewVelocity.value = { x: 0, y: 0 }
  dragPreviewScale.value = 0.72
  lastDragPoint = { ...point, t: performance.now() }
  document.addEventListener('drag', handleDocumentDragMove, true)
  document.addEventListener('dragover', handleDocumentDragMove, true)
  document.addEventListener('drop', handleDragEnd, { once: true, capture: true })
  requestAnimationFrame(() => {
    dragPreviewScale.value = 1
  })
}

const handleDocumentDragMove = (event: DragEvent) => {
  if (!dragPreview.value) return
  const point = eventPoint(event)
  const now = performance.now()
  const dt = Math.max(now - lastDragPoint.t, 16)
  const dx = point.x - lastDragPoint.x
  const dy = point.y - lastDragPoint.y
  dragPreviewPoint.value = point
  dragPreviewVelocity.value = {
    x: Math.max(-26, Math.min(26, (dx / dt) * 18)),
    y: Math.max(-12, Math.min(12, (dy / dt) * 10)),
  }
  lastDragPoint = { ...point, t: now }
}

const removeDragPreviewListeners = () => {
  document.removeEventListener('drag', handleDocumentDragMove, true)
  document.removeEventListener('dragover', handleDocumentDragMove, true)
  document.removeEventListener('drop', handleDragEnd, true)
}

const handleDragEnd = () => {
  dragPreviewScale.value = 0.82
  removeDragPreviewListeners()
  window.setTimeout(() => {
    dragPreview.value = null
    dragPreviewVelocity.value = { x: 0, y: 0 }
  }, 120)
}

const dragPreviewStyle = computed(() => {
  const windPullX = -dragPreviewVelocity.value.x
  const lift = Math.min(
    18,
    Math.abs(dragPreviewVelocity.value.x) * 0.45 + Math.abs(dragPreviewVelocity.value.y) * 0.2,
  )
  const rotate = Math.max(-10, Math.min(10, -dragPreviewVelocity.value.x * 0.32))
  return {
    transform: `translate3d(${dragPreviewPoint.value.x - 72 + windPullX}px, ${dragPreviewPoint.value.y - 78 - lift}px, 0) rotate(${rotate}deg) scale(${dragPreviewScale.value})`,
  }
})

const handleDragStart = (event: DragEvent, payload: GlobalAddNodeDragPayload) => {
  event.dataTransfer?.setData('application/x-sailor-add-node', JSON.stringify(payload))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
  setTransparentDragImage(event)
  startDragPreview(event, payload.preview)
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
    preview: {
      icon: pluginIcon(plugin),
      label: plugin.manifest.metadata.name,
      subtitle: action.label,
    },
  })
}

const selectPlugin = (plugin: PluginSummary) => {
  const actions = pluginActionItems(plugin)
  if (actions.length === 1) {
    const action = actions[0]
    if (action) {
      props.onAddPluginNodeAtCenter?.(plugin.id, action.methodKey, action.label)
    }
    return
  }

  selectedPlugin.value = plugin
  methodSearch.value = ''
  void nextTick(() => methodSearchInput.value?.focus())
}

const closePluginMethodView = () => {
  selectedPlugin.value = null
  methodSearch.value = ''
  void nextTick(() => searchInput.value?.focus())
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

.global-add-node-panel__browse-view,
.global-add-node-panel__method-view {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.global-add-node-panel__toolbar,
.global-add-node-panel__method-header {
  flex: 0 0 auto;
  padding: var(--sailor-space-3);
  border-bottom: 1px solid var(--sailor-border);
}

.global-add-node-panel__method-header {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
}

.global-add-node-panel__method-header :deep(.base-input-wrapper) {
  flex: 1;
}

.global-add-node-panel__method-title {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-3);
  border-bottom: 1px solid var(--sailor-border);
  font-size: var(--sailor-text-sm);
  font-weight: 700;
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

.global-add-node-panel__sections,
.global-add-node-panel__method-list {
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

.global-add-node-panel__section-label {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--sailor-space-2);
}

.global-add-node-panel__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sailor-space-2);
  overflow: hidden;
  padding-bottom: var(--sailor-space-3);
}

.global-add-node-panel__item,
.global-add-node-panel__method-item {
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
.global-add-node-panel__method-item:hover {
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

.global-add-node-panel__item > span:nth-child(2) {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-add-node-panel__method-more {
  display: inline-flex;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--sailor-text-muted);
}

.global-add-node-panel__method-list {
  display: grid;
  align-content: start;
  gap: var(--sailor-space-1);
}

.global-add-node-panel__method-item {
  display: flex;
  min-height: 42px;
  flex-direction: row;
  align-items: center;
  padding: var(--sailor-space-1);
}

.global-add-node-panel__method-icon {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-muted);
}

.global-add-node-panel__method-body {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.global-add-node-panel__method-body span,
.global-add-node-panel__method-body small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-add-node-panel__method-item small {
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}

.global-add-node-section-enter-active,
.global-add-node-section-leave-active,
.global-add-node-view-enter-active,
.global-add-node-view-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease,
    max-height 0.2s ease;
}

.global-add-node-section-enter-active,
.global-add-node-section-leave-active {
  max-height: 520px;
}

.global-add-node-section-enter-from,
.global-add-node-section-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-4px);
}

.global-add-node-view-enter-from,
.global-add-node-view-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

@keyframes global-add-node-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<style>
.global-add-node-drag-preview {
  position: fixed;
  z-index: 10000;
  width: 144px;
  pointer-events: none;
  text-align: center;
  transform-origin: center 62px;
  transition:
    transform 0.12s cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 0.12s ease;
  will-change: transform;
}

.global-add-node-drag-preview__node {
  position: relative;
  display: flex;
  width: 104px;
  height: 104px;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--sailor-space-2);
  border: 2px solid var(--sailor-border);
  border-radius: 22px;
  background: var(--sailor-bg-elevated);
  box-shadow: var(--sailor-shadow-lg);
}

.global-add-node-drag-preview__node::before,
.global-add-node-drag-preview__node::after {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 28px;
  border-radius: 999px;
  background: var(--sailor-border);
  content: '';
  transform: translateY(-50%);
}

.global-add-node-drag-preview__node::before {
  left: -5px;
}

.global-add-node-drag-preview__node::after {
  right: -5px;
}

.global-add-node-drag-preview__icon {
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
}

.global-add-node-drag-preview__label {
  overflow: hidden;
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-add-node-drag-preview__subtitle {
  overflow: hidden;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
