<template>
  <aside class="app-sidebar surface" :class="{ 'app-sidebar--collapsed': collapsed }">
    <nav class="app-sidebar__main">
      <slot />
    </nav>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()
</script>

<style scoped>
.app-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  width: var(--fabric-active-sidebar-width, var(--fabric-sidebar-expanded));
  height: 100%;
  min-height: 0;
  border-right-width: 0;
  border-right-style: none;
  border-top-width: 0;
  border-bottom-width: 0;
  border-left-width: 0;
  border-right: 1px solid var(--fabric-app-sidebar-border);
  z-index: var(--fabric-z-raised);
  flex-shrink: 0;
  background-color: var(--fabric-app-sidebar-sidebar-bg);
  transition: width var(--fabric-duration-base) var(--fabric-ease-standard);
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

.app-sidebar--collapsed .app-sidebar__main {
  align-items: center;
  gap: var(--fabric-space-3);
  padding: var(--fabric-space-3) 0;
}
</style>
