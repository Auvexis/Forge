<script setup lang="ts">
import { computed, inject, ref, nextTick, watch } from 'vue'
import { Position } from './nodePresentation.types'
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
import BaseBadge from '@/shared/components/base/BaseBadge.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import { useExecutionStore } from '@/features/workflow-editor/stores/execution.store'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import { useAppPanelStore } from '@/shared/stores/app-panel.store'
import { useEventBus } from '@/shared/composables/useEventBus'
import { useToast } from '@/shared/composables/useToast'
import { isWorkflowBaseCanvasHandleModeKey } from '../workflow-canvas/workflowCanvasHandles'

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
  defaultRounded?: NodeRounding
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
const isWorkflowBaseCanvasHandleMode = inject(isWorkflowBaseCanvasHandleModeKey, false)

const allEdges = computed(() => [
  ...(workflowStore.activeWorkflow?.edges ?? []),
])

const positionBySide = {
  top: Position.Top,
  left: Position.Left,
  bottom: Position.Bottom,
  right: Position.Right,
} as const

const isConnectedAsAdvancedSubnode = computed(() => {
  if (!props.id) return false
  return allEdges.value.some(
    (edge) => edge.source === props.id && (edge.targetHandle ?? 'target') !== 'target',
  )
})

const effectiveHasTarget = computed(() => !!props.hasTarget && !isConnectedAsAdvancedSubnode.value)
const effectiveHasSource = computed(() => !!props.hasSource || isConnectedAsAdvancedSubnode.value)
const effectiveInputPosition = computed(() => positionBySide[props.inputPosition ?? 'left'])
const effectiveOutputPosition = computed(() =>
  isConnectedAsAdvancedSubnode.value ? Position.Top : positionBySide[props.outputPosition ?? 'right'],
)
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
    target: effectiveHasTarget.value ? effectiveInputPosition.value : null,
    source: effectiveHasSource.value ? effectiveOutputPosition.value : null,
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
  if (isWorkflowBaseCanvasHandleMode) return
  await nextTick()
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

const effectiveRounded = computed(() =>
  props.rounded ?? (isConnectedAsAdvancedSubnode.value ? 'full' : props.defaultRounded ?? 'lg'),
)

const onQuickAdd = (event: MouseEvent) => {
  if (props.id) {
    const anchorRect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    quickAddBus.emit({ sourceId: props.id, clientX: event.clientX, clientY: event.clientY, anchorRect })
  }
}
</script>

<template>
  <div 
    class="fabric-base-node fabric-node-pop-in"
    :class="[
      { 'is-selected': selected, 'is-disabled': isDisabled },
      statusClasses,
      `is-rounded-${effectiveRounded}`,
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
    <div class="fabric-base-node__icon-wrap">
      <slot name="icon">
        <div
          v-if="props.iconLeft || props.icon"
          class="fabric-base-node__icon-box"
          :style="{ color: props.color }"
        >
          <LucideIcon :name="props.iconLeft || props.icon || 'box'" :size="48" />
        </div>
      </slot>
    </div>

    <!-- Custom slot content (if any) -->
    <div v-if="$slots.default" class="fabric-base-node__body">
      <slot />
    </div>

    <!-- AUTO HANDLES -->
    <BaseHandle v-if="effectiveHasTarget" id="target" type="target" :position="effectiveInputPosition" />
    <BaseHandle v-if="effectiveHasSource" id="source" type="source" :position="effectiveOutputPosition" />

    <div
      v-for="side in handlerSides"
      :key="side.position"
      class="fabric-base-node__handlers"
      :class="`is-position-${side.position}`"
      :style="{ '--handler-count': side.handlers.length }"
    >
      <div
        v-for="handler in side.handlers"
        :key="handler.id"
        class="fabric-base-node__handler"
      >
        <BaseHandle
          :id="handler.id"
          :type="handler.type"
          :position="handler.position"
          :variant="handler.style ?? 'circle'"
        />
        <BaseBadge
          v-if="handler.label"
          class="fabric-base-node__handler-label"
          variant="default"
          size="sm"
        >
          {{ handler.label }}<span v-if="handler.required" class="fabric-base-node__handler-required">*</span>
        </BaseBadge>
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
      v-if="props.hasSource && !isConnectedAsAdvancedSubnode && !hasOutgoingConnection && props.id"
      class="fabric-base-node__quick-add"
      title="Add connected node"
      @click.stop="onQuickAdd"
      @dblclick.stop.prevent
      @pointerdown.stop
    >
      <div class="fabric-base-node__quick-add-cable"></div>
      <button class="fabric-base-node__quick-add-btn" type="button">
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
      class="fabric-base-node__toolbar-bridge"
      aria-hidden="true"
    />
  </div>

  <!-- Label area — outside the card, below it, like n8n -->
  <div class="fabric-base-node__label-area" @dblclick.stop="startEditingId">
    <slot name="label">
      <div v-if="props.title || props.description || props.subtitle" class="fabric-base-node__label">
        <BaseInput
          v-if="isEditingId"
          ref="idInputRef"
          v-model="editedId"
          class="fabric-base-node__label-input"
          @blur="commitIdChange"
          @keydown.enter="commitIdChange"
          @keydown.esc="cancelIdChange"
          @click.stop
        />
        <span v-else class="fabric-base-node__label-title" :title="props.title">
          {{ props.title }}
        </span>
        <span v-if="props.description || props.subtitle" class="fabric-base-node__label-subtitle">
          {{ props.description || props.subtitle }}
        </span>
      </div>
    </slot>
  </div>
</template>

<style scoped>
/* ─── Shell ──────────────────────────────────────────────────── */
.fabric-base-node {
  position: relative;
  width: 100px;
  height: 100px;
  background-color: var(--fabric-workflow-node-bg);
  background-image: linear-gradient(var(--node-tint, transparent), var(--node-tint, transparent));
  border: 2px solid var(--node-custom-border, var(--fabric-workflow-node-border));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  overflow: visible;
  box-shadow: var(--fabric-workflow-node-shadow, 0 4px 16px rgba(0, 0, 0, 0.4));
  cursor: pointer;
  user-select: none;
  -webkit-user-drag: none;
}

.fabric-base-node :deep(img),
.fabric-base-node :deep(svg) {
  -webkit-user-drag: none;
}

.fabric-base-node.is-rounded-sm {
  border-radius: 4px;
}

.fabric-base-node.is-rounded-md {
  border-radius: 8px;
}

.fabric-base-node.is-rounded-lg {
  border-radius: 16px;
}

.fabric-base-node.is-rounded-full {
  border-radius: 9999px;
}

.fabric-base-node.is-border-dashed {
  border-style: dashed;
}

.fabric-base-node:hover {
  border-color: color-mix(in srgb, var(--node-custom-border, var(--fabric-workflow-node-hover-border)) 80%, var(--fabric-base-node-text-primary) 20%);
  box-shadow: var(--fabric-workflow-node-hover-shadow, 0 4px 24px rgba(0, 0, 0, 0.5));
}

/* ─── Selection & execution status borders ──────────────────── */
.fabric-base-node.is-selected {
  border-color: color-mix(in srgb, var(--node-custom-border, var(--fabric-workflow-node-selected-border)) 80%, var(--fabric-base-node-text-primary) 20%);
  box-shadow: var(--fabric-workflow-node-selected-shadow, 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 4px color-mix(in srgb, var(--node-custom-border, var(--fabric-node-border)) 50%, transparent));
}

.fabric-base-node.is-running {
  border-color: var(--fabric-workflow-node-running-border);
}

.fabric-base-node.is-waiting {
  border-color: var(--fabric-workflow-node-waiting-border, var(--fabric-purple-400, #8b5cf6));
  box-shadow: var(--fabric-workflow-node-waiting-shadow, 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 3px rgba(139, 92, 246, 0.2));
  --node-shimmer-color: var(--fabric-workflow-node-waiting-shimmer, rgba(139, 92, 246, 0.18));
}

.fabric-base-node.is-retrying {
  border-color: var(--fabric-workflow-node-retrying-border, var(--fabric-purple-400, #8b5cf6));
  box-shadow: var(--fabric-workflow-node-retrying-shadow, 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 3px rgba(139, 92, 246, 0.22));
  --node-shimmer-color: var(--fabric-workflow-node-retrying-shimmer, rgba(139, 92, 246, 0.24));
}

.fabric-base-node.is-success {
  border-color: var(--fabric-workflow-node-success-border);
}

.fabric-base-node.is-failed {
  border-color: var(--fabric-workflow-node-error-border);
}

.fabric-base-node.is-disabled {
  opacity: 0.45;
  filter: grayscale(0.8) brightness(0.65);
}

/* ─── Icon area ─────────────────────────────────────────────── */
.fabric-base-node__icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fabric-base-node__icon-box {
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
.fabric-base-node__body {
  width: 100%;
}

.fabric-base-node__handlers {
  position: absolute;
  display: grid;
  align-items: start;
  justify-items: center;
  pointer-events: all;
}

.fabric-base-node__handlers.is-position-top,
.fabric-base-node__handlers.is-position-bottom {
  left: 0;
  width: 100%;
  height: 0;
  grid-template-columns: repeat(var(--handler-count), minmax(0, 1fr));
}

.fabric-base-node__handlers.is-position-top {
  top: 0;
}

.fabric-base-node__handlers.is-position-bottom {
  bottom: 0;
}

.fabric-base-node__handlers.is-position-left,
.fabric-base-node__handlers.is-position-right {
  top: 0;
  width: 0;
  height: 100%;
  grid-template-rows: repeat(var(--handler-count), minmax(0, 1fr));
}

.fabric-base-node__handlers.is-position-left {
  left: 0;
}

.fabric-base-node__handlers.is-position-right {
  right: 0;
}

.fabric-base-node__handler {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  color: var(--fabric-base-node-text-muted);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.fabric-base-node__handler-label {
  position: absolute;
  top: 18px;
  left: 50%;
  max-width: 100px;
  box-sizing: border-box;
  overflow: hidden;
  pointer-events: none;
  text-overflow: ellipsis;
  transform: translateX(-50%);
  z-index: 6000;
}

.fabric-base-node__handler-required {
  color: var(--fabric-base-node-red400);
}

.fabric-base-node__handler :deep(.fabric-base-handle) {
  position: absolute !important;
  margin: 0;
  pointer-events: all;
}

.fabric-base-node__handlers.is-position-top .fabric-base-node__handler :deep(.fabric-base-handle),
.fabric-base-node__handlers.is-position-bottom .fabric-base-node__handler :deep(.fabric-base-handle) {
  top: 0 !important;
  right: auto !important;
  bottom: auto !important;
  left: 50% !important;
}

.fabric-base-node__handlers.is-position-left .fabric-base-node__handler :deep(.fabric-base-handle),
.fabric-base-node__handlers.is-position-right .fabric-base-node__handler :deep(.fabric-base-handle) {
  top: 50% !important;
  right: auto !important;
  bottom: auto !important;
  left: 0 !important;
}

.fabric-base-node__handler :deep(.qab-wrap--down) {
  position: absolute;
  top: 8px;
  left: 50%;
  margin-top: 0;
  transform: translateX(-50%);
}

/* ─── Label (below card, outside the node box) ──────────────── */
.fabric-base-node__label-area {
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
  user-select: none;
}

.fabric-base-node__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.fabric-base-node__label-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--fabric-workflow-node-label-text);
  line-height: 1.3;
  word-break: break-word;
  white-space: normal;
  text-align: center;
  max-width: 140px;
}

.fabric-base-node__label-subtitle {
  font-size: 11px;
  color: var(--fabric-workflow-node-label-muted-text);
  text-align: center;
}

.fabric-base-node__label-input {
  width: 120px;
}

.fabric-base-node__label-input :deep(.base-input-container) {
  background: var(--fabric-workflow-node-bg);
  border-color: var(--fabric-workflow-node-selected-border);
}

.fabric-base-node__label-input :deep(.base-input) {
  height: 24px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  padding: 2px 4px;
}

/* ─── Toolbar hover via CSS ──────────────────────────────────── */
.fabric-base-node:hover :deep(.nt-toolbar) {
  opacity: 1;
  pointer-events: auto;
}

/* ─── Toolbar gap bridge ─────────────────────────────────────── */
.fabric-base-node__toolbar-bridge {
  position: absolute;
  top: -40px;
  left: 0;
  right: 0;
  height: 40px;
}

/* ─── Quick Add Node (n8n style) ─────────────────────────────── */
.fabric-base-node__quick-add {
  position: absolute;
  top: 50%;
  right: -82px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  z-index: 5000;
  pointer-events: all;
}

.fabric-base-node__quick-add-cable {
  width: 60px;
  height: 2px;
  background-color: var(--fabric-workflow-handle-bg);
  transition: background-color 0.2s;
}

.fabric-base-node__quick-add-btn {
  border-radius: var(--fabric-radius-sm);
  background-color: var(--fabric-workflow-node-quick-add-bg);
  border: 2px solid var(--fabric-workflow-node-quick-add-border);
  color: var(--fabric-workflow-node-quick-add-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 19px;
  height: 19px;
  transition: all 0.2s;
}
</style>
