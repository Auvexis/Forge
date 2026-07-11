<template>
  <div
    class="app-divider"
    :class="[`app-divider--${orientation}`, { 'app-divider--spacing': spacing }]"
    role="separator"
    :aria-orientation="orientation"
  />
</template>

<script setup lang="ts">
/**
 * AppDivider — Unified visual separator component.
 *
 * Replaces all ad-hoc divider patterns across the app:
 *   - .divider / .divider--vertical (main.css globals)
 *   - .dock-divider (WorkflowsPage)
 */
withDefaults(
  defineProps<{
    orientation?: 'horizontal' | 'vertical'
    /** Adds automatic margin spacing around the divider */
    spacing?: boolean
  }>(),
  {
    orientation: 'horizontal',
    spacing: false,
  },
)
</script>

<style>
.app-divider {
  background: var(--fabric-border);
  flex-shrink: 0;
}

.app-divider--horizontal {
  width: 100%;
  height: 1px;
}

.app-divider--horizontal.app-divider--spacing {
  margin: var(--fabric-space-2) 0;
}

.app-divider--vertical {
  width: 1px;
  height: 16px;
}

.app-divider--vertical.app-divider--spacing {
  margin: 0 var(--fabric-space-2);
}
</style>
