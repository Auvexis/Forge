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
    case 'reward':
      return 'gift'
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
  bottom: var(--fabric-space-6);
  right: var(--fabric-space-6);
  z-index: 99999 !important;
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-3);
  pointer-events: none; /* Let clicks pass through empty space */
}

.app-toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--fabric-space-3);
  width: 380px;
  max-width: calc(100vw - var(--fabric-space-8);
  padding: var(--fabric-space-4);
  border-radius: var(--fabric-app-toaster-radius);
  border-top-left-radius: var(--fabric-radius-sm);
  border-bottom-left-radius: var(--fabric-radius-sm);
  pointer-events: auto; /* Re-enable clicks on the toast */
  overflow: hidden;
  background-color: var(--fabric-app-toaster-bg-base);
  border-color: var(--fabric-app-toaster-border);
}

/* Adds a subtle left border matching the variant */
.app-toast::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: var(--fabric-app-toaster-close-radius);
  height: calc(100% - 12px);
}

.app-toast--default::before {
  background-color: var(--fabric-app-toaster-blue500);
}
.app-toast--success::before {
  background-color: var(--fabric-app-toaster-green500);
}
.app-toast--warning::before {
  background-color: var(--fabric-app-toaster-amber500);
}
.app-toast--reward::before {
  background-color: var(--fabric-app-toaster-amber500);
}
.app-toast--error::before {
  background-color: var(--fabric-app-toaster-red500);
}

.app-toast__icon {
  flex-shrink: 0;
  margin-top: 2px;
}
.app-toast--default .app-toast__icon {
  color: var(--fabric-app-toaster-text-primary);
}
.app-toast--success .app-toast__icon {
  color: var(--fabric-app-toaster-text-primary);
}
.app-toast--warning .app-toast__icon {
  color: var(--fabric-app-toaster-text-primary);
}
.app-toast--reward .app-toast__icon {
  color: var(--fabric-app-toaster-amber400);
}
.app-toast--error .app-toast__icon {
  color: var(--fabric-app-toaster-text-primary);
}

.app-toast__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-1);
}

.app-toast__title {
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-semibold);
  color: var(--fabric-app-toaster-text-primary);
  margin: 0;
}

.app-toast__message {
  font-size: var(--fabric-text-sm);
  color: var(--fabric-app-toaster-text-secondary);
  line-height: var(--fabric-leading-normal);
  margin: 0;
  word-break: break-word;
}

.app-toast__close {
  flex-shrink: 0;
  color: var(--fabric-app-toaster-text-muted);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--fabric-app-toaster-action-radius);
  margin: -4px -4px 0 0;
  transition: all var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.app-toast__close:hover {
  background-color: var(--fabric-app-toaster-bg-muted);
  color: var(--fabric-app-toaster-text-primary);
}
</style>
