<template>
  <header class="app-topbar">
    <button class="app-topbar__search" type="button" @click="$emit('open-command-palette')">
      <LucideIcon name="search" :size="16" />
      <span>Search workflows, commands, plugins...</span>
      <kbd>Ctrl K</kbd>
    </button>
  </header>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineEmits<{
  (e: 'open-command-palette'): void
}>()
</script>

<style scoped>
.app-topbar {
  display: flex;
  align-items: center;
  min-height: 56px;
  padding: 0 var(--nod8-space-5);
  border-bottom: 1px solid var(--nod8-border);
  background: var(--nod8-bg-surface);
  flex-shrink: 0;
}

.app-topbar__search {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-3);
  width: min(680px, 100%);
  height: 36px;
  padding: 0 var(--nod8-space-3);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  color: var(--nod8-text-muted);
  background: var(--nod8-bg-base);
  cursor: pointer;
  transition:
    border-color var(--nod8-duration-fast) var(--nod8-ease-standard),
    color var(--nod8-duration-fast) var(--nod8-ease-standard),
    background-color var(--nod8-duration-fast) var(--nod8-ease-standard);
}

.app-topbar__search:hover {
  color: var(--nod8-text-primary);
  border-color: var(--nod8-border-muted);
  background: var(--nod8-button-ghost-hover);
}

.app-topbar__search span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  font-size: var(--nod8-text-sm);
}

.app-topbar__search kbd {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  color: var(--nod8-text-muted);
  background: var(--nod8-bg-surface);
  font-family: var(--nod8-font-mono);
  font-size: 10px;
}

@media (max-width: 640px) {
  .app-topbar {
    padding: 0 var(--nod8-space-3);
  }

  .app-topbar__search kbd {
    display: none;
  }
}
</style>
