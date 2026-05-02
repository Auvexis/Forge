<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { type GraphNode } from '@vue-flow/core'
import { useNodeInspectorStore } from '../../stores/node-inspector.store'
import { useWorkflowStore } from '../../stores/workflow.store'
import type { NodeData } from './editors/types'

import TriggerEditor from './editors/TriggerEditor.vue'
import HttpEditor from './editors/HttpEditor.vue'
import CodeEditor from './editors/CodeEditor.vue'
import LoopEditor from './editors/LoopEditor.vue'
import SubWorkflowEditor from './editors/SubWorkflowEditor.vue'
import EventEditor from './editors/EventEditor.vue'
import EventListenerEditor from './editors/EventListenerEditor.vue'
import PluginEditor from './editors/PluginEditor.vue'
import IfEditor from './editors/IfEditor.vue'
import JsonTreeView from './shared/JsonTreeView.vue'
import VariableTree from './editors/VariableTree.vue'
import PluginMenuAuth from './editors/PluginMenuAuth.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import { workflowsApi } from '@/core/api/workflows.api'

const inspectorStore = useNodeInspectorStore()
const workflowStore = useWorkflowStore()

const editorMap: Record<string, any> = {
  trigger: TriggerEditor,
  http: HttpEditor,
  code: CodeEditor,
  loop: LoopEditor,
  subworkflow: SubWorkflowEditor,
  event: EventEditor,
  'event-listener': EventListenerEditor,
  plugin: PluginEditor,
  if: IfEditor,
}

const activeEditor = computed(() => {
  const node = inspectorStore.activeNode
  if (!node || !node.type) return null
  return editorMap[node.type] || null
})

function close() {
  inspectorStore.closeInspector()
}

async function runStep() {
  if (!inspectorStore.activeNodeId || !workflowStore.activeWorkflow) return
  inspectorStore.isTesting = true
  inspectorStore.lastTestOutput = null

  try {
    const res = await workflowsApi.executeNode(
      workflowStore.activeWorkflow.metadata.id,
      inspectorStore.activeNodeId,
      inspectorStore.activeNode!.data,
    )
    inspectorStore.lastTestOutput = { success: true, data: res }
  } catch (err: any) {
    inspectorStore.lastTestOutput = { success: false, error: err.message || 'Execution failed' }
  } finally {
    inspectorStore.isTesting = false
  }
}

const nodes = computed((): GraphNode<NodeData>[] => {
  const wf = workflowStore.activeWorkflow
  if (!wf) return []

  const result: GraphNode<NodeData>[] = [
    {
      id: 'trigger',
      type: 'trigger',
      data: wf.trigger as unknown as NodeData,
      position: { x: 0, y: 0 },
    } as GraphNode<NodeData>,
  ]

  for (const [id, nodeData] of Object.entries(wf.nodes)) {
    result.push({
      id,
      type: nodeData.type,
      data: nodeData as unknown as NodeData,
      position: { x: 0, y: 0 },
    } as GraphNode<NodeData>)
  }

  return result
})

const edges = computed(() => workflowStore.activeWorkflow?.edges ?? [])

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
  if (!inspectorStore.activeNode) return []
  return getUpstreamNodes(inspectorStore.activeNode.id)
})

const enrichedNode = computed(() => {
  if (!inspectorStore.activeNode) return undefined

  const id = inspectorStore.activeNode.id
  const storeData: NodeData | undefined =
    id === 'trigger'
      ? (workflowStore.activeWorkflow?.trigger as unknown as NodeData)
      : (workflowStore.activeWorkflow?.nodes[id] as unknown as NodeData)

  return {
    ...inspectorStore.activeNode,
    data: storeData ?? inspectorStore.activeNode.data,
  }
})

const updateNodeData = (newData: Record<string, unknown>) => {
  if (!inspectorStore.activeNode) return
  workflowStore.updateNodeData(inspectorStore.activeNode.id, newData)
}

const injectVariable = (paramKey: string, variable: string) => {
  if (!inspectorStore.activeNode) return
  const currentParams = (enrichedNode.value?.data?.['params'] as Record<string, unknown>) || {}
  const currentValue = (currentParams[paramKey] as string) || ''
  updateNodeData({
    params: {
      ...currentParams,
      [paramKey]: `${currentValue}{{ ${variable} }}`,
    },
  })
}

const isPluginNode = computed(() => inspectorStore.activeNode?.type === 'plugin')
const activeTab = ref<'config' | 'settings'>('config')
const localId = ref('')

watch(
  () => inspectorStore.activeNodeId,
  (newId) => {
    activeTab.value = 'config'
    localId.value = newId || ''
  },
  { immediate: true },
)

const handleIdChange = (newId: string) => {
  if (!newId || newId === inspectorStore.activeNode?.id || !inspectorStore.activeNode) return

  if (nodes.value.some((n) => n.id === newId)) {
    alert('ID Conflict: A node with this ID already exists.')
    localId.value = inspectorStore.activeNode.id
    return
  }

  const success = workflowStore.renameNode(inspectorStore.activeNode.id, newId)
  if (success) {
    inspectorStore.activeNodeId = newId
    inspectorStore.activeNode.id = newId
  } else {
    localId.value = inspectorStore.activeNode.id
  }
}

const copyToClipboard = async (path: string) => {
  try {
    await navigator.clipboard.writeText(`{{ ${path} }}`)
    // Optional: Add a small toast notification here if you have a toast system
  } catch (err) {
    console.error('Failed to copy to clipboard', err)
  }
}
</script>

<template>
  <div
    v-if="inspectorStore.isOpen"
    class="inspector-backdrop absolute inset-0 z-50 flex items-center justify-center"
    @click.self="close"
  >
    <div class="inspector-modal flex flex-col overflow-hidden">
      <!-- 3-Column Grid -->
      <div class="inspector-grid flex-1 min-h-0">
        <!-- Left Pane: Input -->
        <div class="inspector-pane">
          <div
            class="inspector-pane-header text-sm text-muted font-semibold flex items-center gap-2"
          >
            <LucideIcon name="download" size="16" />
            INPUT (Past)
          </div>
          <div class="inspector-pane-content overflow-y-auto flex flex-col h-full">
            <div v-if="upstreamNodes.length > 0" class="p-4 flex-1">
              <VariableTree
                param-key="inspector"
                :upstream-nodes="upstreamNodes"
                :nodes="nodes"
                @inject="(key, path) => copyToClipboard(path)"
              />
            </div>
            <div
              v-else
              class="empty-state flex-1 flex flex-col items-center justify-center text-center min-h-[200px]"
            >
              <div class="icon-box mb-3 opacity-70">
                <LucideIcon name="database" size="24" />
              </div>
              <p class="text-sm text-muted">No input data available yet.</p>
            </div>
          </div>
        </div>

        <!-- Center Pane: Config -->
        <div class="inspector-pane" style="background: var(--nod8-bg-surface)">
          <div
            class="inspector-pane-header flex-between w-full"
            style="background: var(--nod8-bg-surface)"
          >
            <div class="text-sm text-muted font-semibold flex items-center gap-2">
              <LucideIcon name="settings" size="16" />
              {{ activeTab === 'settings' ? 'SETTINGS' : 'CONFIGURATION' }}
            </div>

            <BaseButton
              variant="ghost"
              size="sm"
              :icon-left="activeTab === 'config' ? 'settings' : 'x'"
              class="text-muted !p-1 !h-auto"
              title="Settings"
              @click="activeTab = activeTab === 'config' ? 'settings' : 'config'"
            />
          </div>
          <div class="inspector-pane-content relative overflow-y-auto">
            <template v-if="activeTab === 'config'">
              <component
                :is="activeEditor"
                v-if="activeEditor && enrichedNode"
                :node="enrichedNode"
                :nodes="nodes"
                :edges="edges"
                :upstream-nodes="upstreamNodes"
                :update-node-data="updateNodeData"
                @inject="injectVariable"
              />
            </template>
            <template v-else-if="activeTab === 'settings'">
              <div class="p-2 flex flex-col gap-6">
                <!-- Node ID Configuration -->
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-semibold text-primary">Node Identifier (ID)</label>
                  <p class="text-xs text-muted leading-tight mb-2">
                    Used to reference this node's output in other variables.<br />Example:
                    <code>&#123;&#123; {{ localId }}.data.email &#125;&#125;</code>
                  </p>
                  <BaseInput
                    v-model="localId"
                    class="font-mono w-full"
                    spellcheck="false"
                    @blur="handleIdChange(localId)"
                    @keydown.enter="handleIdChange(localId)"
                  />
                </div>

                <!-- Authorization Configuration (Plugin Only) -->
                <div
                  v-if="isPluginNode"
                  class="flex flex-col gap-2 pt-4 border-t border-nod8-border"
                >
                  <label class="text-sm font-semibold text-primary mb-1"
                    >Integration Authorization</label
                  >
                  <PluginMenuAuth
                    v-if="inspectorStore.activeNode?.data?.pluginId"
                    :plugin-id="inspectorStore.activeNode.data.pluginId as string"
                  />
                  <div
                    v-else
                    class="text-sm text-muted p-4 flex flex-col items-center justify-center h-full text-center bg-[var(--nod8-bg-elevated)] rounded"
                  >
                    <LucideIcon name="shield-alert" size="24" class="mb-2 opacity-50" />
                    Select an integration first<br />to configure authorization.
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Right Pane: Output -->
        <div class="inspector-pane">
          <div class="inspector-pane-header flex-between text-sm text-muted font-semibold">
            <div class="flex items-center gap-2">
              <LucideIcon name="upload" size="16" />
              OUTPUT (Future)
            </div>
            <BaseButton
              variant="ghost"
              size="sm"
              icon-left="play"
              :loading="inspectorStore.isTesting"
              @click="runStep"
            >
              Run Step
            </BaseButton>
          </div>
          <div class="inspector-pane-content overflow-y-auto flex flex-col h-full">
            <div
              v-if="inspectorStore.isTesting"
              class="empty-state flex-1 flex flex-col items-center justify-center text-center min-h-[200px]"
            >
              <LucideIcon name="loader-2" size="24" class="spin text-nod8-accent mb-3" />
              <p class="text-sm text-primary font-medium">Executing step...</p>
            </div>

            <div v-else-if="inspectorStore.lastTestOutput" class="h-full flex-1">
              <div
                v-if="!inspectorStore.lastTestOutput.success"
                class="p-3 mb-3 rounded-md text-sm"
                style="
                  background: rgba(239, 68, 68, 0.1);
                  border: 1px solid rgba(239, 68, 68, 0.2);
                  color: rgb(239, 68, 68);
                "
              >
                <div class="font-bold mb-1">Execution Error</div>
                <div class="font-mono whitespace-pre-wrap">
                  {{ inspectorStore.lastTestOutput.error }}
                </div>
              </div>
              <div v-else class="h-full">
                <JsonTreeView :data="inspectorStore.lastTestOutput.data" :is-root="true" />
              </div>
            </div>

            <div
              v-else
              class="empty-state flex-1 flex flex-col items-center justify-center text-center min-h-[200px]"
            >
              <div class="icon-box mb-3 opacity-70">
                <LucideIcon name="play" size="24" />
              </div>
              <p class="text-sm text-muted">Run the step to generate output.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Inherits classes from inspector.css */

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
