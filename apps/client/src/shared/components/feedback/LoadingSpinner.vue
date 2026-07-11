<template>
  <div class="loading-spinner-wrapper" :class="{ 'loading-spinner-wrapper--center': center }">
    <LucideIcon name="loader-2" class="loading-spinner" :size="size" :color="color" />
    <span v-if="text" class="loading-spinner__text">{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(
  defineProps<{
    size?: number
    color?: string
    text?: string
    center?: boolean
  }>(),
  {
    size: 24,
    center: false,
  },
)
</script>

<style scoped>
.loading-spinner-wrapper {
  display: inline-flex;
  align-items: center;
  gap: var(--fabric-space-3);
}

.loading-spinner-wrapper--center {
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: center;
  flex-direction: column;
}

.loading-spinner {
  animation: spin 1s linear infinite;
  color: var(--fabric-text-muted);
}

.loading-spinner__text {
  font-size: var(--fabric-text-sm);
  color: var(--fabric-text-secondary);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
