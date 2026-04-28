<template>
  <aside
    class="sidebar-panel"
    :class="[
      { 'sidebar-panel--open': panelStore.isOpen },
      `sidebar-panel--${panelStore.width}`
    ]"
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
  position: relative;
  height: 100vh;
  background-color: var(--nod8-bg-surface);
  border-right: 0 solid var(--nod8-border);
  z-index: var(--nod8-z-raised);
  flex-shrink: 0;
  width: 0;
  overflow: hidden;
  transition: width var(--nod8-duration-normal) var(--nod8-ease-standard);
}

.sidebar-panel--open {
  border-right-width: 1px;
}

.sidebar-panel--open.sidebar-panel--sm {
  width: 280px;
  opacity: 1;
}

.sidebar-panel--open.sidebar-panel--md {
  width: 320px;
  opacity: 1;
}

.sidebar-panel--open.sidebar-panel--lg {
  width: 400px;
  opacity: 1;
}

.sidebar-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 var(--nod8-space-4);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.sidebar-panel__title {
  font-size: var(--nod8-text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--nod8-text-secondary);
  margin: 0;
}

.sidebar-panel__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--nod8-radius-sm);
  color: var(--nod8-text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  transition: all var(--nod8-duration-fast);
}

.sidebar-panel__close:hover {
  background-color: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
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
  background: var(--nod8-border);
  border-radius: 4px;
}
</style>
