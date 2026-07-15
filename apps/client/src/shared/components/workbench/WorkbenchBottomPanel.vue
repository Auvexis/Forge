<template>
  <section
    v-if="isOpen"
    class="workbench-bottom-panel"
    :class="{ 'workbench-bottom-panel--has-header': showHeader }"
    :style="panelStyle"
  >
    <div
      class="workbench-bottom-panel__resize"
      role="separator"
      aria-orientation="horizontal"
      :title="resizeTitle"
      @mousedown="$emit('resize-start', $event)"
    />
    <header v-if="showHeader" class="workbench-bottom-panel__header">
      <div class="workbench-bottom-panel__title">
        <slot name="title">
          <span>{{ title }}</span>
        </slot>
      </div>
      <button
        v-if="closable"
        type="button"
        class="workbench-bottom-panel__close"
        :aria-label="closeLabel"
        @click="$emit('close')"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </header>
    <div class="workbench-bottom-panel__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    isOpen?: boolean
    height: number
    right?: string
    bottom?: string
    left?: string
    minHeight?: number
    maxHeight?: string
    title?: string
    closable?: boolean
    closeLabel?: string
    resizeTitle?: string
  }>(),
  {
    isOpen: true,
    right: '0',
    bottom: '0',
    left: '0',
    minHeight: 180,
    maxHeight: 'calc(100% - 120px)',
    title: '',
    closable: false,
    closeLabel: 'Close bottom panel',
    resizeTitle: 'Resize bottom panel',
  },
)

defineEmits<{
  'resize-start': [event: MouseEvent]
  close: []
}>()

const showHeader = computed(() => Boolean(props.title) || props.closable)

const panelStyle = computed(() => ({
  height: `${props.height}px`,
  right: props.right,
  bottom: props.bottom,
  left: props.left,
  minHeight: `${props.minHeight}px`,
  maxHeight: props.maxHeight,
}))
</script>

<style scoped>
.workbench-bottom-panel {
  position: absolute;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: var(--fabric-z-panel, 34);
  border-top: 1px solid var(--fabric-workbench-border);
  background: var(--fabric-workbench-panel-bg);
  color: var(--fabric-text-primary);
}

.workbench-bottom-panel__resize {
  position: absolute;
  top: -3px;
  right: 0;
  left: 0;
  z-index: 2;
  height: 6px;
  cursor: ns-resize;
}

.workbench-bottom-panel__resize:hover {
  background: color-mix(in srgb, var(--fabric-accent) 28%, transparent);
}

.workbench-bottom-panel__header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 32px;
  min-height: 32px;
  padding: 0 8px 0 10px;
  border-bottom: 1px solid var(--fabric-workbench-border);
  background: var(--fabric-workbench-panel-header-bg, var(--fabric-workbench-panel-bg));
}

.workbench-bottom-panel__title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  color: var(--fabric-text-primary);
  font-size: 12px;
  font-weight: 650;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workbench-bottom-panel__close {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--fabric-panel-close-color, var(--fabric-text-muted));
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.workbench-bottom-panel__close:hover {
  background: var(--fabric-panel-close-hover-bg, var(--fabric-button-ghost-hover));
  color: var(--fabric-panel-close-hover-color, var(--fabric-text-primary));
}

.workbench-bottom-panel__body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
