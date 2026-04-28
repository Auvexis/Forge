<template>
  <div class="app-shell__header-strip"></div>

  <div class="app-shell">
    <!-- Sidebar navigation -->
    <slot name="sidebar"></slot>

    <!-- Main content area -->
    <main class="app-shell__main">
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
  background-color: var(--nod8-bg-base);
  color: var(--nod8-text-primary);
}

.app-shell__header-strip {
  width: 100%;
  height: 2px;
  background: var(--nod8-brand-gradient);
}

.app-shell__main {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden; /* App Pages handle their own scrolling */
}
</style>
