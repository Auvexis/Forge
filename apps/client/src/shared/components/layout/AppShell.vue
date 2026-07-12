<template>
  <div class="app-shell">
    <slot name="topbar"></slot>

    <!-- Main layout row -->
    <main class="app-shell__main">
      <slot name="sidebar"></slot>

      <!-- Main content area -->
      <div class="app-shell__content">
        <slot></slot>
      </div>
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
  flex-direction: column;
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
  flex-direction: row;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.app-shell__content {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
