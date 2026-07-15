<template>
  <section
    v-if="isOpen"
    class="workbench-bottom-panel"
    :style="panelStyle"
  >
    <div
      class="workbench-bottom-panel__resize"
      role="separator"
      aria-orientation="horizontal"
      :title="resizeTitle"
      @mousedown="$emit('resize-start', $event)"
    />
    <slot />
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
    resizeTitle?: string
  }>(),
  {
    isOpen: true,
    right: '0',
    bottom: '0',
    left: '0',
    minHeight: 180,
    maxHeight: 'calc(100% - 120px)',
    resizeTitle: 'Resize bottom panel',
  },
)

defineEmits<{
  'resize-start': [event: MouseEvent]
}>()

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
  z-index: var(--fabric-z-raised);
  border-top: 1px solid var(--fabric-workbench-border);
  background: var(--fabric-workbench-panel-bg);
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
</style>
