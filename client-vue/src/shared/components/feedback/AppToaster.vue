<template>
  <Teleport to="body">
    <div class="app-toaster">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="app-toast surface-elevated"
          :class="`app-toast--${toast.variant}`"
        >
          <div class="app-toast__icon">
            <LucideIcon :name="getIcon(toast.variant)" :size="18" />
          </div>

          <div class="app-toast__content">
            <h4 v-if="toast.title" class="app-toast__title">{{ toast.title }}</h4>
            <p class="app-toast__message">{{ toast.message }}</p>
          </div>

          <button class="app-toast__close" @click="removeToast(toast.id)">
            <LucideIcon name="x" :size="16" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast, type ToastVariant } from '@/shared/composables/useToast'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const { toasts, removeToast } = useToast()

const getIcon = (variant: ToastVariant) => {
  switch (variant) {
    case 'success':
      return 'bell-ring'
    case 'error':
      return 'bell-ring'
    case 'warning':
      return 'bell-ring'
    default:
      return 'bell-ring'
  }
}
</script>

<style scoped>
.app-toaster {
  position: fixed;
  bottom: var(--sailor-space-6);
  right: var(--sailor-space-6);
  z-index: 99999 !important;
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-3);
  pointer-events: none; /* Let clicks pass through empty space */
}

.app-toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--sailor-space-3);
  width: 380px;
  max-width: calc(100vw - var(--sailor-space-8));
  padding: var(--sailor-space-4);
  border-radius: var(--sailor-radius-lg);
  border-top-left-radius: var(--sailor-radius-sm);
  border-bottom-left-radius: var(--sailor-radius-sm);
  pointer-events: auto; /* Re-enable clicks on the toast */
  overflow: hidden;
  background-color: var(--sailor-bg-base);
  border-color: var(--sailor-border);
}

/* Adds a subtle left border matching the variant */
.app-toast::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: var(--sailor-radius-full);
  height: calc(100% - 12px);
}

.app-toast--default::before {
  background-color: var(--sailor-blue-500);
}
.app-toast--success::before {
  background-color: var(--sailor-green-500);
}
.app-toast--warning::before {
  background-color: var(--sailor-amber-500);
}
.app-toast--error::before {
  background-color: var(--sailor-red-500);
}

.app-toast__icon {
  flex-shrink: 0;
  margin-top: 2px;
}
.app-toast--default .app-toast__icon {
  color: var(--sailor-text-primary);
}
.app-toast--success .app-toast__icon {
  color: var(--sailor-text-primary);
}
.app-toast--warning .app-toast__icon {
  color: var(--sailor-text-primary);
}
.app-toast--error .app-toast__icon {
  color: var(--sailor-text-primary);
}

.app-toast__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-1);
}

.app-toast__title {
  font-size: var(--sailor-text-sm);
  font-weight: var(--sailor-font-semibold);
  color: var(--sailor-text-primary);
  margin: 0;
}

.app-toast__message {
  font-size: var(--sailor-text-sm);
  color: var(--sailor-text-secondary);
  line-height: var(--sailor-leading-normal);
  margin: 0;
  word-break: break-word;
}

.app-toast__close {
  flex-shrink: 0;
  color: var(--sailor-text-muted);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--sailor-radius-sm);
  margin: -4px -4px 0 0;
  transition: all var(--sailor-duration-fast) var(--sailor-ease-standard);
}

.app-toast__close:hover {
  background-color: var(--sailor-bg-muted);
  color: var(--sailor-text-primary);
}
</style>
