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
  font-weight: var(--nod8-font-semibold);
  padding: 2px 7px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid;
  white-space: nowrap;
  line-height: 1.4;
}

.status-badge--pill {
  border-radius: var(--nod8-radius-full);
}

.status-badge--success {
  background: var(--nod8-status-success-bg);
  border-color: var(--nod8-status-success-border);
  color: var(--nod8-status-success-text);
}

.status-badge--running {
  background: var(--nod8-status-running-bg);
  border-color: var(--nod8-status-running-border);
  color: var(--nod8-status-running-text);
}

.status-badge--error {
  background: var(--nod8-status-error-bg);
  border-color: var(--nod8-status-error-border);
  color: var(--nod8-status-error-text);
}

.status-badge--draft {
  background: var(--nod8-status-draft-bg);
  border-color: var(--nod8-status-draft-border);
  color: var(--nod8-status-draft-text);
}

.status-badge--inactive {
  background: var(--nod8-status-inactive-bg);
  border-color: var(--nod8-status-inactive-border);
  color: var(--nod8-status-inactive-text);
}

.status-badge--neutral {
  background: var(--nod8-bg-muted);
  border-color: var(--nod8-border);
  color: var(--nod8-text-muted);
}
</style>
