<template>
  <Transition :name="transitionName">
    <aside
      v-if="isOpen"
      class="app-panel surface-elevated"
      :class="[`app-panel--${position}`, `app-panel--${width}`]"
    >
      <div class="app-panel__header">
        <h3 class="app-panel__title">{{ title }}</h3>

        <div class="app-panel__actions">
          <slot name="actions"></slot>
          <button v-if="showClose" class="app-panel__close" @click="close">
            <LucideIcon name="X" :size="18" />
          </button>
        </div>
      </div>

      <div class="app-panel__body">
        <slot></slot>
      </div>

      <div v-if="$slots.footer" class="app-panel__footer">
        <slot name="footer"></slot>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useKeyboard } from '@/shared/composables/useKeyboard'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    title: string
    position?: 'left' | 'right' | 'bottom'
    width?: 'md' | 'lg' | 'xl'
    showClose?: boolean
  }>(),
  {
    position: 'right',
    width: 'md',
    showClose: true,
  },
)

const emit = defineEmits<{
  close: []
}>()

const close = () => {
  emit('close')
}

const transitionName = computed(() => {
  if (props.position === 'right') return 'slide-right'
  if (props.position === 'left') return 'slide-left'
  if (props.position === 'bottom') return 'slide-up'
  return 'fade'
})

useKeyboard(
  'escape',
  () => {
    if (props.isOpen) close()
  },
  { prevent: true, exact: true },
)
</script>

<style scoped>
.app-panel {
  position: absolute;
  z-index: var(--nod8-z-raised);
  display: flex;
  flex-direction: column;
  background-color: var(--nod8-bg-surface);
}

/* ── Positioning ───────────────────────────────── */
.app-panel--right {
  top: 0;
  right: 0;
  bottom: 0;
  border-top: 0;
  border-left: 1px solid var(--nod8-border);
  border-right: 0;
  border-bottom: 0;
}

.app-panel--left {
  top: 0;
  left: 0;
  bottom: 0;
  border-right: 1px solid var(--nod8-border);
  border-top: 0;
  border-left: 0;
  border-bottom: 0;
}

.app-panel--bottom {
  left: 0;
  right: 0;
  bottom: 0;
  height: 300px;
  border-top: 1px solid var(--nod8-border);
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
}

/* ── Widths (for left/right) ───────────────────── */
.app-panel--right.app-panel--md,
.app-panel--left.app-panel--md {
  width: var(--nod8-panel-width);
}
.app-panel--right.app-panel--lg,
.app-panel--left.app-panel--lg {
  width: var(--nod8-panel-width-wide);
}
.app-panel--right.app-panel--xl,
.app-panel--left.app-panel--xl {
  width: 600px;
}

/* ── Layout ────────────────────────────────────── */
.app-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 var(--nod8-space-4);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.app-panel__title {
  font-size: var(--nod8-text-base);
  font-weight: var(--nod8-font-semibold);
  margin: 0;
}

.app-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-1);
}

.app-panel__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--nod8-radius-sm);
  color: var(--nod8-text-secondary);
  transition: background-color var(--nod8-duration-fast);
}

.app-panel__close:hover {
  background-color: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
}

.app-panel__body {
  flex: 1;
  padding: var(--nod8-space-4);
  overflow-y: auto;
}

.app-panel__footer {
  padding: var(--nod8-space-4);
  border-top: 1px solid var(--nod8-border);
  background-color: var(--nod8-bg-elevated);
  flex-shrink: 0;
}
</style>
