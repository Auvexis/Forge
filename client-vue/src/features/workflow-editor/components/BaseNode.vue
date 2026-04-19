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

const props = defineProps<{
  id?: string

  title?: string
  subtitle?: string
  icon?: string
  color?: string
  bg?: string
  badgeText?: string

  hasTarget?: boolean
  hasSource?: boolean

  selected?: boolean
  status?: 'idle' | 'running' | 'success' | 'failed'
}>()

const executionStore = useExecutionStore()
const workflowStore = useWorkflowStore()
const panelStore = useAppPanelStore()

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

// Execution store status takes priority over the prop so every node reflects
// live SSE status automatically without changes in individual node components.
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

// Toolbar is always visible when the node is selected (JS-driven).
// Hover-based visibility is handled purely via CSS :hover so the browser's
// native hover detection covers the node, the gap bridge AND the toolbar
// itself — no JavaScript timers or event-listener races needed.
const showToolbar = computed(() => !!props.id && props.id !== 'trigger' && !!props.selected)
</script>

<template>
  <div class="nod8-base-node" :class="[{ 'is-selected': selected }, statusClasses]">
    <!-- Shimmer overlay while running -->
    <NodeShimmer v-if="effectiveStatus === 'running'" />

    <!-- Floating ID badge above the node -->
    <div v-if="props.id || $slots.badge" class="nod8-base-node__id-badge" @click.stop>
      <slot name="badge">
        <span
          v-if="effectiveStatus !== 'idle' && !isEditingId"
          class="nod8-base-node__id-dot"
          :class="`is-${effectiveStatus}`"
        />

        <input
          v-if="isEditingId"
          ref="idInputRef"
          v-model="editedId"
          class="nod8-base-node__id-input"
          @blur="commitIdChange"
          @keydown.enter="commitIdChange"
          @keydown.esc="cancelIdChange"
        />
        <span
          v-else
          class="nod8-base-node__id-text"
          title="Duplo clique para editar o ID"
          @dblclick.stop="startEditingId"
        >
          {{ props.id }}
        </span>
      </slot>
    </div>

    <!-- HEADER -->
    <template v-if="props.title || $slots.header">
      <div class="nod8-base-node__header">
        <slot name="header">
          <div
            v-if="props.icon"
            class="nod8-base-node__icon-box"
            :style="{ color: props.color, backgroundColor: props.bg }"
          >
            <LucideIcon :name="props.icon" :size="16" />
          </div>

          <div class="nod8-base-node__title-box">
            <div class="nod8-base-node__title-row">
              <span class="nod8-base-node__title" :title="props.title">{{ props.title }}</span>

              <span
                v-if="props.badgeText"
                class="nod8-base-node__tag"
                :style="{ color: props.color, backgroundColor: props.bg }"
              >
                {{ props.badgeText }}
              </span>

              <!-- Pulsing dot in the header row -->
              <span
                v-if="effectiveStatus !== 'idle'"
                class="nod8-base-node__status-dot"
                :class="`is-${effectiveStatus}`"
              ></span>
            </div>

            <span v-if="props.subtitle" class="nod8-base-node__subtitle">{{ props.subtitle }}</span>
          </div>
        </slot>
      </div>
    </template>

    <!-- BODY -->
    <div class="nod8-base-node__content">
      <slot></slot>
    </div>

    <!-- AUTO HANDLES -->
    <BaseHandle v-if="props.hasTarget" id="target" type="target" :position="Position.Left" />
    <BaseHandle v-if="props.hasSource" id="source" type="source" :position="Position.Right" />

    <!-- Toolbar: JS-visible when selected; CSS-visible on :hover (see styles below) -->
    <NodeToolbar
      v-if="props.id && props.id !== 'trigger'"
      :node-id="props.id"
      :visible="showToolbar"
    />

    <!--
      Invisible bridge that fills the gap between the node's bottom border
      and the toolbar positioned 40 px below.  Because this div IS a DOM
      descendant, the browser keeps .nod8-base-node:hover true while the
      cursor traverses the gap — so the CSS :hover rule below never drops
      out, eliminating the flicker without any JS timers.
    -->
    <div
      v-if="props.id && props.id !== 'trigger'"
      class="nod8-base-node__toolbar-bridge"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
/* ─── Shell ──────────────────────────────────────────────────── */
.nod8-base-node {
  position: relative;
  min-width: 240px;
  max-width: 340px;
  background-color: var(--nod8-node-body);
  border: 1px solid var(--nod8-node-border);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  overflow: visible;
  border-radius: var(--nod8-radius-md);
  display: flex;
  flex-direction: column;
  box-shadow: none;
}

.nod8-base-node:hover {
  border-color: var(--nod8-node-selected);
}

.nod8-base-node:hover .nod8-base-node__id-badge {
  border-color: var(--nod8-node-selected);
}

/* ─── Selection & execution status borders ───────────────────── */
.nod8-base-node.is-selected {
  border-color: var(--nod8-node-selected);
}

.nod8-base-node.is-selected .nod8-base-node__id-badge {
  border-color: var(--nod8-node-selected);
}

/* Running — amber */
.nod8-base-node.is-running {
  border-color: var(--nod8-amber-400);
}

.nod8-base-node.is-running .nod8-base-node__id-badge {
  border-color: var(--nod8-amber-400);
}

/* Success — green */
.nod8-base-node.is-success {
  border-color: var(--nod8-green-400);
}

.nod8-base-node.is-success .nod8-base-node__id-badge {
  border-color: var(--nod8-green-400);
}

/* Failed — red */
.nod8-base-node.is-failed {
  border-color: var(--nod8-red-400);
}

.nod8-base-node.is-failed .nod8-base-node__id-badge {
  border-color: var(--nod8-red-400);
}

/* ─── ID badge ───────────────────────────────────────────────── */
.nod8-base-node__id-badge {
  position: absolute;
  top: -22.5px;
  left: 12px;
  background-color: var(--nod8-node-header);
  border: 1px solid var(--nod8-node-border);
  border-bottom: none !important;
  border-radius: 4px 4px 0 0;
  padding: 2px 6px;
  font-family: var(--nod8-font-mono);
  font-size: 11px;
  color: var(--nod8-text-muted);
  z-index: 10;
  cursor: text;
  transition: color 0.15s;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: none;
}

.nod8-base-node__id-badge:hover {
  color: var(--nod8-text-primary);
}

.nod8-base-node__id-input {
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: inherit;
  color: var(--nod8-text-primary);
  width: 90px;
  padding: 0;
  margin: 0;
}

.nod8-base-node__id-text {
  cursor: text;
}

/* Status dot inside the ID badge */
.nod8-base-node__id-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.nod8-base-node__id-dot.is-running {
  background-color: var(--nod8-amber-400);
  animation: badge-pulse 1.5s ease-in-out infinite;
}

.nod8-base-node__id-dot.is-success {
  background-color: var(--nod8-green-400);
}

.nod8-base-node__id-dot.is-failed {
  background-color: var(--nod8-red-400);
}

@keyframes badge-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

/* ─── Header ─────────────────────────────────────────────────── */
.nod8-base-node__header {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-3);
  background-color: var(--nod8-node-header);
  border-bottom: 1px solid var(--nod8-border);
  border-radius: calc(var(--nod8-radius-md) - 1px) calc(var(--nod8-radius-md) - 1px) 0 0;
}

.nod8-base-node__icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.nod8-base-node__title-box {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.nod8-base-node__title-row {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
}

.nod8-base-node__title {
  font-size: 14px;
  font-weight: 500;
  color: var(--nod8-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nod8-base-node__tag {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 600;
  flex-shrink: 0;
}

.nod8-base-node__subtitle {
  font-size: 12px;
  color: var(--nod8-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Status dot (header row) ────────────────────────────────── */
.nod8-base-node__status-dot {
  display: block;
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.nod8-base-node__status-dot.is-running {
  background-color: var(--nod8-amber-400);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.nod8-base-node__status-dot.is-success {
  background-color: var(--nod8-green-400);
}

.nod8-base-node__status-dot.is-failed {
  background-color: var(--nod8-red-400);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ─── Body ───────────────────────────────────────────────────── */
.nod8-base-node__content {
  display: flex;
  flex-direction: column;
  padding: var(--nod8-space-3);
  gap: var(--nod8-space-2);
}

/* ─── Toolbar hover via CSS ──────────────────────────────────── */
/*
  Using CSS :hover instead of JS mouseleave/mouseenter because:

  - The browser keeps an element :hover when the cursor is over ANY
    descendant (even absolutely-positioned ones).
  - The bridge div below this node fills the gap between the node's
    bottom edge and the toolbar, so :hover stays true while the cursor
    traverses that gap.
  - The toolbar itself is also a descendant, so hovering over its
    buttons keeps :hover true — no JS timers, no pointer-events races.

  The :deep() combinator pierces the component boundary so we can
  style .nt-toolbar inside NodeToolbar from here.
*/
.nod8-base-node:hover :deep(.nt-toolbar) {
  opacity: 1;
  pointer-events: auto;
}

/* ─── Toolbar gap bridge ─────────────────────────────────────── */
/*
  Transparent child that fills the visual gap so :hover never drops
  while the cursor moves from the node card down to the toolbar.
*/
.nod8-base-node__toolbar-bridge {
  position: absolute;
  bottom: -40px; /* matches .nt-toolbar bottom value */
  left: 0;
  right: 0;
  height: 40px;
}
</style>
