<template>
  <aside class="app-sidebar surface" :class="{ 'app-sidebar--collapsed': collapsed }">
    <header class="app-sidebar__header">
      <div class="app-sidebar__profile" aria-hidden="true">
        <LucideIcon :name="sidebarProfileIcon" :size="26" stroke-width="1.5" />
      </div>
      <div class="app-sidebar__identity">
        <span class="app-sidebar__name">Workspace</span>
      </div>
      <button
        class="app-sidebar__collapse"
        type="button"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="$emit('toggle-collapsed')"
      >
        <LucideIcon :name="collapsed ? 'panel-right' : 'panel-left'" :size="21" stroke-width="2" />
      </button>
      <div v-if="$slots['header-extra']" class="app-sidebar__header-extra">
        <slot name="header-extra"></slot>
      </div>
    </header>

    <nav class="app-sidebar__main">
      <slot />
    </nav>

    <div class="app-sidebar__footer">
      <slot name="footer"></slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { sidebarProfileIcon } from './appSidebarNavigation'

defineProps<{
  collapsed?: boolean
}>()

defineEmits<{
  (e: 'toggle-collapsed'): void
}>()
</script>

<style scoped>
.app-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  width: var(--nod8-active-sidebar-width, var(--nod8-sidebar-expanded));
  height: 100vh;
  border-right-width: 0;
  border-right-style: none;
  border-top-width: 0;
  border-bottom-width: 0;
  border-left-width: 0;
  z-index: var(--nod8-z-raised);
  flex-shrink: 0;
  background-color: var(--nod8-sidebar-bg);
  transition: width var(--nod8-duration-base) var(--nod8-ease-standard);
}

.app-sidebar::before {
  content: '';
  position: absolute;
  top: 49px;
  right: 0;
  bottom: 0;
  width: 1px;
  background: var(--nod8-sidebar-border);
  pointer-events: none;
}

.app-sidebar__header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  padding: 0 18px;
  flex-shrink: 0;
}

.app-sidebar__header::after {
  content: '';
  position: absolute;
  left: 23px;
  right: 23px;
  bottom: 0;
  height: 1px;
  border-radius: var(--nod8-radius-full);
  background: var(--nod8-sidebar-divider);
}

.app-sidebar__profile {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  color: var(--nod8-sidebar-text);
}

.app-sidebar__identity {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.app-sidebar__name,
.app-sidebar__name {
  color: var(--nod8-sidebar-text);
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-medium);
}

.app-sidebar__collapse {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border: 0;
  border-radius: var(--nod8-radius-sm);
  color: var(--nod8-sidebar-text-muted);
  background: transparent;
  cursor: pointer;
  transition:
    background-color var(--nod8-duration-fast) var(--nod8-ease-standard),
    color var(--nod8-duration-fast) var(--nod8-ease-standard);
}

.app-sidebar__collapse:hover {
  color: var(--nod8-sidebar-text);
  background: transparent;
}

.app-sidebar__header-extra {
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-sidebar__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 30px;
  padding: 20px 18px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.app-sidebar__footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--nod8-space-1);
  padding: var(--nod8-space-2) var(--nod8-space-3);
  border-top: 1px solid var(--nod8-sidebar-border);
  flex-shrink: 0;
}

.app-sidebar--collapsed .app-sidebar__header {
  flex-direction: column;
  justify-content: center;
  min-height: 122px;
  padding: var(--nod8-space-3) var(--nod8-space-1);
}

.app-sidebar--collapsed .app-sidebar__identity {
  display: none;
}

.app-sidebar--collapsed .app-sidebar__main {
  align-items: center;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-3) 0;
}

.app-sidebar--collapsed .app-sidebar__footer {
  flex-direction: column;
  justify-content: flex-start;
  padding: var(--nod8-space-2) 0;
}
</style>
