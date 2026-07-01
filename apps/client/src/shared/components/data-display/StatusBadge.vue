<template>
  <span
    class="status-badge"
    :class="[`status-badge--${variant}`, { 'status-badge--pill': pill }]"
  >
    <slot name="icon">
      <LucideIcon v-if="icon" :name="icon" :size="iconSize" />
    </slot>
    <slot />
  </span>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

/**
 * StatusBadge — Unified semantic badge for status indicators.
 *
 * Replaces all ad-hoc status badge patterns across the app:
 *   - .workflow-badge--draft/published/inactive (WorkflowsPage)
 *   - .last-run--success/running/error (WorkflowsPage)
 *   - .gs-cred-card__badge--ok/missing (AppGlobalSettings)
 *
 * Colors are driven 100% by tokens.css — no JS theme checks needed.
 */

export type StatusVariant =
  | 'success'
  | 'running'
  | 'error'
  | 'draft'
  | 'inactive'
  | 'neutral'

withDefaults(
  defineProps<{
    variant?: StatusVariant
    /** Optional Lucide icon name displayed before the slot content */
    icon?: string
    /** Renders as a pill shape (fully rounded) */
    pill?: boolean
    /** Icon size in px */
    iconSize?: number
  }>(),
  {
    variant: 'neutral',
    pill: false,
    iconSize: 10,
  },
)
</script>

<style>
/* NOTE: Not scoped — these are global BEM classes.
   Styles intentionally live in the global scope so
   they work even when the component renders inside portals. */

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: var(--sailor-font-semibold);
  padding: 2px 7px;
  border-radius: var(--sailor-radius-sm);
  border: 1px solid;
  white-space: nowrap;
  line-height: 1.4;
}

.status-badge--pill {
  border-radius: var(--sailor-radius-full);
}

.status-badge--success {
  background: var(--sailor-status-success-bg);
  border-color: var(--sailor-status-success-border);
  color: var(--sailor-status-success-text);
}

.status-badge--running {
  background: var(--sailor-status-running-bg);
  border-color: var(--sailor-status-running-border);
  color: var(--sailor-status-running-text);
}

.status-badge--error {
  background: var(--sailor-status-error-bg);
  border-color: var(--sailor-status-error-border);
  color: var(--sailor-status-error-text);
}

.status-badge--draft {
  background: var(--sailor-status-draft-bg);
  border-color: var(--sailor-status-draft-border);
  color: var(--sailor-status-draft-text);
}

.status-badge--inactive {
  background: var(--sailor-status-inactive-bg);
  border-color: var(--sailor-status-inactive-border);
  color: var(--sailor-status-inactive-text);
}

.status-badge--neutral {
  background: var(--sailor-bg-muted);
  border-color: var(--sailor-border);
  color: var(--sailor-text-muted);
}
</style>
