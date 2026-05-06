<template>
  <aside class="app-sidebar surface">
    <!-- Brand/Logo Area -->
    <div class="app-sidebar__brand">
      <img src="/icon.svg" alt="nod8 Logo" class="brand-logo" />
    </div>

    <!-- Navigation Items -->
    <BaseWoobyMenu
      tag="nav"
      class="app-sidebar__nav"
      active-selector=".nav-link--active"
    >
      <slot />
    </BaseWoobyMenu>

    <!-- Footer Area (Settings, user profile) -->
    <div class="app-sidebar__footer">
      <slot name="footer"></slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
import BaseWoobyMenu from '@/shared/components/base/BaseWoobyMenu.vue'
</script>

<style scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  width: var(--nod8-sidebar-width);
  height: 100vh;
  border-right-width: 1px;
  border-right-style: solid;
  border-top-width: 0;
  border-bottom-width: 0;
  border-left-width: 0;
  z-index: var(--nod8-z-raised);
  flex-shrink: 0;
  background-color: var(--nod8-bg-surface);
}

.app-sidebar__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.brand-logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.app-sidebar__nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--nod8-space-2) 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.app-sidebar__footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--nod8-space-2) 0;
  border-top: 1px solid var(--nod8-border);
  flex-shrink: 0;
}
</style>
