<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="app-dialog-backdrop"
        :class="{ 'app-dialog-backdrop--top': layer === 'top' }"
        @click="onBackdropClick"
      >
        <Transition name="scale" appear>
          <div
            v-if="modelValue"
            class="app-dialog surface-elevated"
            :class="[`app-dialog--${maxWidth}`]"
            role="dialog"
            aria-modal="true"
            @click.stop
          >
            <!-- Header -->
            <div class="app-dialog__header">
              <div class="app-dialog__title-block">
                <h2 v-if="title" class="app-dialog__title">{{ title }}</h2>
                <p v-if="description" class="app-dialog__description">{{ description }}</p>
              </div>
              <button class="app-dialog__close" @click="close">
                <LucideIcon name="X" :size="20" />
              </button>
            </div>

            <!-- Body -->
            <div class="app-dialog__body">
              <slot></slot>
            </div>

            <!-- Footer (Optional) -->
            <div v-if="$slots.footer" class="app-dialog__footer">
              <slot name="footer"></slot>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useKeyboard } from '@/shared/composables/useKeyboard'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    description?: string
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
    closeOnBackdrop?: boolean
    layer?: 'default' | 'top'
  }>(),
  {
    maxWidth: 'md',
    closeOnBackdrop: true,
    layer: 'default',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const onBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close()
  }
}

// Close on Escape
useKeyboard(
  'escape',
  () => {
    if (props.modelValue) close()
  },
  { prevent: true, exact: true },
)

// Lock body scroll when open
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
)

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.app-dialog-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(11, 15, 26, 0.75);
  backdrop-filter: blur(4px);
  z-index: var(--sailor-z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sailor-space-4);
}

.app-dialog-backdrop--top {
  z-index: 10020;
}

.app-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 90vh;
  border-radius: var(--sailor-radius-lg);
  overflow: hidden;
  box-shadow: var(--sailor-shadow-xl);
}

/* ── Sizes ─────────────────────────────────────── */
.app-dialog--sm {
  max-width: 400px;
}
.app-dialog--md {
  max-width: 560px;
}
.app-dialog--lg {
  max-width: 800px;
}
.app-dialog--xl {
  max-width: 1140px;
}

/* ── Layout ────────────────────────────────────── */
.app-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--sailor-space-5) var(--sailor-space-6);
  border-bottom: 1px solid var(--sailor-border);
}

.app-dialog__title-block {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-1);
}

.app-dialog__title {
  font-size: var(--sailor-text-lg);
  font-weight: var(--sailor-font-semibold);
  color: var(--sailor-text-primary);
  margin: 0;
}

.app-dialog__description {
  font-size: var(--sailor-text-sm);
  color: var(--sailor-text-secondary);
  line-height: var(--sailor-leading-normal);
  margin: 0;
}

.app-dialog__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--sailor-radius-sm);
  color: var(--sailor-text-secondary);
  transition: all var(--sailor-duration-fast) var(--sailor-ease-standard);
  margin: -4px -8px 0 0; /* optical alignment */
}

.app-dialog__close:hover {
  background-color: var(--sailor-bg-muted);
  color: var(--sailor-text-primary);
}

.app-dialog__body {
  padding: var(--sailor-space-6);
  overflow-y: auto;
  flex: 1;
}

.app-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sailor-space-3);
  padding: var(--sailor-space-4) var(--sailor-space-6);
  border-top: 1px solid var(--sailor-border);
  background-color: var(--sailor-bg-surface);
}
</style>
