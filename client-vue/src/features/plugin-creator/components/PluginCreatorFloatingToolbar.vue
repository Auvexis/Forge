<template>
  <div class="plugin-creator-toolbar" role="toolbar" aria-label="Plugin creator tools">
    <button
      type="button"
      :class="{ 'is-active': activeTool === 'cursor' }"
      title="Cursor/select"
      aria-label="Cursor/select"
      @click="setTool('cursor')"
    >
      <MousePointer2 :size="16" />
    </button>
    <button
      type="button"
      :class="{ 'is-active': activeTool === 'pan' }"
      title="Pan tool"
      aria-label="Pan tool"
      @click="setTool('pan')"
    >
      <Hand :size="16" />
    </button>
    <button
      type="button"
      class="plugin-creator-toolbar__danger"
      :class="{ 'is-active': activeTool === 'delete' }"
      title="Delete tool"
      aria-label="Delete tool"
      @click="setTool('delete')"
    >
      <Trash2 :size="16" />
    </button>
    <button type="button" title="Clear Execution" aria-label="Clear Execution" @click="emit('clearExecution')">
      <Eraser :size="16" />
    </button>
    <button type="button" title="Add Item/Node" aria-label="Add Item/Node" @click="emit('addItem')">
      <Plus :size="16" />
    </button>

    <span class="plugin-creator-toolbar__divider" aria-hidden="true"></span>

    <button type="button" title="Undo" aria-label="Undo" @click="emit('undo')">
      <Undo2 :size="16" />
    </button>
    <button type="button" title="Redo" aria-label="Redo" @click="emit('redo')">
      <Redo2 :size="16" />
    </button>
    <label class="plugin-creator-toolbar__zoom">
      <span>Zoom</span>
      <input v-model.number="zoomValue" type="range" min="40" max="180" step="5" @input="emit('zoom', zoomValue)" />
    </label>

    <span class="plugin-creator-toolbar__divider" aria-hidden="true"></span>

    <button type="button" title="Run" aria-label="Run" @click="emit('run')">
      <Play :size="16" />
    </button>
    <button type="button" title="Save" aria-label="Save" @click="emit('save')">
      <Save :size="16" />
    </button>
    <button
      type="button"
      class="plugin-creator-toolbar__publish"
      title="Publish"
      aria-label="Publish"
      @click="emit('publish')"
    >
      <Rocket :size="16" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Eraser,
  Hand,
  MousePointer2,
  Play,
  Plus,
  Redo2,
  Rocket,
  Save,
  Trash2,
  Undo2,
} from 'lucide-vue-next'

type ToolbarTool = 'cursor' | 'pan' | 'delete'

const emit = defineEmits<{
  toolChange: [tool: ToolbarTool]
  clearExecution: []
  addItem: []
  undo: []
  redo: []
  zoom: [value: number]
  run: []
  save: []
  publish: []
}>()

const activeTool = ref<ToolbarTool>('cursor')
const zoomValue = ref(100)

function setTool(tool: ToolbarTool) {
  activeTool.value = tool
  emit('toolChange', tool)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    setTool('cursor')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.plugin-creator-toolbar {
  position: absolute;
  left: 50%;
  bottom: 18px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--sailor-border, #d9e1ec);
  border-radius: 8px;
  background: var(--sailor-surface, #ffffff);
  box-shadow: 0 18px 40px rgba(20, 32, 51, 0.16);
  transform: translateX(-50%);
}

.plugin-creator-toolbar button {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--sailor-text-primary, #142033);
  cursor: pointer;
}

.plugin-creator-toolbar button:hover,
.plugin-creator-toolbar button.is-active {
  border-color: var(--sailor-border, #d9e1ec);
  background: var(--sailor-bg-surface-hover, #f3f6fb);
}

.plugin-creator-toolbar__danger {
  color: #c2410c !important;
}

.plugin-creator-toolbar__danger.is-active {
  border-color: #fecaca !important;
  background: #fff1f2 !important;
  color: #b91c1c !important;
}

.plugin-creator-toolbar__publish {
  background: #246bfe !important;
  color: #ffffff !important;
}

.plugin-creator-toolbar__divider {
  width: 1px;
  height: 26px;
  margin: 0 4px;
  background: var(--sailor-border, #d9e1ec);
}

.plugin-creator-toolbar__zoom {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 132px;
  padding: 0 6px;
  color: var(--sailor-text-secondary, #526173);
  font-size: 12px;
  font-weight: 700;
}

.plugin-creator-toolbar__zoom input {
  width: 82px;
}
</style>
