<template>
  <div class="plugin-creator-toolbar" role="toolbar" aria-label="Plugin creator tools">
    <BaseButton
      type="button"
      :variant="activeTool === 'cursor' ? 'primary' : 'ghost'"
      size="icon"
      icon-left="mouse-pointer-2"
      title="Cursor/select"
      aria-label="Cursor/select"
      @click="setTool('cursor')"
    />
    <BaseButton
      type="button"
      :variant="activeTool === 'pan' ? 'primary' : 'ghost'"
      size="icon"
      icon-left="hand"
      title="Pan tool"
      aria-label="Pan tool"
      @click="setTool('pan')"
    />
    <BaseButton
      type="button"
      :variant="activeTool === 'delete' ? 'primary' : 'ghost'"
      size="icon"
      icon-left="trash-2"
      title="Delete tool"
      aria-label="Delete tool"
      @click="setTool('delete')"
    />
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
      size="icon"
      icon-left="undo-2"
      title="Undo"
      aria-label="Undo"
      @click="emit('undo')"
    />
    <BaseButton
      type="button"
      variant="ghost"
      size="icon"
      icon-left="redo-2"
      title="Redo"
      aria-label="Redo"
      @click="emit('redo')"
    />
    <label class="plugin-creator-toolbar__zoom">
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
      title="Save"
      aria-label="Save"
      :disabled="isSaving || !isDirty"
      @click="emit('save')"
    >
      <template #left>
        <span
          class="wec-save-dot"
          :class="{
            'wec-save-dot--dirty': isDirty,
            'wec-save-dot--saving': isSaving,
          }"
          aria-hidden="true"
        />
      </template>
      Save
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
  scrollbar-width: none;
  transform: translateX(-50%);
}

.plugin-creator-toolbar::-webkit-scrollbar {
  display: none;
}

.plugin-creator-toolbar :deep(.base-button) {
  flex: 0 0 auto;
}

.plugin-creator-toolbar :deep(.base-button--ghost:hover) {
  border-color: transparent;
  background: var(--sailor-bg-elevated);
}

.wec-save-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--sailor-chrome-text-muted);
  box-shadow: 0 0 0 rgba(255, 255, 255, 0);
  opacity: 0.62;
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease,
    opacity 180ms ease,
    transform 180ms ease;
}

.wec-save-dot--dirty {
  background: var(--sailor-chrome-text);
  box-shadow: 0 0 10px color-mix(in srgb, var(--sailor-chrome-text) 48%, transparent);
  opacity: 1;
}

.wec-save-dot--saving {
  animation: wec-save-pulse 900ms ease-in-out infinite;
}

@keyframes wec-save-pulse {
  50% {
    opacity: 0.45;
    transform: scale(0.75);
  }
}

.plugin-creator-toolbar__divider {
  width: 1px;
  height: 26px;
  margin: 0 4px;
  background: var(--sailor-border-subtle);
}

.plugin-creator-toolbar__zoom {
  flex: 0 0 96px;
  display: flex;
  align-items: center;
  min-width: 0;
  width: 96px;
  padding: 0 2px;
  color: var(--sailor-text-secondary, #526173);
  font-size: 12px;
  font-weight: 700;
}

.plugin-creator-toolbar__zoom input {
  width: 100%;
  height: 18px;
  margin: 0;
  accent-color: var(--sailor-text-primary);
  cursor: pointer;
  appearance: none;
  background: transparent;
}

.plugin-creator-toolbar__zoom input::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: 999px;
  background: var(--sailor-border-subtle);
}

.plugin-creator-toolbar__zoom input::-webkit-slider-thumb {
  width: 10px;
  height: 10px;
  margin-top: -3.5px;
  border: 1px solid var(--sailor-text-primary);
  border-radius: 999px;
  background: var(--sailor-bg-base);
  appearance: none;
}

.plugin-creator-toolbar__zoom input::-moz-range-track {
  height: 3px;
  border: 0;
  border-radius: 999px;
  background: var(--sailor-border-subtle);
}

.plugin-creator-toolbar__zoom input::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: 1px solid var(--sailor-text-primary);
  border-radius: 999px;
  background: var(--sailor-bg-base);
}
</style>
