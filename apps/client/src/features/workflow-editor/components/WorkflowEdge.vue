<template>
  <g
    class="sailor-workflow-edge"
    :class="[`sailor-workflow-edge--${status}`, { 'sailor-workflow-edge--selected': selected }]"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @dblclick.stop="startEditLabel"
  >
    <path
      class="sailor-workflow-edge__path"
      :d="path"
      :style="pathStyle"
      fill="none"
      :marker-end="markerEnd"
    />

    <foreignObject
      v-if="!isConfigurationEdge"
      class="sailor-edge-toolbar-object"
      :x="labelX - 36"
      :y="labelY - 54"
      width="72"
      height="32"
    >
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        class="sailor-edge-toolbar"
        :class="{ 'sailor-edge-toolbar--visible': isHovered || selected }"
      >
        <button class="sailor-edge-btn" type="button" title="Insert node here" @click.stop="onQuickAdd">
          <LucideIcon name="plus" :size="13" />
        </button>
        <button class="sailor-edge-btn sailor-edge-btn--danger" type="button" title="Delete connection" @click.stop="onDelete">
          <LucideIcon name="trash" :size="13" />
        </button>
      </div>
    </foreignObject>

    <foreignObject
      v-if="itemCountLabel"
      class="sailor-edge-item-count-object"
      :x="labelX - 50"
      :y="labelY - 76"
      width="100"
      height="18"
    >
      <div xmlns="http://www.w3.org/1999/xhtml" class="sailor-edge-item-count">
        {{ itemCountLabel }}
      </div>
    </foreignObject>

    <foreignObject
      v-if="edgeLabel || isEditingLabel"
      class="sailor-edge-label-object"
      :x="labelX - 58"
      :y="labelY - 12"
      width="116"
      height="28"
    >
      <div xmlns="http://www.w3.org/1999/xhtml" class="sailor-edge-label-shell" @dblclick.stop="startEditLabel">
        <input
          v-if="isEditingLabel"
          ref="labelInputRef"
          v-model="labelDraft"
          class="sailor-edge-label-input"
          placeholder="Label..."
          @keydown.enter.stop="commitLabel"
          @keydown.escape.stop="cancelLabel"
          @blur="commitLabel"
        />
        <span v-else class="sailor-edge-label">{{ edgeLabel }}</span>
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
  if (props.selected) return 'url(#sailor-workflow-arrow-selected)'
  const markerStatus = ['success', 'failed', 'running', 'waiting', 'retrying'].includes(props.status)
    ? props.status
    : 'idle'
  return `url(#sailor-workflow-arrow-${markerStatus})`
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
.sailor-workflow-edge {
  pointer-events: none;
}

.sailor-workflow-edge__path {
  pointer-events: stroke;
  cursor: pointer;
}

.sailor-edge-toolbar-object,
.sailor-edge-label-object {
  overflow: visible;
  pointer-events: auto;
}

.sailor-edge-item-count-object {
  overflow: visible;
  pointer-events: none;
}

.sailor-edge-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.sailor-edge-toolbar--visible {
  opacity: 1;
}

.sailor-edge-btn {
  background: var(--sailor-bg-surface);
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-xs, 3px);
  color: var(--sailor-text-muted);
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.sailor-edge-btn:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

.sailor-edge-btn--danger:hover {
  background: color-mix(in srgb, var(--sailor-red-500, #ef4444) 15%, transparent);
  color: var(--sailor-red-500, #ef4444);
}

.sailor-edge-item-count {
  color: var(--sailor-text-muted);
  font-family: var(--sailor-font-mono);
  font-size: 10px;
  line-height: 18px;
  text-align: center;
  white-space: nowrap;
}

.sailor-edge-label-shell {
  display: flex;
  justify-content: center;
}

.sailor-edge-label {
  display: inline-flex;
  max-width: 112px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  color: var(--sailor-text-secondary);
  background: var(--sailor-bg-surface);
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-xs, 3px);
  padding: 4px 8px;
}

.sailor-edge-label-input {
  background: var(--sailor-bg-base);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-xs, 3px);
  color: var(--sailor-text-primary);
  font-size: 12px;
  height: 22px;
  padding: 0 6px;
  width: 100px;
  outline: none;
}

.sailor-edge-label-input:focus {
  border-color: var(--sailor-accent);
}
</style>
