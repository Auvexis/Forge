<script setup lang="ts">
import StartGuide from './StartGuide.vue'
import { useStartGuide } from './useStartGuide'

const startGuide = useStartGuide()
</script>

<template>
  <Teleport to="body">
    <Transition name="start-guide-fade">
      <div v-if="startGuide.controller.isOpen" class="start-guide-host" @mousedown.self="startGuide.skip">
        <StartGuide />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.start-guide-host {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sailor-space-4);
  background: color-mix(in srgb, var(--sailor-bg-base) 68%, transparent);
}

.start-guide-fade-enter-active,
.start-guide-fade-leave-active {
  transition: opacity var(--sailor-duration-fast) var(--sailor-ease-standard);
}

.start-guide-fade-enter-from,
.start-guide-fade-leave-to {
  opacity: 0;
}
</style>
