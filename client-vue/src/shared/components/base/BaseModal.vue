<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
  maxWidth?: string
  height?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function close() {
  emit('close')
}
</script>

<template>
  <Transition name="base-modal-slide-up">
    <div
      v-if="isOpen"
      class="base-modal-backdrop"
      @click.self="close"
    >
      <div 
        class="base-modal-container flex flex-col overflow-hidden"
        :style="{ maxWidth: maxWidth || '1600px', height: height || '85vh', width: '95vw' }"
      >
        <slot />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.base-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.base-modal-container {
  background: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  box-shadow: var(--nod8-shadow-xl);
  border-radius: var(--nod8-radius-sm);
}

/* ── Transition: base-modal-slide-up ── */
.base-modal-slide-up-enter-active,
.base-modal-slide-up-leave-active {
  transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.base-modal-slide-up-enter-from,
.base-modal-slide-up-leave-to {
  opacity: 0;
}

.base-modal-slide-up-enter-active .base-modal-container {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.base-modal-slide-up-leave-active .base-modal-container {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.base-modal-slide-up-enter-from .base-modal-container,
.base-modal-slide-up-leave-to .base-modal-container {
  transform: translateY(100vh);
}
</style>
