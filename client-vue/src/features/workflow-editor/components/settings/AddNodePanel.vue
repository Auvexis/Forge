<template>
  <div class="add-node-panel" style="padding: 0 !important">
    <!-- Back header (shown when inside a plugin's actions) -->
    <div v-if="view === 'actions' && selectedPlugin" class="add-node-back-header">
      <button class="add-node-back-btn" @click="goBack">
        <LucideIcon name="chevron-left" :size="16" />
        <span>{{ selectedPlugin.manifest.metadata.name }}</span>
      </button>
    </div>

    <!-- Search -->
    <div class="add-node-search-wrapper">
      <BaseInput
        ref="searchInput"
        v-model="search"
        icon-left="search"
        :placeholder="searchPlaceholder"
        autofocus
      />
    </div>

    <!-- Content -->
    <div class="add-node-content">
      <!-- Loading -->
      <div v-if="pluginsLoading" class="add-node-loading">
        <LucideIcon name="loader-2" :size="20" class="add-node-spinner" />
        <span>Loading plugins...</span>
      </div>

      <!-- View: Categories (default) -->
      <template v-else-if="view === 'categories'">
        <!-- Logic and utilities -->
        <div class="add-node-section">
          <p class="add-node-section-label">Logic and Utilities</p>
          <BaseWoobyMenu tag="div" class="add-node-list">
            <!-- Core flow nodes -->
            <button
              v-for="def in filteredLogicNodes"
              :key="def.type"
              class="add-node-item"
              style="position: relative; z-index: 1"
              @click="onAddLogicNode?.(def.type)"
            >
              <div class="add-node-item-icon-well" :style="{ backgroundColor: def.bgColor, borderColor: def.borderColor || 'transparent' }">
                <LucideIcon :name="def.icon" :size="16" :color="def.color" />
              </div>
              <div class="add-node-item-info">
                <span class="add-node-item-label">{{ def.label }}</span>
                <span class="add-node-item-desc">{{ def.description }}</span>
              </div>
            </button>

            <!-- Utility plugins -->
            <button
              v-for="plugin in filteredUtilityPlugins"
              :key="plugin.id"
              class="add-node-item"
              style="position: relative; z-index: 1"
              @click="selectPlugin(plugin.id)"
            >
              <div class="add-node-item-icon-well" :style="{ backgroundColor: plugin.manifest.metadata.style?.bgColor || 'var(--nod8-bg-surface)', borderColor: plugin.manifest.metadata.style?.borderColor || 'var(--nod8-border)' }">
                <LucideIcon :name="plugin.manifest.metadata.style?.icon || plugin.manifest.metadata.icon || 'box'" :size="16" :color="plugin.manifest.metadata.style?.iconColor || 'var(--nod8-text-muted)'" />
              </div>
              <div class="add-node-item-info">
                <span class="add-node-item-label">{{ plugin.manifest.metadata.name }}</span>
                <span class="add-node-item-desc">{{ plugin.manifest.metadata.description }}</span>
              </div>
              <LucideIcon name="chevron-right" :size="14" class="add-node-item-chevron" />
            </button>
          </BaseWoobyMenu>
        </div>

        <!-- Integrations / Plugins -->
        <div class="add-node-section">
          <p class="add-node-section-label">Integrations</p>
          <div v-if="filteredIntegrationPlugins.length === 0" class="add-node-empty">
            <LucideIcon name="blocks" :size="32" class="add-node-empty-icon" />
            <p>No integrations found.</p>
          </div>
          <BaseWoobyMenu v-else tag="div" class="add-node-list">
            <button
              v-for="plugin in filteredIntegrationPlugins"
              :key="plugin.id"
              class="add-node-item"
              style="position: relative; z-index: 1"
              @click="selectPlugin(plugin.id)"
            >
              <div class="add-node-item-icon-well add-node-item-icon-well--plugin">
                <img
                  v-if="isUrl(plugin.manifest.metadata.icon)"
                  :src="plugin.manifest.metadata.icon"
                  class="add-node-plugin-img"
                  alt=""
                />
                <LucideIcon v-else :name="plugin.manifest.metadata.icon || 'box'" :size="16" />
              </div>
              <div class="add-node-item-info">
                <span class="add-node-item-label">{{ plugin.manifest.metadata.name }}</span>
                <span class="add-node-item-desc">{{ plugin.manifest.metadata.description }}</span>
              </div>
              <LucideIcon name="chevron-right" :size="14" class="add-node-item-chevron" />
            </button>
          </BaseWoobyMenu>
        </div>
      </template>

      <!-- View: Actions (plugin selected) -->
      <template v-else-if="view === 'actions' && selectedPlugin">
        <BaseWoobyMenu tag="div" class="add-node-list">
          <button
            v-for="[methodKey, methodVal] in filteredMethods"
            :key="methodKey"
            class="add-node-item"
            style="position: relative; z-index: 1"
            @click="
              onAddPluginNode?.(selectedPluginId!, methodKey, methodVal.metadata.label || methodKey)
            "
          >
            <div class="add-node-item-icon-well add-node-item-icon-well--plugin">
              <LucideIcon name="workflow" :size="16" />
            </div>
            <div class="add-node-item-info">
              <span class="add-node-item-label">{{ methodVal.metadata.label || methodKey }}</span>
              <span class="add-node-item-desc">{{ methodVal.metadata.description }}</span>
            </div>
          </button>
          <div v-if="filteredMethods.length === 0" class="add-node-empty" style="position: relative; z-index: 1">
            <p>No actions found.</p>
          </div>
        </BaseWoobyMenu>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '@/shared/composables/useApi'
import { pluginsApi } from '@/core/api/plugins.api'
import type { WorkflowNodeType } from '@/core/types/workflow.types'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseWoobyMenu from '@/shared/components/base/BaseWoobyMenu.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'

defineProps<{
  onAddLogicNode?: (type: WorkflowNodeType) => void
  onAddPluginNode?: (pluginId: string, action: string, actionName: string) => void
}>()

// ── State ────────────────────────────────────────────────────────────────────

type ViewMode = 'categories' | 'actions'
const view = ref<ViewMode>('categories')
const selectedPluginId = ref<string | null>(null)
const search = ref('')
const searchInput = ref<InstanceType<typeof BaseInput>>()

// ── Data ─────────────────────────────────────────────────────────────────────

const { data: plugins, loading: pluginsLoading, execute: loadPlugins } = useApi(pluginsApi.getAll)

onMounted(() => {
  loadPlugins()
  searchInput.value?.focus()
})

const selectedPlugin = computed(
  () => plugins.value?.find((p) => p.id === selectedPluginId.value) ?? null,
)

// ── Logic Nodes Definitions ───────────────────────────────────────────────────

const LOGIC_NODES = [
  {
    type: 'trigger' as WorkflowNodeType,
    label: 'Trigger',
    description: 'Add another workflow entry point',
    icon: 'zap',
    color: 'rgb(245, 158, 11)',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  {
    type: 'code' as WorkflowNodeType,
    label: 'Code Block',
    description: 'Run custom JavaScript in a sandbox',
    icon: 'code-2',
    color: 'var(--nod8-node-codeblock-icon)',
    bgColor: 'var(--nod8-node-codeblock-bg)',
    borderColor: 'var(--nod8-node-codeblock-border)',
  },
  {
    type: 'if' as WorkflowNodeType,
    label: 'If / Else',
    description: 'Branch the flow based on a condition',
    icon: 'git-branch',
    color: 'var(--nod8-node-if-icon)',
    bgColor: 'var(--nod8-node-if-bg)',
    borderColor: 'var(--nod8-node-if-border)',
  },
  {
    type: 'loop' as WorkflowNodeType,
    label: 'Loop / ForEach',
    description: 'Iterate over a collection item by item',
    icon: 'repeat',
    color: 'var(--nod8-node-loop-icon)',
    bgColor: 'var(--nod8-node-loop-bg)',
    borderColor: 'var(--nod8-node-loop-border)',
  },
  {
    type: 'subworkflow' as WorkflowNodeType,
    label: 'Sub-Workflow',
    description: 'Call another workflow as a sub-step',
    icon: 'layers',
    color: 'var(--nod8-node-subworkflow-icon)',
    bgColor: 'var(--nod8-node-subworkflow-bg)',
    borderColor: 'var(--nod8-node-subworkflow-border)',
  },
  {
    type: 'http' as WorkflowNodeType,
    label: 'HTTP Request',
    description: 'Send an HTTP request to an external API',
    icon: 'globe',
    color: 'var(--nod8-node-http-icon)',
    bgColor: 'var(--nod8-node-http-bg)',
    borderColor: 'var(--nod8-node-http-border)',
  },
  {
    type: 'event' as WorkflowNodeType,
    label: 'Event Emitter',
    description: 'Publish an event to trigger other flows',
    icon: 'zap',
    color: 'var(--nod8-node-event-icon)',
    bgColor: 'var(--nod8-node-event-bg)',
    borderColor: 'var(--nod8-node-event-border)',
  },
  {
    type: 'event-listener' as WorkflowNodeType,
    label: 'Event Listener',
    description: 'Wait for an event to trigger a sub-flow',
    icon: 'target',
    color: 'var(--nod8-node-event-listener-icon)',
    bgColor: 'var(--nod8-node-event-listener-bg)',
    borderColor: 'var(--nod8-node-event-listener-border)',
  },
  {
    type: 'set' as WorkflowNodeType,
    label: 'Set Fields',
    description: 'Set or rename fields without JavaScript',
    icon: 'sliders-horizontal',
    color: 'var(--nod8-node-set-icon)',
    bgColor: 'var(--nod8-node-set-bg)',
    borderColor: 'var(--nod8-node-set-border)',
  },
  {
    type: 'switch' as WorkflowNodeType,
    label: 'Switch',
    description: 'Route to multiple paths based on a value',
    icon: 'git-branch-plus',
    color: 'var(--nod8-node-switch-icon)',
    bgColor: 'var(--nod8-node-switch-bg)',
    borderColor: 'var(--nod8-node-switch-border)',
  },
  {
    type: 'merge' as WorkflowNodeType,
    label: 'Merge',
    description: 'Merge parallel flows into a single path',
    icon: 'merge',
    color: 'var(--nod8-node-merge-icon)',
    bgColor: 'var(--nod8-node-merge-bg)',
    borderColor: 'var(--nod8-node-merge-border)',
  },
  {
    type: 'split-in-batches' as WorkflowNodeType,
    label: 'Split In Batches',
    description: 'Split an array into batches and process each one',
    icon: 'layers',
    color: 'var(--nod8-node-split-icon)',
    bgColor: 'var(--nod8-node-split-bg)',
    borderColor: 'var(--nod8-node-split-border)',
  },
  {
    type: 'respond-webhook' as WorkflowNodeType,
    label: 'Respond to Webhook',
    description: 'Respond to the HTTP caller with a custom status and body',
    icon: 'send',
    color: 'var(--nod8-node-respond-webhook-icon)',
    bgColor: 'var(--nod8-node-respond-webhook-bg)',
    borderColor: 'var(--nod8-node-respond-webhook-border)',
  },
  {
    type: 'wait-form' as WorkflowNodeType,
    label: 'Wait for Form',
    description: 'Create a temporary form and continue after submission',
    icon: 'clipboard-list',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
]

// ── Computed ─────────────────────────────────────────────────────────────────

const searchPlaceholder = computed(() => {
  if (view.value === 'actions') return 'Search actions...'
  return 'Search components...'
})

const filteredLogicNodes = computed(() =>
  LOGIC_NODES.filter((n) => n.label.toLowerCase().includes(search.value.toLowerCase())),
)

const filteredPlugins = computed(() =>
  (plugins.value ?? []).filter((p) =>
    p.manifest.metadata.name.toLowerCase().includes(search.value.toLowerCase()),
  ),
)

const filteredUtilityPlugins = computed(() =>
  filteredPlugins.value.filter((p) => p.manifest.metadata.utility === true)
)

const filteredIntegrationPlugins = computed(() =>
  filteredPlugins.value.filter((p) => p.manifest.metadata.utility !== true)
)

const filteredMethods = computed(() => {
  if (!selectedPlugin.value) return []
  return Object.entries(selectedPlugin.value.manifest.methods).filter(([key, val]) =>
    (val.metadata.label || key).toLowerCase().includes(search.value.toLowerCase()),
  )
})

// ── Actions ───────────────────────────────────────────────────────────────────

const selectPlugin = (id: string) => {
  selectedPluginId.value = id
  view.value = 'actions'
  search.value = ''
}

const goBack = () => {
  view.value = 'categories'
  selectedPluginId.value = null
  search.value = ''
}

// Used by parent (AppPanel header back button is not available) — exposed via provide/inject pattern
// Instead we emit nothing: the back button sits on the panel header via slot

// Simple URL detect for plugin icons
const isUrl = (str: string) => str?.startsWith('http') || str?.startsWith('/')
</script>

<style scoped>
.add-node-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Back header ── */
.add-node-back-header {
  padding: var(--nod8-space-2) var(--nod8-space-3);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.add-node-back-btn {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-1);
  background: transparent;
  border: none;
  border-radius: var(--nod8-radius-sm);
  padding: var(--nod8-space-1) var(--nod8-space-2);
  cursor: pointer;
  font-family: inherit;
  font-size: var(--nod8-text-sm);
  font-weight: 500;
  color: var(--nod8-text-muted);
  transition: all var(--nod8-duration-fast);
  margin-left: -4px;
}

.add-node-back-btn:hover {
  color: var(--nod8-text-primary);
  background-color: var(--nod8-bg-overlay);
}

/* ── Search ── */
.add-node-search-wrapper {
  padding: var(--nod8-space-3) var(--nod8-space-4);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.add-node-search-inner {
  position: relative;
}

.add-node-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--nod8-text-muted);
  pointer-events: none;
}

.add-node-search-input {
  width: 100%;
  background-color: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-md);
  padding: 6px 12px 6px 32px;
  font-size: var(--nod8-text-sm);
  font-family: inherit;
  color: var(--nod8-text-primary);
  outline: none;
  transition: border-color var(--nod8-duration-fast);
  box-sizing: border-box;
}

.add-node-search-input::placeholder {
  color: var(--nod8-text-muted);
}

.add-node-search-input:focus {
  border-color: var(--nod8-accent);
}

/* ── Content scroll area ── */
.add-node-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--nod8-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-4);
}

/* ── Section ── */
.add-node-section {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
}

.add-node-section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--nod8-text-muted);
  padding: 0 var(--nod8-space-1);
}

/* ── List ── */
.add-node-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* ── Item ── */
.add-node-item {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-3);
  width: 100%;
  padding: var(--nod8-space-2) var(--nod8-space-2);
  background: transparent;
  border: none;
  border-radius: var(--nod8-radius-md);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: var(--nod8-text-primary);
}

.add-node-item:active {
  background-color: var(--nod8-bg-muted);
}

/* ── Icon Well ── */
.add-node-item-icon-well {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.add-node-item-icon-well--plugin {
  background-color: var(--nod8-bg-surface);
  color: var(--nod8-text-muted);
}

.add-node-plugin-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  border-radius: 2px;
}

/* ── Item Info ── */
.add-node-item-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.add-node-item-label {
  font-size: var(--nod8-text-sm);
  font-weight: 500;
  color: var(--nod8-text-primary);
  line-height: 1.3;
}

.add-node-item-desc {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
  margin-top: 1px;
}

.add-node-item-chevron {
  color: var(--nod8-text-muted);
  flex-shrink: 0;
  opacity: 0.5;
}

/* ── States ── */
.add-node-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-8) 0;
  color: var(--nod8-text-muted);
  font-size: var(--nod8-text-xs);
}

.add-node-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.add-node-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-8) 0;
  color: var(--nod8-text-muted);
  font-size: var(--nod8-text-sm);
}

.add-node-empty-icon {
  opacity: 0.2;
}
</style>
