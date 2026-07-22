<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'

withDefaults(
  defineProps<{
    open?: boolean
    title?: string
    canClose?: boolean
  }>(),
  {
    open: false,
    title: '',
    canClose: true,
  },
)

defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="guide-modal-fade">
      <div v-if="open" class="guide-modal-host" @mousedown.self="$emit('close')">
        <section class="guide-modal" role="dialog" aria-modal="true">
          <header v-if="title || canClose" class="guide-modal__header">
            <h2 v-if="title">{{ title }}</h2>
            <BaseButton
              v-if="canClose"
              variant="ghost"
              size="icon"
              icon-left="x"
              aria-label="Close guide"
              @click="$emit('close')"
            />
          </header>
          <div class="guide-modal__body">
            <slot />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.guide-modal-host {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--fabric-space-4);
  background: rgba(0, 0, 0, 0.64);
  backdrop-filter: blur(2px);
}

.guide-modal {
  width: min(760px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow: hidden;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-lg);
  background: var(--fabric-bg-surface);
  box-shadow: var(--fabric-shadow-lg);
}

.guide-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-3);
  padding: var(--fabric-space-4);
  border-bottom: 1px solid var(--fabric-border);
}

.guide-modal__header h2 {
  margin: 0;
  font-size: var(--fabric-text-lg);
}

.guide-modal__body {
  max-height: calc(100vh - 112px);
  overflow: auto;
}

.guide-modal-fade-enter-active,
.guide-modal-fade-leave-active {
  transition: opacity var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.guide-modal-fade-enter-from,
.guide-modal-fade-leave-to {
  opacity: 0;
}
</style>
