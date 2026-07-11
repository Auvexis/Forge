<template>
  <Transition name="slide-left">
    <aside
      v-if="panelStore.isOpen"
      class="sidebar-panel"
      :class="[`sidebar-panel--${panelStore.width}`]"
    >
    <header class="sidebar-panel__header">
      <h2 class="sidebar-panel__title">{{ panelStore.title }}</h2>
      <button class="sidebar-panel__close" @click="panelStore.closePanel" title="Close Panel">
        <LucideIcon name="x" :size="16" />
      </button>
    </header>

    <div class="sidebar-panel__content">
      <component
        v-if="panelStore.panelComponent"
        :is="panelStore.panelComponent"
        v-bind="panelStore.componentProps"
      />
    </div>
  </aside>
  </Transition>
</template>

<script setup lang="ts">
import { useSidebarPanelStore } from '@/shared/stores/sidebar-panel.store'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const panelStore = useSidebarPanelStore()
</script>

<style scoped>
.sidebar-panel {
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--fabric-active-sidebar-width, var(--fabric-sidebar-width));
  background-color: var(--fabric-bg-surface);
  border-right: 1px solid var(--fabric-border);
  z-index: var(--fabric-z-raised);
  overflow: hidden;
}

.sidebar-panel--sm {
  width: 280px;
}

.sidebar-panel--md {
  width: 320px;
}

.sidebar-panel--lg {
  width: 400px;
}

.sidebar-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 var(--fabric-space-4);
  border-bottom: 1px solid var(--fabric-border);
  flex-shrink: 0;
}

.sidebar-panel__title {
  font-size: var(--fabric-text-sm);
  font-weight: 500;
  color: var(--fabric-text-secondary);
  margin: 0;
}

.sidebar-panel__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  transition: all var(--fabric-duration-fast);
}

.sidebar-panel__close:hover {
  background-color: var(--fabric-bg-muted);
  color: var(--fabric-text-primary);
}

.sidebar-panel__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
  /* Add explicit width to prevent content from squishing during animation */
  width: inherit;
}

/* Custom scrollbar for panel */
.sidebar-panel__content::-webkit-scrollbar {
  width: 4px;
}
.sidebar-panel__content::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-panel__content::-webkit-scrollbar-thumb {
  background: var(--fabric-border);
  border-radius: 4px;
}
</style>
