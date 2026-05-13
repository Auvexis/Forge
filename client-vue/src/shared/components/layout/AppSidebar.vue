<template>
  <aside class="app-sidebar surface" :class="{ 'app-sidebar--collapsed': collapsed }">
    <header class="app-sidebar__header">
      <div class="app-sidebar__profile" aria-hidden="true">N</div>
      <div class="app-sidebar__identity">
        <span class="app-sidebar__name">ND8 Suite</span>
        <span class="app-sidebar__workspace">Local workspace</span>
      </div>
      <button
        class="app-sidebar__collapse"
        type="button"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="$emit('toggle-collapsed')"
      >
        <LucideIcon :name="collapsed ? 'panel-left-open' : 'panel-left-close'" :size="15" />
      </button>
    </header>

    <BaseWoobyMenu
      tag="nav"
      class="app-sidebar__main"
      active-selector=".nav-link--active"
    >
      <slot />
    </BaseWoobyMenu>

    <div class="app-sidebar__footer">
      <slot name="footer"></slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
import BaseWoobyMenu from '@/shared/components/base/BaseWoobyMenu.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps<{
  collapsed?: boolean
}>()

defineEmits<{
  (e: 'toggle-collapsed'): void
}>()
</script>

<style scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  width: var(--nod8-active-sidebar-width, var(--nod8-sidebar-expanded));
  height: 100vh;
  border-right-width: 1px;
  border-right-style: solid;
  border-top-width: 0;
  border-bottom-width: 0;
  border-left-width: 0;
  z-index: var(--nod8-z-raised);
  flex-shrink: 0;
  background-color: var(--nod8-bg-surface);
  transition: width var(--nod8-duration-base) var(--nod8-ease-standard);
}

.app-sidebar__header {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  min-height: 56px;
  padding: 0 var(--nod8-space-3);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.app-sidebar__profile {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-full);
  color: var(--nod8-text-primary);
  background: var(--nod8-bg-muted);
  font-size: var(--nod8-text-xs);
  font-weight: var(--nod8-font-semibold);
}

.app-sidebar__identity {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.app-sidebar__name,
.app-sidebar__workspace {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-sidebar__name {
  color: var(--nod8-text-primary);
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-semibold);
}

.app-sidebar__workspace {
  color: var(--nod8-text-muted);
  font-size: var(--nod8-text-xs);
}

.app-sidebar__collapse {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  color: var(--nod8-text-muted);
  background: transparent;
  cursor: pointer;
  transition:
    background-color var(--nod8-duration-fast) var(--nod8-ease-standard),
    color var(--nod8-duration-fast) var(--nod8-ease-standard);
}

.app-sidebar__collapse:hover {
  color: var(--nod8-text-primary);
  background: var(--nod8-button-ghost-hover);
}

.app-sidebar__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-4);
  padding: var(--nod8-space-4) var(--nod8-space-3);
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
  border-top: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.app-sidebar--collapsed .app-sidebar__header {
  flex-direction: column;
  justify-content: center;
  min-height: 96px;
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
