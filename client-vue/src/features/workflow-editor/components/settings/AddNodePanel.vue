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
              <div class="add-node-item-icon-well" :style="{ backgroundColor: plugin.manifest.metadata.style?.bgColor || 'var(--sailor-bg-surface)', borderColor: plugin.manifest.metadata.style?.borderColor || 'var(--sailor-border)' }">
                <LucideIcon :name="plugin.manifest.metadata.style?.icon || plugin.manifest.metadata.icon || 'box'" :size="16" :color="plugin.manifest.metadata.style?.iconColor || 'var(--sailor-text-muted)'" />
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
                <LucideIcon
                  v-if="plugin.manifest.metadata.icon"
                  :name="plugin.manifest.metadata.icon"
                  :size="18"
                  class="add-node-plugin-img"
                />
                <LucideIcon v-else name="box" :size="16" />
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
    color: 'var(--sailor-node-codeblock-icon)',
    bgColor: 'var(--sailor-node-codeblock-bg)',
    borderColor: 'var(--sailor-node-codeblock-border)',
  },
  {
    type: 'if' as WorkflowNodeType,
    label: 'If / Else',
    description: 'Branch the flow based on a condition',
    icon: 'git-branch',
    color: 'var(--sailor-node-if-icon)',
    bgColor: 'var(--sailor-node-if-bg)',
    borderColor: 'var(--sailor-node-if-border)',
  },
  {
    type: 'loop' as WorkflowNodeType,
    label: 'Loop / ForEach',
    description: 'Iterate over a collection item by item',
    icon: 'repeat',
    color: 'var(--sailor-node-loop-icon)',
    bgColor: 'var(--sailor-node-loop-bg)',
    borderColor: 'var(--sailor-node-loop-border)',
  },
  {
    type: 'subworkflow' as WorkflowNodeType,
    label: 'Sub-Workflow',
    description: 'Call another workflow as a sub-step',
    icon: 'layers',
    color: 'var(--sailor-node-subworkflow-icon)',
    bgColor: 'var(--sailor-node-subworkflow-bg)',
    borderColor: 'var(--sailor-node-subworkflow-border)',
  },
  {
    type: 'http' as WorkflowNodeType,
    label: 'HTTP Request',
    description: 'Send an HTTP request to an external API',
    icon: 'globe',
    color: 'var(--sailor-node-http-icon)',
    bgColor: 'var(--sailor-node-http-bg)',
    borderColor: 'var(--sailor-node-http-border)',
  },
  {
    type: 'event' as WorkflowNodeType,
    label: 'Event Emitter',
    description: 'Publish an event to trigger other flows',
    icon: 'zap',
    color: 'var(--sailor-node-event-icon)',
    bgColor: 'var(--sailor-node-event-bg)',
    borderColor: 'var(--sailor-node-event-border)',
  },
  {
    type: 'event-listener' as WorkflowNodeType,
    label: 'Event Listener',
    description: 'Wait for an event to trigger a sub-flow',
    icon: 'target',
    color: 'var(--sailor-node-event-listener-icon)',
    bgColor: 'var(--sailor-node-event-listener-bg)',
    borderColor: 'var(--sailor-node-event-listener-border)',
  },
  {
    type: 'set' as WorkflowNodeType,
    label: 'Set Fields',
    description: 'Set or rename fields without JavaScript',
    icon: 'sliders-horizontal',
    color: 'var(--sailor-node-set-icon)',
    bgColor: 'var(--sailor-node-set-bg)',
    borderColor: 'var(--sailor-node-set-border)',
  },
  {
    type: 'switch' as WorkflowNodeType,
    label: 'Switch',
    description: 'Route to multiple paths based on a value',
    icon: 'git-branch-plus',
    color: 'var(--sailor-node-switch-icon)',
    bgColor: 'var(--sailor-node-switch-bg)',
    borderColor: 'var(--sailor-node-switch-border)',
  },
  {
    type: 'merge' as WorkflowNodeType,
    label: 'Merge',
    description: 'Merge parallel flows into a single path',
    icon: 'merge',
    color: 'var(--sailor-node-merge-icon)',
    bgColor: 'var(--sailor-node-merge-bg)',
    borderColor: 'var(--sailor-node-merge-border)',
  },
  {
    type: 'split-in-batches' as WorkflowNodeType,
    label: 'Split In Batches',
    description: 'Split an array into batches and process each one',
    icon: 'layers',
    color: 'var(--sailor-node-split-icon)',
    bgColor: 'var(--sailor-node-split-bg)',
    borderColor: 'var(--sailor-node-split-border)',
  },
  {
    type: 'respond-webhook' as WorkflowNodeType,
    label: 'Respond to Webhook',
    description: 'Respond to the HTTP caller with a custom status and body',
    icon: 'send',
    color: 'var(--sailor-node-respond-webhook-icon)',
    bgColor: 'var(--sailor-node-respond-webhook-bg)',
    borderColor: 'var(--sailor-node-respond-webhook-border)',
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
  padding: var(--sailor-space-2) var(--sailor-space-3);
  border-bottom: 1px solid var(--sailor-border);
  flex-shrink: 0;
}

.add-node-back-btn {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-1);
  background: transparent;
  border: none;
  border-radius: var(--sailor-radius-sm);
  padding: var(--sailor-space-1) var(--sailor-space-2);
  cursor: pointer;
  font-family: inherit;
  font-size: var(--sailor-text-sm);
  font-weight: 500;
  color: var(--sailor-text-muted);
  transition: all var(--sailor-duration-fast);
  margin-left: -4px;
}

.add-node-back-btn:hover {
  color: var(--sailor-text-primary);
  background-color: var(--sailor-bg-overlay);
}

/* ── Search ── */
.add-node-search-wrapper {
  padding: var(--sailor-space-3) var(--sailor-space-4);
  border-bottom: 1px solid var(--sailor-border);
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
  color: var(--sailor-text-muted);
  pointer-events: none;
}

.add-node-search-input {
  width: 100%;
  background-color: var(--sailor-bg-surface);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-md);
  padding: 6px 12px 6px 32px;
  font-size: var(--sailor-text-sm);
  font-family: inherit;
  color: var(--sailor-text-primary);
  outline: none;
  transition: border-color var(--sailor-duration-fast);
  box-sizing: border-box;
}

.add-node-search-input::placeholder {
  color: var(--sailor-text-muted);
}

.add-node-search-input:focus {
  border-color: var(--sailor-accent);
}

/* ── Content scroll area ── */
.add-node-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--sailor-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-4);
}

/* ── Section ── */
.add-node-section {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}

.add-node-section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--sailor-text-muted);
  padding: 0 var(--sailor-space-1);
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
  gap: var(--sailor-space-3);
  width: 100%;
  padding: var(--sailor-space-2) var(--sailor-space-2);
  background: transparent;
  border: none;
  border-radius: var(--sailor-radius-md);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: var(--sailor-text-primary);
}

.add-node-item:active {
  background-color: var(--sailor-bg-muted);
}

/* ── Icon Well ── */
.add-node-item-icon-well {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--sailor-radius-sm);
  border: 1px solid var(--sailor-border);
  flex-shrink: 0;
}

.add-node-item-icon-well--plugin {
  background-color: var(--sailor-bg-surface);
  color: var(--sailor-text-muted);
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
  font-size: var(--sailor-text-sm);
  font-weight: 500;
  color: var(--sailor-text-primary);
  line-height: 1.3;
}

.add-node-item-desc {
  font-size: var(--sailor-text-xs);
  color: var(--sailor-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
  margin-top: 1px;
}

.add-node-item-chevron {
  color: var(--sailor-text-muted);
  flex-shrink: 0;
  opacity: 0.5;
}

/* ── States ── */
.add-node-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-8) 0;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
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
  gap: var(--sailor-space-2);
  padding: var(--sailor-space-8) 0;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-sm);
}

.add-node-empty-icon {
  opacity: 0.2;
}
</style>
