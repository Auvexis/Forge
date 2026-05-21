<template>
  <div class="plugin-creator-toolbar" role="toolbar" aria-label="Plugin creator tools">
    <BaseButton
      type="button"
      variant="ghost"
      size="sm"
      icon-left="mouse-pointer-2"
      :class="{ 'is-active': activeTool === 'cursor' }"
      title="Cursor/select"
      aria-label="Cursor/select"
      @click="setTool('cursor')"
    >
      Cursor
    </BaseButton>
    <BaseButton
      type="button"
      variant="ghost"
      size="sm"
      icon-left="hand"
      :class="{ 'is-active': activeTool === 'pan' }"
      title="Pan tool"
      aria-label="Pan tool"
      @click="setTool('pan')"
    >
      Pan
    </BaseButton>
    <BaseButton
      type="button"
      variant="ghost"
      size="sm"
      icon-left="trash-2"
      :class="{ 'is-active': activeTool === 'delete' }"
      title="Delete tool"
      aria-label="Delete tool"
      @click="setTool('delete')"
    >
      Delete
    </BaseButton>
    <BaseButton
      type="button"
      variant="ghost"
      size="sm"
      icon-left="eraser"
      title="Clear Execution"
      aria-label="Clear Execution"
      @click="emit('clearExecution')"
    >
      Clear
    </BaseButton>
    <BaseButton
      type="button"
      variant="ghost"
      size="sm"
      icon-left="plus"
      title="Add Item/Node"
      aria-label="Add Item/Node"
      @click="emit('addItem')"
    >
      Add
    </BaseButton>

    <span class="plugin-creator-toolbar__divider" aria-hidden="true"></span>

    <BaseButton
      type="button"
      variant="ghost"
      size="sm"
      icon-left="undo-2"
      title="Undo"
      aria-label="Undo"
      @click="emit('undo')"
    >
      Undo
    </BaseButton>
    <BaseButton
      type="button"
      variant="ghost"
      size="sm"
      icon-left="redo-2"
      title="Redo"
      aria-label="Redo"
      @click="emit('redo')"
    >
      Redo
    </BaseButton>
    <label class="plugin-creator-toolbar__zoom">
      <span>Zoom</span>
      <input
        v-model.number="zoomValue"
        type="range"
        min="40"
        max="180"
        step="5"
        @input="emit('zoom', zoomValue)"
      />
    </label>

    <span class="plugin-creator-toolbar__divider" aria-hidden="true"></span>

    <BaseButton
      type="button"
      variant="ghost"
      size="sm"
      icon-left="play"
      title="Run"
      aria-label="Run"
      @click="emit('run')"
    >
      Run
    </BaseButton>
    <BaseButton
      type="button"
      variant="ghost"
      size="sm"
      icon-left="save"
      title="Save"
      aria-label="Save"
      :disabled="isSaving || !isDirty"
      @click="emit('save')"
    >
      Save
      <template #right>
        <span
          class="plugin-creator-save-dot"
          :class="{
            'plugin-creator-save-dot--dirty': isDirty,
            'plugin-creator-save-dot--saving': isSaving,
          }"
        />
      </template>
    </BaseButton>
    <BaseButton
      type="button"
      variant="ghost"
      size="sm"
      icon-left="rocket"
      title="Publish"
      aria-label="Publish"
      @click="emit('publish')"
    >
      Publish
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'

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

withDefaults(
  defineProps<{
    isDirty?: boolean
    isSaving?: boolean
  }>(),
  {
    isDirty: false,
    isSaving: false,
  },
)

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
  max-width: calc(100% - 32px);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 8px;
  background: color-mix(in srgb, var(--sailor-bg-base) 94%, transparent);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.34);
  overflow-x: auto;
  overflow-y: hidden;
  transform: translateX(-50%);
}

.plugin-creator-toolbar :deep(.base-button) {
  flex: 0 0 auto;
  border: 1px solid transparent;
  color: var(--sailor-text-primary);
}

.plugin-creator-toolbar :deep(.base-button:hover),
.plugin-creator-toolbar :deep(.base-button.is-active) {
  border-color: var(--sailor-border-subtle);
  background: var(--sailor-bg-elevated);
}

.plugin-creator-save-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: 1px solid var(--sailor-border-subtle);
  background: transparent;
}

.plugin-creator-save-dot--dirty {
  border-color: rgba(245, 158, 11, 0.6);
  background: var(--sailor-amber-500, #f59e0b);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.16);
}

.plugin-creator-save-dot--saving {
  border-color: rgba(59, 130, 246, 0.56);
  background: #3b82f6;
  animation: plugin-creator-save-pulse 1s ease-in-out infinite;
}

@keyframes plugin-creator-save-pulse {
  0%,
  100% {
    opacity: 0.45;
  }

  50% {
    opacity: 1;
  }
}

.plugin-creator-toolbar__divider {
  width: 1px;
  height: 26px;
  margin: 0 4px;
  background: var(--sailor-border-subtle);
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
