<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  isOpen: boolean
  maxWidth?: string
  height?: string
  dimBackdrop?: boolean
}>(), {
  dimBackdrop: true,
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

function close() {
  emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="base-modal-slide-up">
      <div
        v-if="isOpen"
        class="base-modal-backdrop"
        :class="{ 'base-modal-backdrop--clear': !dimBackdrop }"
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
  </Teleport>
</template>

<style scoped>
.base-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.717);
  backdrop-filter: blur(2px);
}

.base-modal-backdrop--clear {
  background: transparent;
}

.base-modal-container {
  background: var(--fabric-bg-surface);
  border: 2px solid var(--fabric-border);
  box-shadow: var(--fabric-shadow-xl);
  border-radius: var(--fabric-radius-xl);
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
