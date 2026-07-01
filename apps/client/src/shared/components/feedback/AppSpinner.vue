<template>
  <LucideIcon
    :name="icon"
    :size="size"
    class="app-spinner"
    :class="`app-spinner--${variant}`"
    :aria-label="label"
    role="status"
  />
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

/**
 * AppSpinner — Unified loading indicator component.
 *
 * Replaces all ad-hoc spinner patterns across the app:
 *   - .gs-spin / @keyframes gs-spin (AppGlobalSettings)
 *   - .spin / @keyframes spin (BaseButton)
 *   - .icon-spin (WorkflowsPage)
 *
 * The spin animation lives in transitions.css — no local @keyframes needed.
 */
withDefaults(
  defineProps<{
    /** Size of the icon in pixels */
    size?: number
    /** Lucide icon name to use as the spinner */
    icon?: string
    /** 'spin' uses the standard rotation; 'pulse' uses opacity pulsing */
    variant?: 'spin' | 'pulse'
    /** Accessible label for screen readers */
    label?: string
  }>(),
  {
    size: 16,
    icon: 'loader-2',
    variant: 'spin',
    label: 'Loading…',
  },
)
</script>

<style>
.app-spinner {
  flex-shrink: 0;
}

.app-spinner--spin {
  animation: app-spin 1s linear infinite;
}

.app-spinner--pulse {
  animation: app-pulse 1.2s ease-in-out infinite;
}

@keyframes app-spin {
  to { transform: rotate(360deg); }
}

@keyframes app-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
