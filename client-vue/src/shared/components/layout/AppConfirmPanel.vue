<script setup lang="ts">
import { computed } from 'vue'
import { useConfirm } from '@/shared/composables/useConfirm'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseButton from '../base/BaseButton.vue'

// ── Wired directly to the global singleton ───────────────────────────────────

const { current, _resolve } = useConfirm()

const isOpen = computed(() => current.value !== null)
const title = computed(() => current.value?.title ?? '')
const message = computed(() => current.value?.message ?? '')
const confirmText = computed(() => current.value?.confirmText ?? 'Confirm')
const cancelText = computed(() => current.value?.cancelText ?? 'Cancel')
const variant = computed(() => current.value?.variant ?? 'primary')

// ── Icon per variant ──────────────────────────────────────────────────────────

const iconName = computed(() => {
  if (variant.value === 'danger') return 'triangle-alert'
  if (variant.value === 'warning') return 'circle-alert'
  return 'info'
})
</script>

<template>
  <Transition name="acp-fade">
    <div v-if="isOpen" class="acp-backdrop" @mousedown.self="_resolve(null)">
      <Transition name="acp-pop" appear>
        <div v-if="isOpen" class="acp-dialog" role="alertdialog" aria-modal="true">
          <!-- Icon -->
          <div class="acp-icon" :class="`acp-icon--${variant}`">
            <LucideIcon :name="iconName" :size="20" />
          </div>

          <!-- Header -->
          <div class="acp-header">
            <h3 class="acp-title">{{ title }}</h3>
            <button class="acp-close" title="Cancel" @click="_resolve(null)">
              <LucideIcon name="x" :size="16" />
            </button>
          </div>

          <!-- Message -->
          <p class="acp-message">{{ message }}</p>

          <!-- Actions -->
          <div class="acp-actions">
            <BaseButton variant="ghost" @click="_resolve(false)">
              {{ cancelText }}
            </BaseButton>

            <BaseButton
              :variant="variant === 'danger' ? 'danger' : variant === 'warning' ? 'outline' : 'primary'"
              @click="_resolve(true)"
            >
              {{ confirmText }}
            </BaseButton>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Backdrop ────────────────────────────────────────────────────────────────── */

.acp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  padding: var(--sailor-space-4);
}

/* ── Dialog card ─────────────────────────────────────────────────────────────── */

.acp-dialog {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto auto;
  gap: var(--sailor-space-3) var(--sailor-space-3);
  width: 100%;
  max-width: 420px;
  background: var(--sailor-bg-surface);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  padding: var(--sailor-space-5);
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.4),
    0 4px 12px rgba(0, 0, 0, 0.2);
}

/* ── Icon ────────────────────────────────────────────────────────────────────── */

.acp-icon {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--sailor-radius-sm);
  flex-shrink: 0;
}

.acp-icon--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.acp-icon--warning {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.acp-icon--primary {
  background: rgba(99, 102, 241, 0.12);
  color: var(--sailor-accent);
  border: 1px solid rgba(99, 102, 241, 0.25);
}

/* ── Header ──────────────────────────────────────────────────────────────────── */

.acp-header {
  grid-column: 2 / 4;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sailor-space-2);
  min-width: 0;
}

.acp-title {
  margin: 0;
  font-size: var(--sailor-text-base);
  font-weight: var(--sailor-font-semibold);
  color: var(--sailor-text-primary);
}

.acp-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--sailor-radius-sm);
  border: none;
  background: transparent;
  color: var(--sailor-text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background var(--sailor-duration-fast) var(--sailor-ease-standard),
    color var(--sailor-duration-fast) var(--sailor-ease-standard);
}

.acp-close:hover {
  background: var(--sailor-bg-muted);
  color: var(--sailor-text-primary);
}

/* ── Message ─────────────────────────────────────────────────────────────────── */

.acp-message {
  grid-column: 1 / 4;
  grid-row: 2;
  margin: 0;
  font-size: var(--sailor-text-sm);
  color: var(--sailor-text-secondary);
  line-height: 1.55;
  padding-left: calc(36px + var(--sailor-space-3));
}

/* ── Actions ─────────────────────────────────────────────────────────────────── */

.acp-actions {
  grid-column: 1 / 4;
  grid-row: 3;
  display: flex;
  justify-content: flex-end;
  gap: var(--sailor-space-2);
  padding-top: var(--sailor-space-1);
}

/* ── Transitions ─────────────────────────────────────────────────────────────── */

.acp-fade-enter-active,
.acp-fade-leave-active {
  transition: opacity var(--sailor-duration-fast) var(--sailor-ease-standard);
}
.acp-fade-enter-from,
.acp-fade-leave-to {
  opacity: 0;
}

.acp-pop-enter-active {
  transition:
    opacity 150ms var(--sailor-ease-standard),
    transform 150ms var(--sailor-ease-standard);
}
.acp-pop-leave-active {
  transition:
    opacity 100ms var(--sailor-ease-standard),
    transform 100ms var(--sailor-ease-standard);
}
.acp-pop-enter-from,
.acp-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(6px);
}
</style>
