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
      return 'check-circle'
    case 'error':
      return 'alert-circle'
    case 'warning':
      return 'alert-triangle'
    default:
      return 'info'
  }
}
</script>

<style scoped>
.app-toaster {
  position: fixed;
  bottom: var(--nod8-space-6);
  right: var(--nod8-space-6);
  z-index: 99999 !important;
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-3);
  pointer-events: none; /* Let clicks pass through empty space */
}

.app-toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--nod8-space-3);
  width: 380px;
  max-width: calc(100vw - var(--nod8-space-8));
  padding: var(--nod8-space-4);
  border-radius: var(--nod8-radius-lg);
  pointer-events: auto; /* Re-enable clicks on the toast */
  overflow: hidden;
}

/* Adds a subtle left border matching the variant */
.app-toast::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}

.app-toast--default::before {
  background-color: var(--nod8-blue-500);
}
.app-toast--success::before {
  background-color: var(--nod8-green-500);
}
.app-toast--warning::before {
  background-color: var(--nod8-amber-500);
}
.app-toast--error::before {
  background-color: var(--nod8-red-500);
}

.app-toast__icon {
  flex-shrink: 0;
  margin-top: 2px;
}
.app-toast--default .app-toast__icon {
  color: var(--nod8-blue-400);
}
.app-toast--success .app-toast__icon {
  color: var(--nod8-green-400);
}
.app-toast--warning .app-toast__icon {
  color: var(--nod8-amber-400);
}
.app-toast--error .app-toast__icon {
  color: var(--nod8-red-400);
}

.app-toast__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-1);
}

.app-toast__title {
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-text-primary);
  margin: 0;
}

.app-toast__message {
  font-size: var(--nod8-text-sm);
  color: var(--nod8-text-secondary);
  line-height: var(--nod8-leading-normal);
  margin: 0;
  word-break: break-word;
}

.app-toast__close {
  flex-shrink: 0;
  color: var(--nod8-text-muted);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nod8-radius-sm);
  margin: -4px -4px 0 0;
  transition: all var(--nod8-duration-fast) var(--nod8-ease-standard);
}

.app-toast__close:hover {
  background-color: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
}
</style>
