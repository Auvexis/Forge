<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps<{
  isMaximized?: boolean
}>()

defineEmits<{
  (event: 'minimize'): void
  (event: 'toggle-maximize'): void
  (event: 'close'): void
}>()
</script>

<template>
  <div class="base-window-controls" aria-label="Window controls">
    <button type="button" aria-label="Minimize window" @click="$emit('minimize')">
      <LucideIcon name="minus" :size="14" />
    </button>
    <button
      type="button"
      :aria-label="isMaximized ? 'Restore window' : 'Maximize window'"
      @click="$emit('toggle-maximize')"
    >
      <LucideIcon :name="isMaximized ? 'copy' : 'square'" :size="13" />
    </button>
    <button
      class="base-window-controls__close"
      type="button"
      aria-label="Close window"
      @click="$emit('close')"
    >
      <LucideIcon name="x" :size="15" />
    </button>
  </div>
</template>

<style scoped>
.base-window-controls {
  display: inline-flex;
  align-items: stretch;
  align-self: stretch;
  margin-left: var(--fabric-space-1);
  -webkit-app-region: no-drag;
}

.base-window-controls button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  min-height: 40px;
  border: 0;
  border-radius: var(--fabric-app-topbar-window-control-radius);
  background: var(--fabric-app-topbar-window-control-bg);
  color: var(--fabric-app-topbar-window-control-text);
  cursor: pointer;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.base-window-controls button:hover {
  background: var(--fabric-app-topbar-window-control-hover-bg);
  color: var(--fabric-app-topbar-window-control-hover-text);
}

.base-window-controls__close:hover {
  background: var(--fabric-app-topbar-window-control-close-hover-bg) !important;
  color: var(--fabric-app-topbar-window-control-close-hover-text) !important;
}
</style>
