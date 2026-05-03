<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { Position } from '@vue-flow/core'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseHandle from './BaseHandle.vue'
import NodeShimmer from './nodes/NodeShimmer.vue'
import NodeToolbar from './nodes/NodeToolbar.vue'
import { useExecutionStore } from '@/features/workflow-editor/stores/execution.store'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import { useAppPanelStore } from '@/shared/stores/app-panel.store'
import { useEventBus } from '@/shared/composables/useEventBus'

const props = defineProps<{
  id?: string

  title?: string
  subtitle?: string
  icon?: string
  color?: string
  bg?: string
  borderColor?: string
  badgeText?: string

  hasTarget?: boolean
  hasSource?: boolean

  selected?: boolean
  status?: 'idle' | 'running' | 'success' | 'failed'
}>()

const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()
const panelStore = useAppPanelStore()
const quickAddBus = useEventBus('node:quick-add')

const isEditingId = ref(false)
const editedId = ref('')
const idInputRef = ref<HTMLInputElement | null>(null)

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
    alert('ID Conflict: A node with this ID already exists.')
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

const effectiveStatus = computed<'idle' | 'running' | 'success' | 'failed'>(() => {
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

const hasOutgoingConnection = computed(() => {
  if (!props.id) return false
  if (!workflowStore.activeWorkflow) return false
  return workflowStore.activeWorkflow.edges.some((e) => e.source === props.id)
})

const onQuickAdd = () => {
  if (props.id) {
    quickAddBus.emit({ sourceId: props.id })
  }
}
</script>

<template>
  <div class="nod8-base-node" :class="[{ 'is-selected': selected }, statusClasses]" :style="{ '--node-tint': props.bg, '--node-custom-border': props.borderColor }">
    <!-- Shimmer overlay while running -->
    <NodeShimmer v-if="effectiveStatus === 'running'" />

    <!-- Icon area (center of card) -->
    <div class="nod8-base-node__icon-wrap">
      <slot name="icon">
        <div
          v-if="props.icon"
          class="nod8-base-node__icon-box"
          :style="{ color: props.color }"
        >
          <LucideIcon :name="props.icon" :size="48" />
        </div>
      </slot>

      <!-- Success/Error checkmark overlay -->
      <div
        v-if="effectiveStatus === 'success'"
        class="nod8-base-node__status-badge nod8-base-node__status-badge--success"
      >
        <LucideIcon name="check" :size="10" />
      </div>
      <div
        v-else-if="effectiveStatus === 'failed'"
        class="nod8-base-node__status-badge nod8-base-node__status-badge--error"
      >
        <LucideIcon name="x" :size="10" />
      </div>
      <div
        v-else-if="effectiveStatus === 'running'"
        class="nod8-base-node__status-badge nod8-base-node__status-badge--running"
      >
        <LucideIcon name="loader-2" :size="10" class="spin" />
      </div>
    </div>

    <!-- Custom slot content (if any) -->
    <div v-if="$slots.default" class="nod8-base-node__body">
      <slot />
    </div>

    <!-- AUTO HANDLES -->
    <BaseHandle v-if="props.hasTarget" id="target" type="target" :position="Position.Left" />
    <BaseHandle v-if="props.hasSource" id="source" type="source" :position="Position.Right" />

    <!-- Quick Add Cable (n8n style) -->
    <div
      v-if="props.hasSource && !hasOutgoingConnection && props.id"
      class="nod8-base-node__quick-add"
      title="Adicionar node conectado"
      @click.stop="onQuickAdd"
    >
      <div class="nod8-base-node__quick-add-cable"></div>
      <button class="nod8-base-node__quick-add-btn">
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
      class="nod8-base-node__toolbar-bridge"
      aria-hidden="true"
    />
  </div>

  <!-- Label area — outside the card, below it, like n8n -->
  <div class="nod8-base-node__label-area" @dblclick.stop="startEditingId">
    <slot name="label">
      <div v-if="props.title || props.subtitle" class="nod8-base-node__label">
        <input
          v-if="isEditingId"
          ref="idInputRef"
          v-model="editedId"
          class="nod8-base-node__label-input"
          @blur="commitIdChange"
          @keydown.enter="commitIdChange"
          @keydown.esc="cancelIdChange"
          @click.stop
        />
        <span v-else class="nod8-base-node__label-title" :title="props.title">
          {{ props.title }}
        </span>
        <span v-if="props.subtitle" class="nod8-base-node__label-subtitle">
          {{ props.subtitle }}
        </span>
      </div>
    </slot>
  </div>
</template>

<style scoped>
/* ─── Shell ──────────────────────────────────────────────────── */
.nod8-base-node {
  position: relative;
  width: 100px;
  height: 100px;
  background-color: var(--nod8-node-body);
  background-image: linear-gradient(var(--node-tint, transparent), var(--node-tint, transparent));
  border: 2px solid var(--node-custom-border, var(--nod8-node-border));
  border-radius: 16px;
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

.nod8-base-node:hover {
  border-color: color-mix(in srgb, var(--node-custom-border, var(--nod8-node-selected)) 150%, white 30%);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
}

/* ─── Selection & execution status borders ──────────────────── */
.nod8-base-node.is-selected {
  border-color: var(--nod8-green-400);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--nod8-green-400) 25%, transparent);
}

.nod8-base-node.is-running {
  border-color: var(--nod8-amber-400);
}

.nod8-base-node.is-success {
  border-color: var(--nod8-green-400);
}

.nod8-base-node.is-failed {
  border-color: var(--nod8-red-400);
}

/* ─── Icon area ─────────────────────────────────────────────── */
.nod8-base-node__icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nod8-base-node__icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  flex-shrink: 0;
}

/* ─── Status badge (bottom-left of icon) ────────────────────── */
.nod8-base-node__status-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--nod8-node-body);
}

.nod8-base-node__status-badge--success {
  background-color: var(--nod8-green-400);
  color: #000;
}

.nod8-base-node__status-badge--error {
  background-color: var(--nod8-red-400);
  color: #fff;
}

.nod8-base-node__status-badge--running {
  background-color: var(--nod8-amber-400);
  color: #000;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── Extra body slot (e.g. trigger details) ─────────────────── */
.nod8-base-node__body {
  width: 100%;
}

/* ─── Label (below card, outside the node box) ──────────────── */
.nod8-base-node__label-area {
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

.nod8-base-node__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.nod8-base-node__label-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--nod8-text-primary);
  line-height: 1.3;
  word-break: break-word;
  white-space: normal;
  text-align: center;
  max-width: 140px;
}

.nod8-base-node__label-subtitle {
  font-size: 11px;
  color: var(--nod8-text-muted);
  text-align: center;
}

.nod8-base-node__label-input {
  background: var(--nod8-node-body);
  border: 1px solid var(--nod8-node-selected);
  border-radius: 4px;
  outline: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--nod8-text-primary);
  width: 120px;
  text-align: center;
  padding: 2px 4px;
}

/* ─── Toolbar hover via CSS ──────────────────────────────────── */
.nod8-base-node:hover :deep(.nt-toolbar) {
  opacity: 1;
  pointer-events: auto;
}

/* ─── Toolbar gap bridge ─────────────────────────────────────── */
.nod8-base-node__toolbar-bridge {
  position: absolute;
  top: -40px;
  left: 0;
  right: 0;
  height: 40px;
}

/* ─── Quick Add Node (n8n style) ─────────────────────────────── */
.nod8-base-node__quick-add {
  position: absolute;
  top: 50%;
  right: -82px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  z-index: 5;
}

.nod8-base-node__quick-add-cable {
  width: 60px;
  height: 2px;
  background-color: var(--nod8-node-handle);
  transition: background-color 0.2s;
}

.nod8-base-node__quick-add-btn {
  border-radius: var(--nod8-radius-full);
  background-color: var(--nod8-node-handle);
  border: none;
  color: var(--nod8-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 2px;
  transition: all 0.2s ease;
}

.nod8-base-node__quick-add:hover .nod8-base-node__quick-add-cable,
.nod8-base-node__quick-add:hover .nod8-base-node__quick-add-btn {
  background-color: var(--nod8-node-handle-hover);
}
</style>
