<template>
  <g
    class="fabric-workflow-edge"
    :class="[`fabric-workflow-edge--${status}`, { 'fabric-workflow-edge--selected': selected }]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dblclick.stop="startEditLabel"
  >
    <path
      class="fabric-workflow-edge__path"
      :d="path"
      :style="pathStyle"
      fill="none"
      :marker-end="markerEnd"
    />

    <foreignObject
      v-if="!isConfigurationEdge"
      class="fabric-edge-toolbar-object"
      :x="labelX - 36"
      :y="labelY - 54"
      width="72"
      height="32"
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        class="fabric-edge-toolbar"
        :class="{ 'fabric-edge-toolbar--visible': isHovered || selected }"
      >
        <button class="fabric-edge-btn" type="button" title="Insert node here" @click.stop="onQuickAdd">
          <LucideIcon name="plus" :size="13" />
        </button>
        <button class="fabric-edge-btn fabric-edge-btn--danger" type="button" title="Delete connection" @click.stop="onDelete">
          <LucideIcon name="trash" :size="13" />
        </button>
      </div>
    </foreignObject>

    <foreignObject
      v-if="itemCountLabel"
      class="fabric-edge-item-count-object"
      :x="labelX - 50"
      :y="labelY - 76"
      width="100"
      height="18"
    >
      <div xmlns="http://www.w3.org/1999/xhtml" class="fabric-edge-item-count">
        {{ itemCountLabel }}
      </div>
    </foreignObject>

    <foreignObject
      v-if="edgeLabel || isEditingLabel"
      class="fabric-edge-label-object"
      :x="labelX - 58"
      :y="labelY - 12"
      width="116"
      height="28"
    >
      <div xmlns="http://www.w3.org/1999/xhtml" class="fabric-edge-label-shell" @dblclick.stop="startEditLabel">
        <input
          v-if="isEditingLabel"
          ref="labelInputRef"
          v-model="labelDraft"
          class="fabric-edge-label-input"
          placeholder="Label..."
          @keydown.enter.stop="commitLabel"
          @keydown.escape.stop="cancelLabel"
          @blur="commitLabel"
        />
        <span v-else class="fabric-edge-label">{{ edgeLabel }}</span>
      </div>
    </foreignObject>
  </g>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { workflowEdgeStrokeFor } from '../workflow-canvas/workflowCanvasEdges'

const props = defineProps<{
  edgeId: string
  path: string
  labelX: number
  labelY: number
  status: string
  selected?: boolean
  label?: string
  itemCountLabel?: string
  isConfigurationEdge?: boolean
}>()

const emit = defineEmits<{
  delete: [edgeId: string]
  quickAdd: [edgeId: string, event: MouseEvent]
  updateLabel: [edgeId: string, label: string]
}>()

const isHovered = ref(false)
const isEditingLabel = ref(false)
const labelDraft = ref('')
const labelInputRef = ref<HTMLInputElement | null>(null)

const edgeLabel = computed(() => props.label?.trim() ?? '')

const pathStyle = computed(() => {
  const style: Record<string, string | number> = {
    stroke: workflowEdgeStrokeFor(props.status, props.selected === true),
    strokeWidth: props.status !== 'idle' || props.selected ? 3 : 2,
    transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
  }

  if (props.isConfigurationEdge) {
    style.strokeDasharray = '6 6'
    style.strokeLinecap = 'round'
  }

  return style
})

const markerEnd = computed(() => {
  if (props.selected) return 'url(#fabric-workflow-arrow-selected)'
  const markerStatus = ['success', 'failed', 'running', 'waiting', 'retrying'].includes(props.status)
    ? props.status
    : 'idle'
  return `url(#fabric-workflow-arrow-${markerStatus})`
})

function onDelete() {
  emit('delete', props.edgeId)
}

function onQuickAdd(event: MouseEvent) {
  emit('quickAdd', props.edgeId, event)
}

function startEditLabel() {
  labelDraft.value = props.label ?? ''
  isEditingLabel.value = true
  nextTick(() => labelInputRef.value?.focus())
}

function commitLabel() {
  if (!isEditingLabel.value) return
  isEditingLabel.value = false
  emit('updateLabel', props.edgeId, labelDraft.value.trim())
}

function cancelLabel() {
  isEditingLabel.value = false
}
</script>

<style scoped>
.fabric-workflow-edge {
  pointer-events: none;
}

.fabric-workflow-edge__path {
  pointer-events: stroke;
  cursor: pointer;
}

.fabric-edge-toolbar-object,
.fabric-edge-label-object {
  overflow: visible;
  pointer-events: auto;
}

.fabric-edge-item-count-object {
  overflow: visible;
  pointer-events: none;
}

.fabric-edge-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.fabric-edge-toolbar--visible {
  opacity: 1;
}

.fabric-edge-btn {
  background: var(--fabric-bg-surface);
  border: 1px solid var(--fabric-border-subtle);
  border-radius: var(--fabric-radius-xs, 3px);
  color: var(--fabric-text-muted);
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.fabric-edge-btn:hover {
  background: var(--fabric-bg-elevated);
  color: var(--fabric-text-primary);
}

.fabric-edge-btn--danger:hover {
  background: color-mix(in srgb, var(--fabric-red-500, #ef4444) 15%, transparent);
  color: var(--fabric-red-500, #ef4444);
}

.fabric-edge-item-count {
  color: var(--fabric-text-muted);
  font-family: var(--fabric-font-mono);
  font-size: 10px;
  line-height: 18px;
  text-align: center;
  white-space: nowrap;
}

.fabric-edge-label-shell {
  display: flex;
  justify-content: center;
}

.fabric-edge-label {
  display: inline-flex;
  max-width: 112px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  color: var(--fabric-text-secondary);
  background: var(--fabric-bg-surface);
  border: 1px solid var(--fabric-border-subtle);
  border-radius: var(--fabric-radius-xs, 3px);
  padding: 4px 8px;
}

.fabric-edge-label-input {
  background: var(--fabric-bg-base);
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-xs, 3px);
  color: var(--fabric-text-primary);
  font-size: 12px;
  height: 22px;
  padding: 0 6px;
  width: 100px;
  outline: none;
}

.fabric-edge-label-input:focus {
  border-color: var(--fabric-accent);
}
</style>
