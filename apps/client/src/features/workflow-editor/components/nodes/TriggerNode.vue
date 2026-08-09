<script setup lang="ts">
import { computed, markRaw, onMounted, ref, watch } from 'vue'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { TriggerNode, WorkflowTrigger } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { Position } from '../nodePresentation.types'
import { useWorkflowStore } from '../../stores/workflow.store'
import { useExecutionStore } from '../../stores/execution.store'
import { useEventBus } from '@/shared/composables/useEventBus'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { useAppPanelStore } from '@/shared/stores/app-panel.store'
import { useToast } from '@/shared/composables/useToast'
import RunWorkflowPanel from '../execution/RunWorkflowPanel.vue'
import NodeShimmer from './NodeShimmer.vue'
import NodeToolbar from './NodeToolbar.vue'
import ChatTriggerNode from './ChatTriggerNode.vue'
import { apiRequest } from '@/core/api/client'
import { ENDPOINTS } from '@/core/api/endpoints'
import { useTheme } from '@/shared/composables/useTheme'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'
import { isIconUrl } from '@/shared/icons/iconRendering'
import type { PluginSummary } from '@/core/types/plugin.types'

defineOptions({ inheritAttrs: false })

const props = defineProps<
  NodeProps<TriggerNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const store = useWorkflowStore()
const executionStore = useExecutionStore()
const panelStore = useAppPanelStore()
const toast = useToast()
const { iconVariant } = useTheme()
const selectedPlugin = ref<PluginSummary | null>(null)
const pluginIcon = ref('plug')
const pluginIconColor = ref('var(--fabric-node-plugin-icon)')

const triggerData = computed<WorkflowTrigger | undefined>(() => {
  const data = props.data as unknown as TriggerNode | WorkflowTrigger
  if ('trigger' in data && data.trigger) return data.trigger
  return data as WorkflowTrigger
})

const triggerConfig = computed(() => {
  const type = triggerData.value?.type || 'manual'

  const configMap = {
    manual: {
      icon: 'mouse-pointer-2',
      title: 'Manual Trigger',
      subtitle: null,
      color: 'var(--fabric-trigger-node-text-primary)',
      bg: 'var(--fabric-node-body)',
      borderColor: 'var(--fabric-node-border)',
    },
    webhook: {
      icon: 'webhook',
      title: 'Webhook',
      subtitle: null,
      color: 'rgb(16, 185, 129)',
      bg: 'rgba(16,185,129,0.12)',
      borderColor: 'rgba(16,185,129,0.4)',
    },
    cron: {
      icon: 'clock',
      title: 'Schedule',
      subtitle: null,
      color: 'rgb(138, 82, 255)',
      bg: 'rgba(138,82,255,0.12)',
      borderColor: 'rgba(138,82,255,0.4)',
    },
    form: {
      icon: 'clipboard-list',
      title: 'Form Trigger',
      subtitle: null,
      color: 'rgb(236, 72, 153)',
      bg: 'rgba(236,72,153,0.12)',
      borderColor: 'rgba(236,72,153,0.45)',
    },
    plugin: {
      icon: pluginIcon.value,
      title: 'Plugin Trigger',
      subtitle: pluginTriggerEventLabel.value,
      color: pluginIconColor.value,
      bg: 'var(--fabric-node-plugin-bg)',
      borderColor: 'var(--fabric-node-plugin-border)',
    },
    chat: {
      icon: 'message-circle',
      title: 'When chat message received',
      subtitle: null,
      color: 'rgb(20, 184, 166)',
      bg: 'rgba(20,184,166,0.12)',
      borderColor: 'rgba(20,184,166,0.4)',
    },
  }

  return configMap[type as keyof typeof configMap] ?? configMap.manual
})

const nodeTitle = computed(() => {
  const type = triggerData.value?.type || 'manual'
  if (type === 'webhook') {
    // webhookSlug is human-readable; webhookPath is the auto-generated UUID — never show the UUID
    return triggerData.value?.webhookSlug ?? 'Webhook'
  }
  if (type === 'cron') {
    return 'Cron'
  }
  if (type === 'form') {
    return triggerData.value?.formSlug ?? 'Form'
  }
  if (type === 'plugin') {
    return selectedPlugin.value?.manifest.metadata.name ?? 'Plugin Trigger'
  }
  return triggerConfig.value.title
})

const pluginTriggerEventLabel = computed(() => {
  if (triggerData.value?.type !== 'plugin') return null
  const triggerName = triggerData.value.triggerName
  const manifest = triggerName ? selectedPlugin.value?.manifest.triggers?.[triggerName] : null
  return manifest?.metadata?.label || 'On Message'
})

const effectiveStatus = computed<'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'>(() => {
  const storeStatus = executionStore.nodeStatuses[props.id]?.status
  if (storeStatus && storeStatus !== 'idle') return storeStatus
  return props.status ?? 'idle'
})

const isRealTriggerNode = computed(() => {
  return Boolean(props.id && store.activeWorkflow?.nodes[props.id])
})

const showToolbar = computed(() => {
  return Boolean(props.id && props.selected && isRealTriggerNode.value)
})

const isChatTrigger = computed(() => triggerData.value?.type === 'chat')
const isDisabled = computed(() => props.data?.disabled === true || store.activeWorkflow?.nodes[props.id]?.disabled === true)

async function loadSelectedPlugin() {
  const pluginId = triggerData.value?.type === 'plugin' ? triggerData.value.pluginId : undefined
  selectedPlugin.value = null
  pluginIcon.value = 'plug'
  pluginIconColor.value = 'var(--fabric-node-plugin-icon)'
  if (!pluginId) return

  try {
    const plugin = await apiRequest<PluginSummary>(ENDPOINTS.PLUGIN_BY_ID(pluginId))
    selectedPlugin.value = plugin
    pluginIcon.value = resolvePluginIcon(plugin.manifest.metadata, {
      iconVariant: iconVariant.value,
      fallback: 'plug',
    })
    pluginIconColor.value = isIconUrl(pluginIcon.value)
      ? 'var(--fabric-node-plugin-icon)'
      : plugin.manifest.metadata.style?.iconColor ?? 'var(--fabric-node-plugin-icon)'
  } catch (err) {
    console.warn(`Failed to load plugin trigger icon for ${pluginId}`, err)
  }
}

onMounted(loadSelectedPlugin)
watch(() => [triggerData.value?.pluginId, triggerData.value?.triggerName, iconVariant.value], loadSelectedPlugin)

const onExecuteWorkflow = async () => {
  const workflow = store.activeWorkflow
  if (!workflow?.metadata.id) return

  const trigger = triggerData.value ?? workflow.trigger
  const schema = trigger.schema ?? {}

  if (trigger.type === 'form') {
    const formPublicId = trigger.formSlug?.trim() || workflow.metadata.id
    const clientExecId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    executionStore.resetNodeStatuses()
    executionStore.startStream(clientExecId)
    executionStore.setTriggerRunning(props.id)

    const formUrl = `${window.location.origin}/forms-test/${formPublicId}?execId=${clientExecId}`
    window.open(formUrl, '_blank', 'noopener')
    return
  }

  if (trigger.type !== 'manual') {
    toast.warning('This trigger waits for its real event before running the next nodes.')
    return
  }

  if (Object.keys(schema).length > 0) {
    panelStore.togglePanel({
      id: 'run-workflow-panel',
      title: 'Run Workflow',
      component: markRaw(RunWorkflowPanel),
      props: {
        workflowId: workflow.metadata.id,
        schema,
        triggerType: trigger.type,
        triggerNodeId: props.id,
      },
      position: 'right',
      width: 'md',
    })
  } else {
    await executionStore.executeTrigger(workflow.metadata.id, props.id, {})
  }
}

const hasOutgoingConnection = computed(() => {
  if (!props.id) return false
  return store.activeWorkflow?.edges.some((e) => e.source === props.id) ?? false
})

const onQuickAdd = (event: MouseEvent) => {
  if (!props.id) return
  const anchorRect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  useEventBus('node:quick-add').emit({
    sourceId: props.id,
    clientX: event.clientX,
    clientY: event.clientY,
    anchorRect,
  })
}
</script>

<template>
  <ChatTriggerNode
    v-if="isChatTrigger"
    v-bind="props"
    :has-outgoing-connection="hasOutgoingConnection"
  />
  <template v-else>
  <div
    class="trigger-node"
    :class="[
      { 'is-selected': props.selected },
      { 'is-disabled': isDisabled },
      effectiveStatus !== 'idle' ? `is-${effectiveStatus}` : '',
    ]"
    :style="{ '--trigger-border': triggerConfig.borderColor, '--node-tint': triggerConfig.bg }"
  >
    <!-- Execute button floating left -->
    <BaseButton
      variant="primary"
      size="md"
      class="trigger-node__execute-btn"
      icon-left="play"
      @click.stop="onExecuteWorkflow"
    >
      Execute Trigger
    </BaseButton>

    <!-- Shimmer clip wrapper — needs overflow:hidden + border-radius match -->
    <div v-if="effectiveStatus === 'running' || effectiveStatus === 'waiting'" class="trigger-node__shimmer-clip">
      <NodeShimmer />
    </div>

    <!-- Lightning bolt accent (top-left corner like n8n) -->
    <div class="trigger-node__lightning">
      <LucideIcon name="zap" :size="24" />
    </div>

    <!-- Icon -->
    <div class="trigger-node__icon" :style="{ color: triggerConfig.color }">
      <LucideIcon :name="triggerConfig.icon" :size="48" />
    </div>

    <NodeToolbar
      v-if="props.id && isRealTriggerNode"
      :node-id="props.id"
      :visible="showToolbar"
    />

    <div
      v-if="props.id && isRealTriggerNode"
      class="trigger-node__toolbar-bridge"
      aria-hidden="true"
    />
  </div>

  <!-- Source handle -->
  <BaseHandle id="source" type="source" :position="Position.Right" />

  <!-- Quick Add Cable (n8n style) -->
  <div
    v-if="!hasOutgoingConnection && props.id"
    class="trigger-node__quick-add"
    title="Add connected node"
    @click.stop="onQuickAdd"
  >
    <div class="trigger-node__quick-add-cable"></div>
    <button class="trigger-node__quick-add-btn">
      <LucideIcon name="plus" :size="11" />
    </button>
  </div>

  <!-- Label outside -->
  <div class="trigger-node__label-area">
    <span class="trigger-node__label-title" :title="nodeTitle">{{ nodeTitle }}</span>
    <span v-if="triggerData?.type === 'webhook'" class="trigger-node__label-subtitle">
      /webhooks/{{ triggerData.webhookSlug ?? '…' }}
    </span>
    <span v-else-if="triggerData?.type === 'cron'" class="trigger-node__label-subtitle">
      {{ triggerData.cronExpression }}
    </span>
    <span v-else-if="triggerData?.type === 'form'" class="trigger-node__label-subtitle">
      Form submission
    </span>
    <span v-else-if="triggerData?.type === 'plugin'" class="trigger-node__label-subtitle">
      {{ pluginTriggerEventLabel ?? 'On Message' }}
    </span>
  </div>
  </template>
</template>

<style scoped>
/* ─── Trigger card — same square shape as n8n, special border accent ── */
.trigger-node {
  position: relative;
  width: 100px;
  height: 100px;
  background-color: var(--fabric-node-body);
  background-image: linear-gradient(var(--node-tint, transparent), var(--node-tint, transparent));
  border: 2px solid var(--trigger-border, #3c3c3c);
  border-radius: 50px 16px 16px 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  overflow: visible;
}

.trigger-node:hover {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  border-color: color-mix(
    in srgb,
    var(--trigger-border, #3c3c3c) 80%,
    var(--fabric-trigger-node-text-primary) 20%
  );
}

.trigger-node:hover :deep(.nt-toolbar) {
  opacity: 1;
  pointer-events: auto;
}

.trigger-node__toolbar-bridge {
  position: absolute;
  top: -40px;
  left: 0;
  right: 0;
  height: 40px;
}

.trigger-node.is-selected {
  border-color: color-mix(
    in srgb,
    var(--trigger-border, #3c3c3c) 80%,
    var(--fabric-trigger-node-text-primary) 20%
  );
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.5),
    0 0 0 3px color-mix(in srgb, var(--trigger-border, #3c3c3c) 50%, transparent);
}

.trigger-node.is-running {
  border-color: var(--fabric-trigger-node-amber400);
}

.trigger-node.is-waiting {
  border-color: var(--fabric-purple-400, #8b5cf6);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.5),
    0 0 0 3px rgba(139, 92, 246, 0.2);
  --node-shimmer-color: rgba(139, 92, 246, 0.18);
}

.trigger-node.is-success {
  border-color: var(--fabric-trigger-node-green400);
}

.trigger-node.is-failed {
  border-color: var(--fabric-trigger-node-red400);
}

.trigger-node.is-disabled {
  opacity: 0.45;
  filter: grayscale(0.8) brightness(0.65);
}

/* ─── Shimmer clip (isolates overflow without breaking the execute-btn) ─── */
.trigger-node__shimmer-clip {
  position: absolute;
  inset: 0;
  border-radius: 50px 16px 16px 50px; /* same as .trigger-node */
  overflow: hidden;
  pointer-events: none;
  z-index: 10;
}

/* ─── Lightning bolt accent ─────────────────────────────────── */
.trigger-node__lightning {
  position: absolute;
  top: 50%;
  left: -50px;
  transform: translateY(-50%);
  color: var(--fabric-trigger-node-text-primary);
  opacity: 0.9;
  display: flex;
  align-items: center;
  line-height: 1;
  transition: opacity 0.2s var(--fabric-ease-standard);
}

.trigger-node:hover .trigger-node__lightning {
  opacity: 0;
  pointer-events: none;
}

/* ─── Execute Button (Slide from left) ──────────────────────── */
.trigger-node__execute-btn {
  position: absolute;
  top: 50%;
  left: -5px;
  transform: translate(-20px, -50%);
  display: flex;
  align-items: center;

  /* Initial state: hidden and slightly to the right (behind the node) */
  opacity: 0;
  pointer-events: none;
  z-index: -1;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

/* Invisible bridge to prevent hover loss between the node and the button */
.trigger-node::before {
  content: '';
  position: absolute;
  top: 0;
  left: -30px;
  width: 30px;
  height: 100%;
}

.trigger-node:hover .trigger-node__execute-btn {
  opacity: 1;
  pointer-events: auto;
  /* Final state: fully visible, pushed out to the left */
  transform: translate(calc(-100% - 16px), -50%);
}

/* ─── Main icon ─────────────────────────────────────────────── */
.trigger-node__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* ─── Label (outside the card) ──────────────────────────────── */
.trigger-node__label-area {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  pointer-events: none;
}

.trigger-node__label-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--fabric-trigger-node-text-primary);
  line-height: 1.3;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

.trigger-node__label-subtitle {
  font-size: 11px;
  color: var(--fabric-trigger-node-text-muted);
  text-align: center;
  margin-top: 2px;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Quick Add Node (n8n style) ─────────────────────────────── */
.trigger-node__quick-add {
  position: absolute;
  top: 50%;
  right: -82px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  z-index: 2100;
  pointer-events: all;
}

.trigger-node__quick-add-cable {
  width: 60px;
  height: 2px;
  background-color: var(--fabric-node-handle);
  transition: background-color 0.2s;
}

.trigger-node__quick-add-btn {
  border-radius: var(--fabric-radius-sm);
  background-color: var(--fabric-node-border);
  border: 2px solid var(--fabric-trigger-node-border-strong);
  color: var(--fabric-trigger-node-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 19px;
  height: 19px;
  transition: all 0.2s;
}
</style>
