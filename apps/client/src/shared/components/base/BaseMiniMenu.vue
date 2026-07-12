<template>
  <Teleport to="body">
    <transition name="bmm-fade">
      <div v-if="isOpen" class="bmm-overlay" @click.self="$emit('close')">
        <div class="bmm-dialog" :style="{ maxWidth, maxHeight }">
          <div class="bmm-header">
            <div style="display: flex; align-items: center; gap: var(--fabric-space-3)">
              <img v-if="logo && isUrl(logo)" :src="logo" alt="Logo" class="bmm-logo" />
              <LucideIcon v-else-if="icon" :name="icon" :size="18" style="opacity: 0.7;" />
              <h1 v-if="title" class="bmm-title">{{ title }}</h1>
            </div>

            <BaseButton variant="ghost" size="icon" icon-left="x" @click="$emit('close')" />
          </div>
          <div class="bmm-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="bmm-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import BaseButton from './BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  logo: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  maxWidth: {
    type: String,
    default: '480px',
  },
  maxHeight: {
    type: String,
    default: '90vh',
  },
})

defineEmits(['close'])

const isUrl = (str: string) => str?.startsWith('http') || str?.startsWith('/')
</script>

<style scoped>
.bmm-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  padding: 1rem;
}

.bmm-dialog {
  width: 100%;
  background: var(--fabric-bg-base);
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bmm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.25rem;
  border-bottom: 1px solid var(--fabric-border);
  background: var(--fabric-bg-base);
}

.bmm-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--fabric-text-primary);
}

.bmm-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
  border-radius: 4px;
}

.bmm-body {
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bmm-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--fabric-border);
  background: var(--fabric-bg-surface);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Transitions */
.bmm-fade-enter-active,
.bmm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.bmm-fade-enter-active .bmm-dialog,
.bmm-fade-leave-active .bmm-dialog {
  transition:
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s ease;
}

.bmm-fade-enter-from,
.bmm-fade-leave-to {
  opacity: 0;
}

.bmm-fade-enter-from .bmm-dialog {
  transform: scale(0.95) translateY(10px);
}
.bmm-fade-leave-to .bmm-dialog {
  transform: scale(0.95) translateY(10px);
}
</style>
