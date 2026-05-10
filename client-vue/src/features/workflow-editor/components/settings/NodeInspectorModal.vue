<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { type GraphNode } from '@vue-flow/core'
import { useNodeInspectorStore } from '../../stores/node-inspector.store'
import { useWorkflowStore } from '../../stores/workflow.store'
import { useExecutionStore } from '../../stores/execution.store'
import type { NodeData } from './editors/types'
import type { WorkflowNodeType } from '@/core/types/workflow.types'

import { NODE_EDITOR_REGISTRY } from './editors'
import JsonTreeView from './shared/JsonTreeView.vue'
import VariableTree from './editors/VariableTree.vue'
import PluginMenuAuth from './editors/PluginMenuAuth.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import { workflowsApi } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'

const inspectorStore = useNodeInspectorStore()
const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()
const toast = useToast()

const executionState = computed(() => {
  if (!inspectorStore.activeNodeId) return null
  return executionStore.nodeStatuses[inspectorStore.activeNodeId]
})

/**
 * The last webhook payload captured via "Listen for Event".
 * Reactive: updates immediately when the TriggerEditor's SSE captures a payload
 * (because it writes directly to workflowStore.activeWorkflow.trigger.lastTriggerPayload).
 */
const lastTriggerPayload = computed(() =>
  workflowStore.activeWorkflow?.trigger.lastTriggerPayload ?? null
)

const displayOutput = computed(() => {
  if (inspectorStore.lastTestOutput) {
    return inspectorStore.lastTestOutput
  }
  if (executionState.value) {
    if (executionState.value.status === 'success') {
      return { success: true, data: executionState.value.output }
    }
    if (executionState.value.status === 'failed') {
      return { success: false, error: executionState.value.error }
    }
  }
  return null
})

const isExecutingNode = computed(() => {
  return inspectorStore.isTesting || executionState.value?.status === 'running'
})

const activeEditor = computed(() => {
  const node = inspectorStore.activeNode
  if (!node || !node.type) return null
  return NODE_EDITOR_REGISTRY[node.type as WorkflowNodeType | 'trigger'] ?? null
})

function close() {
  inspectorStore.closeInspector()
}

async function runStep() {
  if (!inspectorStore.activeNodeId || !workflowStore.activeWorkflow) return
  const nodeId = inspectorStore.activeNodeId
  const startedAt = Date.now()
  inspectorStore.isTesting = true
  inspectorStore.lastTestOutput = null
  executionStore.patchNodeStatus(nodeId, { status: 'running', startedAt, endedAt: undefined })

  try {
    const res = await workflowsApi.executeNode(
      workflowStore.activeWorkflow.metadata.id,
      nodeId,
      inspectorStore.activeNode!.data,
    )
    inspectorStore.lastTestOutput = { success: true, data: res }
    executionStore.patchNodeStatus(nodeId, {
      status: 'success',
      output: res,
      error: undefined,
      startedAt,
      endedAt: Date.now(),
    })
    toast.success('Step executed successfully')
  } catch (err: any) {
    const message = err.message || 'Execution failed'
    inspectorStore.lastTestOutput = { success: false, error: message }
    executionStore.patchNodeStatus(nodeId, {
      status: 'failed',
      error: message,
      startedAt,
      endedAt: Date.now(),
    })
    toast.error(message, 'Step execution failed')
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
const isEventListenerNode = computed(() => inspectorStore.activeNode?.type === 'event-listener')
const activeTab = ref<'config' | 'settings'>('config')
const localId = ref('')

watch(
  () => inspectorStore.isOpen,
  (isOpen) => {
    if (isOpen) {
      activeTab.value = 'config'
      localId.value = inspectorStore.activeNodeId || ''
    }
  },
  { immediate: true }
)

/**
 * For event-listener nodes: build a preview of the incoming payload from
 * matching Emit Event nodes. Falls back to live execution output if available.
 */
const eventListenerInputPreview = computed(() => {
  const node = inspectorStore.activeNode
  if (node?.type !== 'event-listener') return null

  // 1. Live execution output takes priority
  const live = executionStore.nodeStatuses[node.id]?.output
  if (live !== undefined && live !== null) return live

  // 2. Static preview from matching Emit Event payloadParams
  const eventName = (node.data as any)?.eventName as string
  if (!eventName) return null

  const wfNodes = workflowStore.activeWorkflow?.nodes ?? {}
  const preview: Record<string, string> = {}

  for (const n of Object.values(wfNodes)) {
    if (n.type === 'event' && (n as any).eventName === eventName) {
      const params = (n as any).payloadParams ?? []
      for (const p of params) {
        if (p.key && !(p.key in preview)) {
          preview[p.key] = p.value || `<${p.key}>`
        }
      }
    }
  }

  return Object.keys(preview).length > 0 ? preview : null
})

watch(
  () => inspectorStore.activeNodeId,
  (newId) => {
    localId.value = newId || ''
  }
)

const handleIdChange = (newId: string) => {
  if (!newId || newId === inspectorStore.activeNode?.id || !inspectorStore.activeNode) return

  if (nodes.value.some((n) => n.id === newId)) {
    toast.error('A node with this ID already exists.', 'ID conflict')
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
    toast.success('Variable path copied')
  } catch (err) {
    toast.error('Failed to copy variable path')
  }
}
</script>

<template>
  <BaseModal
    :is-open="inspectorStore.isOpen"
    max-width="1600px"
    height="85vh"
    @close="close"
  >
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
            <!-- Special case: Trigger node with captured payload from Listen for Event -->
            <template v-if="inspectorStore.activeNodeId === 'trigger'">
              <div v-if="lastTriggerPayload" class="p-4 flex-1">
                <p class="text-xs text-muted mb-3" style="font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">
                  Last Captured Event
                </p>
                <JsonTreeView :data="lastTriggerPayload" :is-root="true" />
              </div>
              <div
                v-else
                class="empty-state flex-1 flex flex-col items-center justify-center text-center min-h-[200px]"
              >
                <div class="icon-box mb-3 opacity-70">
                  <LucideIcon name="radio" size="24" />
                </div>
                <p class="text-sm text-muted">No event captured yet.</p>
                <p class="text-xs text-muted mt-1">Use "Listen for Event" in the trigger settings.</p>
              </div>
            </template>
            <!-- Special case: event-listener node - show payload preview from Emit Event -->
            <template v-else-if="isEventListenerNode">
              <div v-if="eventListenerInputPreview" class="p-4 flex-1">
                <p class="text-xs text-muted mb-3" style="font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">
                  {{ executionStore.nodeStatuses[inspectorStore.activeNodeId!]?.output ? 'Received Payload' : 'Expected Payload (from Emit Event)' }}
                </p>
                <JsonTreeView :data="eventListenerInputPreview" :is-root="true" />
              </div>
              <div
                v-else
                class="empty-state flex-1 flex flex-col items-center justify-center text-center min-h-[200px]"
              >
                <div class="icon-box mb-3 opacity-70">
                  <LucideIcon name="radio" size="24" />
                </div>
                <p class="text-sm text-muted">No Emit Event bound yet.</p>
                <p class="text-xs text-muted mt-1">Set an event name that matches an Emit Event node.</p>
              </div>
            </template>
            <!-- Normal case: variable tree from upstream nodes -->
            <template v-else>
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
            </template>
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

            <div class="flex items-center gap-2">
              <BaseButton
                :variant="workflowStore.isDirty ? 'primary' : 'ghost'"
                size="sm"
                icon-left="save"
                :loading="workflowStore.isSaving"
                :disabled="!workflowStore.isDirty"
                @click="workflowStore.saveActiveWorkflow()"
                title="Save Workflow"
              >
                Save
              </BaseButton>

              <BaseButton
                variant="ghost"
                size="sm"
                :icon-left="activeTab === 'config' ? 'settings' : 'x'"
                class="text-muted !p-1 !h-auto"
                title="Settings"
                @click="activeTab = activeTab === 'config' ? 'settings' : 'config'"
              />
            </div>
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
                :inject-variable="injectVariable"
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
              v-if="inspectorStore.activeNodeId !== 'trigger'"
              variant="ghost"
              size="sm"
              icon-left="play"
              :loading="inspectorStore.isTesting"
              @click="runStep"
            >
              Run Step
            </BaseButton>
            <div id="listen-button-container" v-if="inspectorStore.activeNodeId === 'trigger'"></div>
          </div>
          <div class="inspector-pane-content overflow-y-auto flex flex-col h-full">
            <div
              v-if="isExecutingNode"
              class="empty-state flex-1 flex flex-col items-center justify-center text-center min-h-[200px]"
            >
              <LucideIcon name="loader-2" size="24" class="spin text-nod8-accent mb-3" />
              <p class="text-sm text-primary font-medium">Executing step...</p>
            </div>

            <div v-else-if="displayOutput?.success" class="h-full flex-1">
              <div class="h-full">
                <JsonTreeView :data="displayOutput.data" :is-root="true" />
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
  </BaseModal>
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
