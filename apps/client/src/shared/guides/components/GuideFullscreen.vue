<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'

withDefaults(
  defineProps<{
    open?: boolean
    stepIndex?: number
    stepCount?: number
    title?: string
    canClose?: boolean
  }>(),
  {
    open: false,
    stepIndex: 0,
    stepCount: 0,
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
    <Transition name="guide-fullscreen-fade">
      <section v-if="open" class="guide-fullscreen" role="dialog" aria-modal="true">
        <header v-if="title || canClose" class="guide-fullscreen__header">
          <div>
            <p v-if="stepCount > 0" class="guide-fullscreen__count">
              {{ stepIndex + 1 }} / {{ stepCount }}
            </p>
            <h2 v-if="title">{{ title }}</h2>
          </div>
          <BaseButton
            v-if="canClose"
            variant="ghost"
            size="icon"
            icon-left="x"
            aria-label="Close guide"
            @click="$emit('close')"
          />
        </header>

        <main class="guide-fullscreen__body">
          <slot />
        </main>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
.guide-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  flex-direction: column;
  background: var(--fabric-bg-base);
  color: var(--fabric-text-primary);
}

.guide-fullscreen__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fabric-space-4);
  min-height: 64px;
  padding: var(--fabric-space-4) var(--fabric-space-6);
  border-bottom: 1px solid var(--fabric-border);
  background: var(--fabric-bg-surface);
}

.guide-fullscreen__header h2,
.guide-fullscreen__count {
  margin: 0;
}

.guide-fullscreen__header h2 {
  font-size: var(--fabric-text-lg);
}

.guide-fullscreen__count {
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.guide-fullscreen__body {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.guide-fullscreen-fade-enter-active,
.guide-fullscreen-fade-leave-active {
  transition: opacity var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.guide-fullscreen-fade-enter-from,
.guide-fullscreen-fade-leave-to {
  opacity: 0;
}
</style>
