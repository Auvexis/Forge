<script setup lang="ts">
import GuideBookComponent from './GuideBookComponent.vue'
import { useStartGuide } from './useStartGuide'

const startGuide = useStartGuide()
</script>

<template>
  <Teleport to="body">
    <Transition name="guide-book-fade">
      <div
        v-if="startGuide.controller.isGuideBookOpen"
        class="guide-book-host"
        @mousedown.self="startGuide.closeGuideBook"
      >
        <GuideBookComponent @close="startGuide.closeGuideBook" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.guide-book-host {
  position: fixed;
  inset: 0;
  z-index: 99998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--fabric-space-4);
  background: rgba(0, 0, 0, 0.717);
  backdrop-filter: blur(2px);
}

.guide-book-fade-enter-active,
.guide-book-fade-leave-active {
  transition: opacity var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.guide-book-fade-enter-from,
.guide-book-fade-leave-to {
  opacity: 0;
}
</style>
