<template>
  <div class="app-shell">
    <!-- Sidebar navigation -->
    <slot name="sidebar"></slot>

    <!-- Main content area -->
    <main class="app-shell__main">
      <slot name="topbar"></slot>
      <slot></slot>
    </main>

    <!-- Global modals/toasts -->
    <slot name="overlay"></slot>
  </div>
</template>

<script setup lang="ts">
// Main application wrapper. AppSidebar uses the sidebar slot.
</script>

<style scoped>
.app-shell {
  display: flex;
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--fabric-bg-base);
  color: var(--fabric-text-primary);
}

.app-shell__main {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
</style>
