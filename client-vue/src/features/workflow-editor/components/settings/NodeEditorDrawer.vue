<template>
  <div class="node-editor-drawer-shell">
    <!-- Header -->
    <div class="drawer-header">
      <div class="drawer-header-left">
        <span class="drawer-header-title">{{ headerLabel }}</span>
        <div class="drawer-id-group">
          <span class="drawer-id-label">ID:</span>
          <input
            v-model="localId"
            class="drawer-id-input"
            spellcheck="false"
            @blur="handleIdChange(localId)"
            @keydown.enter="handleIdChange(localId)"
          />
        </div>
      </div>
    </div>

    <!-- Tabs (for plugin nodes) -->
    <div v-if="isPluginNode" class="drawer-tabs">
      <button
        class="drawer-tab-btn"
        :class="{ 'drawer-tab-btn--active': activeTab === 'settings' }"
        @click="activeTab = 'settings'"
      >
        <LucideIcon name="settings" size="14" />
        Parameters
      </button>
      <button
        class="drawer-tab-btn"
        :class="{ 'drawer-tab-btn--active': activeTab === 'auth' }"
        @click="activeTab = 'auth'"
      >
        <LucideIcon name="shield-check" size="14" />
        Authorization
      </button>
    </div>

    <!-- Content Area -->
    <div class="drawer-body">
      <template v-if="activeTab === 'auth' && isPluginNode && pluginId">
        <PluginMenuAuth :plugin-id="pluginId" />
      </template>

      <component
        v-else-if="EditorComponent"
        :is="EditorComponent"
        :node="enrichedNode"
        :nodes="nodes"
        :edges="edges"
        :updateNodeData="updateNodeData"
        :injectVariable="injectVariable"
        :upstreamNodes="upstreamNodes"
      />

      <p v-else class="drawer-empty-text">
        Unknown node type: <code>{{ editorKey }}</code>
      </p>
    </div>

    <!-- Footer Actions -->
    <!-- AppPanel doesn't provide a footer slot currently, we just put it here -->
    <!-- Actually, changes are real-time, but users like a "save" mental model. -->
    <div class="drawer-footer">
      <button class="footer-btn footer-btn--ghost" @click="closePanel">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { type GraphNode } from '@vue-flow/core'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import { useAppPanelStore } from '@/shared/stores/app-panel.store'
import { useApi } from '@/shared/composables/useApi'
import { pluginsApi } from '@/core/api/plugins.api'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { NODE_EDITOR_REGISTRY } from './editors'
import PluginMenuAuth from './editors/PluginMenuAuth.vue'
import type { NodeData } from './editors/types'

const props = defineProps<{
  node: GraphNode<NodeData> | undefined
}>()

const workflowStore = useWorkflowStore()
const panelStore = useAppPanelStore()
const { data: plugins, execute: fetchPlugins } = useApi(pluginsApi.getAll, [])
fetchPlugins()

const activeTab = ref<'settings' | 'auth'>('settings')
const localId = ref('')

watch(
  () => props.node?.id,
  (newId) => {
    activeTab.value = 'settings'
    localId.value = newId || ''
  },
  { immediate: true },
)

// Build the node catalogue and edge list directly from the Pinia store.
//
// NodeEditorDrawer is rendered via GlobalAppPanel, which is a DOM sibling
// of Nod8WorkflowCanvas (not a descendant). Because Vue Flow's useVueFlow()
// relies on provide/inject, calling it here would find no ancestor <VueFlow>
// and return empty arrays for getNodes / getEdges — making upstreamNodes
// always empty and hiding the "Map Variables" panel entirely.
//
// Reading from workflowStore instead gives us:
//   • correct data regardless of component-tree position
//   • always-fresh values (same reactive source used by all editors)
//   • full trigger schema (including manual input fields)
const nodes = computed((): GraphNode<NodeData>[] => {
  const wf = workflowStore.activeWorkflow
  if (!wf) return []

  const result: GraphNode<NodeData>[] = [
    {
      id: 'trigger',
      type: 'trigger',
      data: wf.trigger as NodeData,
      position: { x: 0, y: 0 },
    } as GraphNode<NodeData>,
  ]

  for (const [id, nodeData] of Object.entries(wf.nodes)) {
    result.push({
      id,
      type: nodeData.type,
      data: nodeData as NodeData,
      position: { x: 0, y: 0 },
    } as GraphNode<NodeData>)
  }

  return result
})

const edges = computed(() => workflowStore.activeWorkflow?.edges ?? [])

const dataType = computed(() => props.node?.data?.['type'] as string | undefined)
const pluginId = computed(() => props.node?.data?.['pluginId'] as string | undefined)
const isPluginNode = computed(
  () =>
    props.node?.type === 'plugin' &&
    (!dataType.value || dataType.value === 'plugin') &&
    !!pluginId.value,
)

// Traverse the store edge graph to collect all topological ancestors of a
// node. The result is passed to editors as `upstreamNodes` and drives the
// "Map Variables" variable-picker panel inside PluginEditor.
const getUpstreamNodes = (
  currentId: string,
  visited = new Set<string>(),
): GraphNode<NodeData>[] => {
  if (visited.has(currentId)) return []
  visited.add(currentId)

  const storeEdges = workflowStore.activeWorkflow?.edges ?? []
  const directEdges = storeEdges.filter((e) => e.target === currentId)
  let upstream: GraphNode<NodeData>[] = []

  for (const edge of directEdges) {
    const parentNode = nodes.value.find((n) => n.id === edge.source)
    if (parentNode) {
      upstream.push(parentNode)
      upstream = upstream.concat(getUpstreamNodes(edge.source, visited))
    }
  }

  const byId = new Map<string, GraphNode<NodeData>>()
  for (const n of upstream) {
    if (!byId.has(n.id)) byId.set(n.id, n)
  }

  return Array.from(byId.values())
}

const upstreamNodes = computed(() => {
  if (!props.node) return []
  return getUpstreamNodes(props.node.id)
})

const editorKey = computed(() => {
  if (!props.node) return ''
  return props.node.type === 'trigger' ? 'trigger' : (dataType.value ?? 'plugin')
})

const EditorComponent = computed(() => {
  return NODE_EDITOR_REGISTRY[editorKey.value as keyof typeof NODE_EDITOR_REGISTRY] || null
})

/**
 * Node object whose `.data` is sourced directly from the Pinia store.
 *
 * VueFlow initialises each node's `data` field once from `vueFlowNodes` and
 * does NOT reactively reflect subsequent store mutations. Every editor reads
 * `props.node.data`, so without this computed they would always see stale
 * data — causing the trigger type select to show nothing (its `data.type`
 * was the VueFlow node-type string "trigger", not "manual"/"webhook"/…) and
 * making "Add Expected Input" appear broken (schema reads from the old
 * snapshot instead of the updated store object).
 */
const enrichedNode = computed(() => {
  if (!props.node) return undefined

  const id = props.node.id
  const storeData: NodeData | undefined =
    id === 'trigger'
      ? (workflowStore.activeWorkflow?.trigger as NodeData | undefined)
      : (workflowStore.activeWorkflow?.nodes[id] as NodeData | undefined)

  return {
    ...props.node,
    data: storeData ?? props.node.data,
  }
})

const headerLabel = computed(() => {
  if (!props.node) return ''
  if (props.node.type === 'trigger') return 'Trigger Configuration'
  switch (dataType.value) {
    case 'code':
      return 'Code Block'
    case 'if':
      return 'Conditional Branch'
    case 'loop':
      return 'Loop / ForEach'
    case 'subworkflow':
      return 'Sub-Workflow'
    default: {
      const pName = plugins.value?.find((p) => p.id === pluginId.value)?.manifest.metadata.name
      return pName || 'Action Settings'
    }
  }
})

// Passed to components
const updateNodeData = (newData: Record<string, unknown>) => {
  if (!props.node) return
  workflowStore.updateNodeData(props.node.id, newData)
}

const injectVariable = (paramKey: string, variable: string) => {
  if (!props.node) return
  const currentParams = (enrichedNode.value?.data?.['params'] as Record<string, unknown>) || {}
  const currentValue = (currentParams[paramKey] as string) || ''
  updateNodeData({
    params: {
      ...currentParams,
      [paramKey]: `${currentValue}{{ ${variable} }}`,
    },
  })
}

const handleIdChange = (newId: string) => {
  if (!newId || newId === props.node?.id || !props.node) return

  if (nodes.value.some((n) => n.id === newId)) {
    alert('ID Conflict: A node with this ID already exists.')
    localId.value = props.node.id
    return
  }

  // Changing ID in a graph is tricky; for now we just change it in the store
  // To rename an ID completely is typically destructive if links exist.
  // We recommend using workflowStore actions to handle ID replacement.
  alert('ID renaming is currently read-only in this beta.')
  localId.value = props.node.id
}

const closePanel = () => {
  panelStore.closePanel()
}
</script>

<style scoped>
.node-editor-drawer-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--nod8-space-3) var(--nod8-space-4);
  background-color: var(--nod8-bg-surface);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.drawer-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer-header-title {
  font-size: var(--nod8-text-sm);
  font-weight: 600;
  color: var(--nod8-text-primary);
}

.drawer-id-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.drawer-id-label {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
}

.drawer-id-input {
  background: transparent;
  border: none;
  outline: none;
  font-size: var(--nod8-text-xs);
  font-family: var(--nod8-font-mono);
  color: var(--nod8-text-secondary);
  width: 120px;
}

.drawer-tabs {
  display: flex;
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.drawer-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 500;
  color: var(--nod8-text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--nod8-duration-fast);
}

.drawer-tab-btn:hover {
  color: var(--nod8-text-primary);
}

.drawer-tab-btn--active {
  color: var(--nod8-text-primary);
  border-bottom-color: var(--nod8-accent);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--nod8-space-4);
  display: flex;
  flex-direction: column;
  background-color: var(--nod8-bg-canvas);
}

.drawer-empty-text {
  font-size: var(--nod8-text-sm);
  color: var(--nod8-text-muted);
  text-align: center;
  margin-top: 40px;
}

.drawer-footer {
  padding: var(--nod8-space-3) var(--nod8-space-4);
  border-top: 1px solid var(--nod8-border);
  background-color: var(--nod8-bg-surface);
  display: flex;
  justify-content: flex-end;
  gap: var(--nod8-space-2);
  flex-shrink: 0;
}

.footer-btn {
  padding: 6px 12px;
  border-radius: var(--nod8-radius-sm);
  font-size: var(--nod8-text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--nod8-duration-fast);
  border: 1px solid transparent;
}

.footer-btn--ghost {
  background: transparent;
  color: var(--nod8-text-primary);
}

.footer-btn--ghost:hover {
  background-color: var(--nod8-bg-muted);
}
</style>
