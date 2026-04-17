<template>
  <div class="app-page">
    <!-- Optional dock specific to this page -->
    <div v-if="$slots.dock" class="app-page__dock">
      <slot name="dock"></slot>
    </div>

    <!-- The actual scrollable content of the page -->
    <div class="app-page__content">
      <slot></slot>
      
      <!-- Global Page Panel anchors to the relative content boundaries -->
      <GlobalAppPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import GlobalAppPanel from './GlobalAppPanel.vue'
</script>

<style scoped>
.app-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app-page__dock {
  flex-shrink: 0;
  /* You can add padding here, or let the AppDock handle its own height/paddings */
  padding: var(--nod8-space-3);
  padding: 0;
}

.app-page__content {
  flex: 1;
  position: relative;
  min-height: 0; /* allows flex children to scroll */
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
