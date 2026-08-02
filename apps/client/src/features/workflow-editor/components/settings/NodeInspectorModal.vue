<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { WorkflowGraphNode as GraphNode, WorkflowGraphEdge as Edge } from '../../workflow-canvas/workflowGraphTypes'
import { useNodeInspectorStore } from '../../stores/node-inspector.store'
import { useWorkflowStore } from '../../stores/workflow.store'
import { useExecutionStore } from '../../stores/execution.store'
import type { NodeData } from './editors/types'
import type { RetryPolicy, WorkflowNodeType } from '@/core/types/workflow.types'

import { NODE_EDITOR_REGISTRY } from './editors'
import JsonTreeView from './shared/JsonTreeView.vue'
import VariableTree from './editors/VariableTree.vue'
import PluginMenuAuth from './editors/PluginMenuAuth.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import BaseWorkspaceSurface from '@/shared/workspaces/BaseWorkspaceSurface.vue'
import BaseWorkspaceTab from '@/shared/workspaces/BaseWorkspaceTab.vue'
import { workflowsApi } from '@/core/api/workflows.api'
import { useToast } from '@/shared/composables/useToast'
import {
  buildEventListenerInputPreview,
  buildNodeTestExecutionContext,
} from './nodeInspectorPreview'
import { getInputContextNodes } from './nodeInputContext'
import { getAdvancedNodeHandlers } from '../../layout/advancedNodeDefinitions'

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
  ((enrichedNode.value?.data as any)?.lastTriggerPayload ??
    workflowStore.activeWorkflow?.trigger.lastTriggerPayload ??
    null)
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

const isTriggerNode = computed(() => inspectorStore.activeNode?.type === 'trigger')
const workspaceTitle = computed(() => {
  const data = enrichedNode.value?.data as Record<string, unknown> | undefined
  const name = typeof data?.name === 'string' ? data.name.trim() : ''
  return name || inspectorStore.activeNodeId || 'Node Inspector'
})

function close() {
  inspectorStore.closeInspector()
}

function inspectorTabTitle(node: GraphNode<NodeData>) {
  const name = typeof node.data?.name === 'string' ? node.data.name.trim() : ''
  return name || node.id
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
      buildNodeTestExecutionContext(
        executionStore.nodeStatuses,
        workflowStore.activeWorkflow.variables?.reduce<Record<string, unknown>>((acc, variable) => {
          acc[variable.name] = variable.defaultValue
          return acc
        }, {}) ?? {},
      ),
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

  const hasRealTriggerNodes = Object.values(wf.nodes).some((node) => node.type === 'trigger')
  const result: GraphNode<NodeData>[] = hasRealTriggerNodes
    ? []
    : [
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

const isConfigurationEdge = (edge: Edge): boolean => {
  const target = nodes.value.find((node) => node.id === edge.target)
  const targetHandle = edge.targetHandle
  if (!target || !targetHandle) return false

  return getAdvancedNodeHandlers(target.type).some(
    (handler) =>
      handler.type === 'target' &&
      handler.id === targetHandle &&
      Boolean(handler.accepts?.length),
  )
}

const upstreamNodes = computed(() => {
  if (!inspectorStore.activeNode) return []
  return getInputContextNodes({
    currentId: inspectorStore.activeNode.id,
    nodes: nodes.value,
    edges: edges.value,
    isConfigurationEdge,
  })
})

const enrichedNode = computed(() => {
  if (!inspectorStore.activeNode) return undefined

  const id = inspectorStore.activeNode.id
  const storeData: NodeData | undefined =
    id === 'trigger' && !workflowStore.activeWorkflow?.nodes[id]
      ? (workflowStore.activeWorkflow?.trigger as unknown as NodeData)
      : (workflowStore.activeWorkflow?.nodes[id] as unknown as NodeData)

  const editorData =
    storeData?.type === 'trigger' && (storeData as any).trigger
      ? ((storeData as any).trigger as NodeData)
      : storeData

  return {
    ...inspectorStore.activeNode,
    data: editorData ?? inspectorStore.activeNode.data,
  }
})

const updateNodeData = (newData: Record<string, unknown>) => {
  if (!inspectorStore.activeNode) return
  const id = inspectorStore.activeNode.id
  const storeNode = workflowStore.activeWorkflow?.nodes[id]
  if (storeNode?.type === 'trigger') {
    workflowStore.updateNodeData(id, {
      trigger: {
        ...((storeNode as any).trigger ?? { type: 'manual' }),
        ...newData,
      },
    })
    return
  }
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
const settingsAuthPluginId = computed(() => {
  const node = inspectorStore.activeNode
  const data = node?.data as Record<string, unknown> | undefined
  if (!node || !data) return ''

  if (typeof data.pluginId === 'string' && data.pluginId.trim()) return data.pluginId
  return ''
})
const hasAuthSettings = computed(() => isPluginNode.value || Boolean(settingsAuthPluginId.value))
const isEventListenerNode = computed(() => inspectorStore.activeNode?.type === 'event-listener')
const canConfigureRetry = computed(() => !isTriggerNode.value)
const nodeDisabled = computed(() => {
  const id = inspectorStore.activeNodeId
  if (!id) return false
  if (id === 'trigger' && !workflowStore.activeWorkflow?.nodes[id]) return false
  return workflowStore.activeWorkflow?.nodes[id]?.disabled === true
})
const activeTab = ref<'config' | 'settings'>('config')
const localId = ref('')
const inputTreeReady = ref(false)
const outputTreeReady = ref(false)
let inputTreeTimer: number | null = null
let outputTreeTimer: number | null = null

function clearLazyTreeTimers() {
  if (inputTreeTimer !== null) {
    window.clearTimeout(inputTreeTimer)
    inputTreeTimer = null
  }
  if (outputTreeTimer !== null) {
    window.clearTimeout(outputTreeTimer)
    outputTreeTimer = null
  }
}

function scheduleInspectorTrees() {
  clearLazyTreeTimers()
  inputTreeReady.value = false
  outputTreeReady.value = false

  if (!inspectorStore.isOpen) return

  void nextTick(() => {
    inputTreeTimer = window.setTimeout(() => {
      inputTreeReady.value = true
      inputTreeTimer = null

      outputTreeTimer = window.setTimeout(() => {
        outputTreeReady.value = true
        outputTreeTimer = null
      }, 16)
    }, 16)
  })
}

onBeforeUnmount(clearLazyTreeTimers)

const retryPolicy = computed<RetryPolicy | undefined>(() => {
  return enrichedNode.value?.data?.retryPolicy as RetryPolicy | undefined
})
const retryEnabled = computed(() => Boolean(retryPolicy.value))
const retryBackoffOptions = [
  { value: 'fixed', label: 'Fixed', icon: 'minus' },
  { value: 'linear', label: 'Linear', icon: 'chart-line' },
  { value: 'exponential', label: 'Exponential', icon: 'activity' },
]

watch(
  () => inspectorStore.isOpen,
  (isOpen) => {
    if (isOpen) {
      activeTab.value = 'config'
      localId.value = inspectorStore.activeNodeId || ''
      scheduleInspectorTrees()
    } else {
      clearLazyTreeTimers()
      inputTreeReady.value = false
      outputTreeReady.value = false
    }
  },
  { immediate: true }
)

watch(
  () => [inspectorStore.activeNodeId, executionState.value?.output, inspectorStore.lastTestOutput],
  () => scheduleInspectorTrees(),
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

  return buildEventListenerInputPreview({
    eventName,
    workflowNodes: workflowStore.activeWorkflow?.nodes ?? {},
    nodeStatuses: executionStore.nodeStatuses,
  })
})

const eventListenerSearch = ref('')

function filterObject(obj: any, query: string): any {
  if (!query) return obj
  if (obj === null || obj === undefined) return null

  if (typeof obj !== 'object') {
    return String(obj).toLowerCase().includes(query) ? obj : null
  }

  if (Array.isArray(obj)) {
    const filtered = obj.map(item => filterObject(item, query)).filter(item => item !== null)
    return filtered.length > 0 ? filtered : null
  }

  const result: Record<string, any> = {}
  let hasMatch = false

  for (const [key, value] of Object.entries(obj)) {
    if (key.toLowerCase().includes(query)) {
      result[key] = value
      hasMatch = true
    } else {
      const filteredValue = filterObject(value, query)
      if (filteredValue !== null) {
        result[key] = filteredValue
        hasMatch = true
      }
    }
  }

  return hasMatch ? result : null
}

const filteredEventListenerInputPreview = computed(() => {
  const preview = eventListenerInputPreview.value
  if (!preview) return null
  const q = eventListenerSearch.value.toLowerCase().trim()
  if (!q) return preview
  
  return filterObject(preview, q) || {}
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
    inspectorStore.renameInspectorTab(inspectorStore.activeNode.id, newId)
    inspectorStore.activeNodeId = newId
    inspectorStore.activeNode.id = newId
  } else {
    localId.value = inspectorStore.activeNode.id
  }
}

function setRetryEnabled(enabled: boolean) {
  if (!enabled) {
    updateNodeData({ retryPolicy: undefined })
    return
  }

  updateNodeData({
    retryPolicy: retryPolicy.value ?? {
      maxRetries: 2,
      intervalSeconds: 1,
      backoffStrategy: 'fixed',
    },
  })
}

function updateRetryPolicy(patch: Partial<RetryPolicy>) {
  const current = retryPolicy.value ?? {
    maxRetries: 2,
    intervalSeconds: 1,
    backoffStrategy: 'fixed' as const,
  }
  updateNodeData({
    retryPolicy: {
      ...current,
      ...patch,
    },
  })
}

function setNodeDisabled(disabled: boolean) {
  if (!inspectorStore.activeNodeId) return
  if (inspectorStore.activeNodeId === 'trigger' && !workflowStore.activeWorkflow?.nodes.trigger) return
  workflowStore.updateNodeData(inspectorStore.activeNodeId, { disabled })
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
  <BaseWorkspaceSurface
    :open="inspectorStore.isOpen"
    workspace-id="workflow-node-inspectors"
    :title="workspaceTitle"
    modal-max-width="1600px"
    modal-height="85vh"
    :window-width="1400"
    :window-height="860"
    @close="close"
  >
    <template #tabs>
      <BaseWorkspaceTab
        v-for="tab in inspectorStore.openTabs"
        :key="tab.id"
        :title="inspectorTabTitle(tab as GraphNode<NodeData>)"
        :active="tab.id === inspectorStore.activeNodeId"
        @select="inspectorStore.selectInspector(tab.id)"
        @close="inspectorStore.closeInspectorTab(tab.id)"
      />
    </template>
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
            <template v-if="isTriggerNode">
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
              <div v-if="eventListenerInputPreview" class="flex-1 flex flex-col min-h-0">
                <div class="p-2 border-b border-fabric-border bg-[var(--fabric-node-inspector-modal-bg-surface)] sticky top-0 z-10">
                  <BaseInput v-model="eventListenerSearch" icon-left="search" placeholder="Search variables..." />
                </div>
                <div class="p-4 flex-1 overflow-y-auto">
                  <p class="text-xs text-muted" style="font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-top: 10px; margin-bottom: 10px">
                    {{ executionStore.nodeStatuses[inspectorStore.activeNodeId!]?.output ? 'Received Payload' : 'Expected Payload (from Emit Event)' }}
                  </p>
                  <JsonTreeView v-if="Object.keys(filteredEventListenerInputPreview).length > 0" :data="filteredEventListenerInputPreview" :is-root="true" />
                  <div v-else class="text-center py-8 text-sm text-muted">No results found</div>
                </div>
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
                  v-if="inputTreeReady"
                  param-key="inspector"
                  :upstream-nodes="upstreamNodes"
                  :nodes="nodes"
                  @inject="(key, path) => copyToClipboard(path)"
                />
                <div v-else class="tree-loading-state">
                  <LucideIcon name="loader-2" size="18" class="spin text-fabric-accent" />
                  <span>Loading input preview...</span>
                </div>
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
        <div class="inspector-pane" style="background: var(--fabric-node-inspector-modal-bg-surface)">
          <div
            class="inspector-pane-header flex-between w-full"
            style="background: var(--fabric-node-inspector-modal-bg-surface)"
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

                <div
                  v-if="!(inspectorStore.activeNodeId === 'trigger' && !workflowStore.activeWorkflow?.nodes.trigger)"
                  class="flex items-center justify-between gap-3 pt-4 border-t border-fabric-border"
                >
                  <div class="flex flex-col gap-1">
                    <label class="text-sm font-semibold text-primary">
                      {{ isTriggerNode ? 'Trigger Enabled' : 'Node Enabled' }}
                    </label>
                    <p class="text-xs text-muted leading-tight">
                      Disabled triggers do not start. Disabled nodes are skipped.
                    </p>
                  </div>
                  <BaseSwitch
                    :model-value="!nodeDisabled"
                    @update:model-value="(value) => setNodeDisabled(!value)"
                  />
                </div>

                <!-- Retry Policy -->
                <div
                  v-if="canConfigureRetry"
                  class="flex flex-col gap-3 pt-4 border-t border-fabric-border"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex flex-col gap-1">
                      <label class="text-sm font-semibold text-primary">Retry Policy</label>
                      <p class="text-xs text-muted leading-tight">
                        Re-run this node when it fails.
                      </p>
                    </div>
                    <BaseSwitch
                      :model-value="retryEnabled"
                      @update:model-value="setRetryEnabled"
                    />
                  </div>

                  <div v-if="retryEnabled" class="retry-settings-grid">
                    <BaseInput
                      type="number"
                      label="Max retries"
                      :model-value="String(retryPolicy?.maxRetries ?? 2)"
                      min="0"
                      max="20"
                      @update:model-value="updateRetryPolicy({ maxRetries: Math.max(0, Number($event) || 0) })"
                    />
                    <BaseInput
                      type="number"
                      label="Interval seconds"
                      :model-value="String(retryPolicy?.intervalSeconds ?? 1)"
                      min="0"
                      step="0.5"
                      @update:model-value="updateRetryPolicy({ intervalSeconds: Math.max(0, Number($event) || 0) })"
                    />
                    <BaseSelect
                      label="Backoff"
                      :model-value="retryPolicy?.backoffStrategy ?? 'fixed'"
                      :options="retryBackoffOptions"
                      @update:model-value="updateRetryPolicy({ backoffStrategy: $event as RetryPolicy['backoffStrategy'] })"
                    />
                  </div>
                </div>

                <!-- Authorization Configuration -->
                <div
                  v-if="hasAuthSettings"
                  class="flex flex-col gap-2 pt-4 border-t border-fabric-border"
                >
                  <label class="text-sm font-semibold text-primary mb-1"
                    >Integration Authorization</label
                  >
                  <PluginMenuAuth
                    v-if="settingsAuthPluginId"
                    :plugin-id="settingsAuthPluginId"
                  />
                  <div
                    v-else
                    class="text-sm text-muted p-4 flex flex-col items-center justify-center h-full text-center bg-[var(--fabric-node-inspector-modal-bg-elevated)] rounded"
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
              v-if="!isTriggerNode"
              variant="ghost"
              size="sm"
              icon-left="play"
              :loading="inspectorStore.isTesting"
              @click="runStep"
            >
              Run Step
            </BaseButton>
            <div id="listen-button-container" v-if="isTriggerNode"></div>
          </div>
          <div class="inspector-pane-content overflow-y-auto flex flex-col h-full">
            <div
              v-if="isExecutingNode"
              class="empty-state flex-1 flex flex-col items-center justify-center text-center min-h-[200px]"
            >
              <LucideIcon name="loader-2" size="24" class="spin text-fabric-accent mb-3" />
              <p class="text-sm text-primary font-medium">Executing step...</p>
            </div>

            <div v-else-if="displayOutput?.success" class="h-full flex-1">
              <div v-if="!outputTreeReady" class="tree-loading-state h-full">
                <LucideIcon name="loader-2" size="18" class="spin text-fabric-accent" />
                <span>Loading output preview...</span>
              </div>
              <div v-else class="h-full">
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
  </BaseWorkspaceSurface>
</template>

<style scoped>
/* Inherits classes from inspector.css */

.spin {
  animation: spin 1s linear infinite;
}

.retry-settings-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--fabric-space-3);
}

.tree-loading-state {
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--fabric-space-2);
  color: var(--fabric-node-inspector-modal-text-muted);
  font-size: 12px;
}

@media (max-width: 900px) {
  .retry-settings-grid {
    grid-template-columns: 1fr;
  }
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
