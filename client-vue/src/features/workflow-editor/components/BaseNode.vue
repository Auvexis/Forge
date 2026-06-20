<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import { Position, useVueFlow } from '@vue-flow/core'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseHandle from './BaseHandle.vue'
import QuickAddButton from './QuickAddButton.vue'
import type {
  BaseNodeHandlerDefinition,
  NodeBorderStyle,
  NodeRounding,
  NodeSide,
} from './nodePresentation.types'
import NodeShimmer from './nodes/NodeShimmer.vue'
import NodeToolbar from './nodes/NodeToolbar.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import { useExecutionStore } from '@/features/workflow-editor/stores/execution.store'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import { useAppPanelStore } from '@/shared/stores/app-panel.store'
import { useEventBus } from '@/shared/composables/useEventBus'
import { useToast } from '@/shared/composables/useToast'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  id?: string

  title?: string
  subtitle?: string
  description?: string
  icon?: string
  iconLeft?: string
  color?: string
  bg?: string
  borderColor?: string
  badgeText?: string

  hasTarget?: boolean
  hasSource?: boolean
  hasOutgoingConnection?: boolean
  inputPosition?: NodeSide
  outputPosition?: NodeSide
  rounded?: NodeRounding
  borderStyle?: NodeBorderStyle
  handlers?: BaseNodeHandlerDefinition[]

  selected?: boolean
  status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'

  height?: number | string
  width?: number | string
}>()

const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()
const panelStore = useAppPanelStore()
const quickAddBus = useEventBus('node:quick-add')
const toast = useToast()
const { edges, updateNodeInternals } = useVueFlow()

const allEdges = computed(() => [
  ...edges.value,
  ...(workflowStore.activeWorkflow?.edges ?? []),
])

const positionBySide = {
  top: Position.Top,
  left: Position.Left,
  bottom: Position.Bottom,
  right: Position.Right,
} as const

const effectiveInputPosition = computed(() => positionBySide[props.inputPosition ?? 'left'])
const effectiveOutputPosition = computed(() => positionBySide[props.outputPosition ?? 'right'])
const handlerSides = computed(() =>
  [Position.Top, Position.Right, Position.Bottom, Position.Left]
    .map((position) => ({
      position,
      handlers: (props.handlers ?? []).filter((handler) => handler.position === position),
    }))
    .filter((side) => side.handlers.length > 0),
)
const handleGeometrySignature = computed(() =>
  JSON.stringify({
    target: props.hasTarget ? effectiveInputPosition.value : null,
    source: props.hasSource ? effectiveOutputPosition.value : null,
    handlers: (props.handlers ?? []).map((handler) => [
      handler.id,
      handler.type,
      handler.position,
      handler.style ?? 'circle',
    ]),
  }),
)

const refreshHandleGeometry = async () => {
  if (!props.id) return
  await nextTick()
  updateNodeInternals([props.id])
}

watch(handleGeometrySignature, refreshHandleGeometry, { flush: 'post' })

const handlerAllowsQuickAdd = (handler: BaseNodeHandlerDefinition) =>
  !!handler.quickAdd && (handler.allowedNodes === '*' || handler.allowedNodes.length > 0)

const isEditingId = ref(false)
const editedId = ref('')
const idInputRef = ref<InstanceType<typeof BaseInput> | null>(null)

const startEditingId = async () => {
  if (!props.id || props.id === 'trigger') return
  isEditingId.value = true
  editedId.value = props.id
  await nextTick()
  idInputRef.value?.focus()
  idInputRef.value?.select()
}

const commitIdChange = () => {
  if (!isEditingId.value) return

  const newId = editedId.value.trim()
  if (!newId || newId === props.id) {
    isEditingId.value = false
    return
  }

  if (workflowStore.activeWorkflow?.nodes[newId] || newId === 'trigger') {
    toast.error('A node with this ID already exists.', 'ID conflict')
    idInputRef.value?.focus()
    return
  }

  isEditingId.value = false
  workflowStore.renameNode(props.id!, newId)
  panelStore.closePanel()
}

const cancelIdChange = () => {
  isEditingId.value = false
}

const effectiveStatus = computed<'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'>(() => {
  if (props.id) {
    const storeStatus = executionStore.nodeStatuses[props.id]?.status
    if (storeStatus && storeStatus !== 'idle') return storeStatus
  }
  return props.status ?? 'idle'
})

const statusClasses = computed(() => {
  if (effectiveStatus.value === 'idle') return ''
  return `is-${effectiveStatus.value}`
})

const showToolbar = computed(() => !!props.id && props.id !== 'trigger' && !!props.selected)
const isDisabled = computed(() => !!props.id && workflowStore.activeWorkflow?.nodes[props.id]?.disabled === true)

const hasOutgoingConnection = computed(() => {
  if (typeof props.hasOutgoingConnection === 'boolean') return props.hasOutgoingConnection
  if (!props.id) return false
  return allEdges.value.some((e) => e.source === props.id)
})

const onQuickAdd = (event: MouseEvent) => {
  if (props.id) {
    const anchorRect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    quickAddBus.emit({ sourceId: props.id, clientX: event.clientX, clientY: event.clientY, anchorRect })
  }
}
</script>

<template>
  <div 
    class="sailor-base-node sailor-node-pop-in"
    :class="[
      { 'is-selected': selected, 'is-disabled': isDisabled },
      statusClasses,
      `is-rounded-${props.rounded ?? 'lg'}`,
      `is-border-${props.borderStyle ?? 'default'}`,
    ]"
    :style="{ 
      '--node-tint': props.bg, 
      '--node-custom-border': props.borderColor,
      height: props.height ? (typeof props.height === 'number' ? `${props.height}px` : props.height) : undefined,
      width: props.width ? (typeof props.width === 'number' ? `${props.width}px` : props.width) : undefined
    }"
  >
    <!-- Shimmer overlay while active/waiting -->
    <NodeShimmer v-if="effectiveStatus === 'running' || effectiveStatus === 'retrying' || effectiveStatus === 'waiting'" />

    <!-- Icon area (center of card) -->
    <div class="sailor-base-node__icon-wrap">
      <slot name="icon">
        <div
          v-if="props.iconLeft || props.icon"
          class="sailor-base-node__icon-box"
          :style="{ color: props.color }"
        >
          <LucideIcon :name="props.iconLeft || props.icon || 'box'" :size="48" />
        </div>
      </slot>
    </div>

    <!-- Custom slot content (if any) -->
    <div v-if="$slots.default" class="sailor-base-node__body">
      <slot />
    </div>

    <!-- AUTO HANDLES -->
    <BaseHandle v-if="props.hasTarget" id="target" type="target" :position="effectiveInputPosition" />
    <BaseHandle v-if="props.hasSource" id="source" type="source" :position="effectiveOutputPosition" />

    <div
      v-for="side in handlerSides"
      :key="side.position"
      class="sailor-base-node__handlers"
      :class="`is-position-${side.position}`"
      :style="{ '--handler-count': side.handlers.length }"
    >
      <div
        v-for="handler in side.handlers"
        :key="handler.id"
        class="sailor-base-node__handler"
      >
        <BaseHandle
          :id="handler.id"
          :type="handler.type"
          :position="handler.position"
          :variant="handler.style ?? 'circle'"
        />
        <span v-if="handler.label">
          {{ handler.label }}<template v-if="handler.required">*</template>
        </span>
        <QuickAddButton
          v-if="props.id && handlerAllowsQuickAdd(handler)"
          :node-id="props.id"
          :handle-id="handler.id"
          :target-handle-id="handler.id"
          :mode="handler.quickAdd"
          :allowed-nodes="handler.allowedNodes"
          :always-visible="handler.quickAddAfterConnected"
          :direction="handler.position === Position.Bottom ? 'down' : 'right'"
        />
      </div>
    </div>

    <!-- Quick Add Cable (n8n style) -->
    <div
      v-if="props.hasSource && !hasOutgoingConnection && props.id"
      class="sailor-base-node__quick-add"
      title="Add connected node"
      @click.stop="onQuickAdd"
      @dblclick.stop.prevent
      @pointerdown.stop
    >
      <div class="sailor-base-node__quick-add-cable"></div>
      <button class="sailor-base-node__quick-add-btn" type="button">
        <LucideIcon name="plus" :size="11" />
      </button>
    </div>

    <!-- Toolbar: JS-visible when selected; CSS-visible on :hover -->
    <NodeToolbar
      v-if="props.id && props.id !== 'trigger'"
      :node-id="props.id"
      :visible="showToolbar"
    />

    <!-- Gap bridge for CSS hover -->
    <div
      v-if="props.id && props.id !== 'trigger'"
      class="sailor-base-node__toolbar-bridge"
      aria-hidden="true"
    />
  </div>

  <!-- Label area — outside the card, below it, like n8n -->
  <div class="sailor-base-node__label-area" @dblclick.stop="startEditingId">
    <slot name="label">
      <div v-if="props.title || props.description || props.subtitle" class="sailor-base-node__label">
        <BaseInput
          v-if="isEditingId"
          ref="idInputRef"
          v-model="editedId"
          class="sailor-base-node__label-input"
          @blur="commitIdChange"
          @keydown.enter="commitIdChange"
          @keydown.esc="cancelIdChange"
          @click.stop
        />
        <span v-else class="sailor-base-node__label-title" :title="props.title">
          {{ props.title }}
        </span>
        <span v-if="props.description || props.subtitle" class="sailor-base-node__label-subtitle">
          {{ props.description || props.subtitle }}
        </span>
      </div>
    </slot>
  </div>
</template>

<style scoped>
/* ─── Shell ──────────────────────────────────────────────────── */
.sailor-base-node {
  position: relative;
  width: 100px;
  height: 100px;
  background-color: var(--sailor-node-body);
  background-image: linear-gradient(var(--node-tint, transparent), var(--node-tint, transparent));
  border: 2px solid var(--node-custom-border, var(--sailor-node-border));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  overflow: visible;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}

.sailor-base-node.is-rounded-sm {
  border-radius: 4px;
}

.sailor-base-node.is-rounded-md {
  border-radius: 8px;
}

.sailor-base-node.is-rounded-lg {
  border-radius: 16px;
}

.sailor-base-node.is-rounded-full {
  border-radius: 9999px;
}

.sailor-base-node.is-border-dashed {
  border-style: dashed;
}

.sailor-base-node:hover {
  border-color: color-mix(in srgb, var(--node-custom-border, var(--sailor-node-selected)) 80%, var(--sailor-text-primary) 20%);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
}

/* ─── Selection & execution status borders ──────────────────── */
.sailor-base-node.is-selected {
  border-color: color-mix(in srgb, var(--node-custom-border, var(--sailor-node-border)) 80%, var(--sailor-text-primary) 20%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 3px color-mix(in srgb, var(--node-custom-border, var(--sailor-node-border)) 50%, transparent);
}

.sailor-base-node.is-running {
  border-color: var(--sailor-amber-400);
}

.sailor-base-node.is-waiting {
  border-color: var(--sailor-purple-400, #8b5cf6);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 3px rgba(139, 92, 246, 0.2);
  --node-shimmer-color: rgba(139, 92, 246, 0.18);
}

.sailor-base-node.is-retrying {
  border-color: var(--sailor-purple-400, #8b5cf6);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 3px rgba(139, 92, 246, 0.22);
  --node-shimmer-color: rgba(139, 92, 246, 0.24);
}

.sailor-base-node.is-success {
  border-color: var(--sailor-green-400);
}

.sailor-base-node.is-failed {
  border-color: var(--sailor-red-400);
}

.sailor-base-node.is-disabled {
  opacity: 0.45;
  filter: grayscale(0.8) brightness(0.65);
}

/* ─── Icon area ─────────────────────────────────────────────── */
.sailor-base-node__icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sailor-base-node__icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  flex-shrink: 0;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── Extra body slot (e.g. trigger details) ─────────────────── */
.sailor-base-node__body {
  width: 100%;
}

.sailor-base-node__handlers {
  position: absolute;
  display: grid;
  align-items: start;
  justify-items: center;
  pointer-events: all;
}

.sailor-base-node__handlers.is-position-top,
.sailor-base-node__handlers.is-position-bottom {
  left: 0;
  width: 100%;
  height: 0;
  grid-template-columns: repeat(var(--handler-count), minmax(0, 1fr));
}

.sailor-base-node__handlers.is-position-top {
  top: 0;
}

.sailor-base-node__handlers.is-position-bottom {
  bottom: 0;
}

.sailor-base-node__handlers.is-position-left,
.sailor-base-node__handlers.is-position-right {
  top: 0;
  width: 0;
  height: 100%;
  grid-template-rows: repeat(var(--handler-count), minmax(0, 1fr));
}

.sailor-base-node__handlers.is-position-left {
  left: 0;
}

.sailor-base-node__handlers.is-position-right {
  right: 0;
}

.sailor-base-node__handler {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  color: var(--sailor-text-muted);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.sailor-base-node__handler > span {
  position: absolute;
  top: 18px;
  width: 76px;
  pointer-events: none;
}

.sailor-base-node__handler :deep(.sailor-base-handle) {
  position: absolute !important;
  margin: 0;
  pointer-events: all;
}

.sailor-base-node__handlers.is-position-top .sailor-base-node__handler :deep(.sailor-base-handle),
.sailor-base-node__handlers.is-position-bottom .sailor-base-node__handler :deep(.sailor-base-handle) {
  top: 0 !important;
  right: auto !important;
  bottom: auto !important;
  left: 50% !important;
}

.sailor-base-node__handlers.is-position-left .sailor-base-node__handler :deep(.sailor-base-handle),
.sailor-base-node__handlers.is-position-right .sailor-base-node__handler :deep(.sailor-base-handle) {
  top: 50% !important;
  right: auto !important;
  bottom: auto !important;
  left: 0 !important;
}

.sailor-base-node__handler :deep(.qab-wrap--down) {
  position: absolute;
  top: 12px;
}

/* ─── Label (below card, outside the node box) ──────────────── */
.sailor-base-node__label-area {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: text;
  pointer-events: all;
}

.sailor-base-node__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.sailor-base-node__label-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--sailor-text-primary);
  line-height: 1.3;
  word-break: break-word;
  white-space: normal;
  text-align: center;
  max-width: 140px;
}

.sailor-base-node__label-subtitle {
  font-size: 11px;
  color: var(--sailor-text-muted);
  text-align: center;
}

.sailor-base-node__label-input {
  width: 120px;
}

.sailor-base-node__label-input :deep(.base-input-container) {
  background: var(--sailor-node-body);
  border-color: var(--sailor-node-selected);
}

.sailor-base-node__label-input :deep(.base-input) {
  height: 24px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  padding: 2px 4px;
}

/* ─── Toolbar hover via CSS ──────────────────────────────────── */
.sailor-base-node:hover :deep(.nt-toolbar) {
  opacity: 1;
  pointer-events: auto;
}

/* ─── Toolbar gap bridge ─────────────────────────────────────── */
.sailor-base-node__toolbar-bridge {
  position: absolute;
  top: -40px;
  left: 0;
  right: 0;
  height: 40px;
}

/* ─── Quick Add Node (n8n style) ─────────────────────────────── */
.sailor-base-node__quick-add {
  position: absolute;
  top: 50%;
  right: -82px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  z-index: 5000;
  pointer-events: all;
}

.sailor-base-node__quick-add-cable {
  width: 60px;
  height: 2px;
  background-color: var(--sailor-node-handle);
  transition: background-color 0.2s;
}

.sailor-base-node__quick-add-btn {
  border-radius: var(--sailor-radius-sm);
  background-color: var(--sailor-node-border);
  border: 2px solid var(--sailor-border-strong);
  color: var(--sailor-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 19px;
  height: 19px;
  transition: all 0.2s;
}
</style>
