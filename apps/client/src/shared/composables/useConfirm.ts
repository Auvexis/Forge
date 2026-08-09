// ── useConfirm ────────────────────────────────────────────────────────────────
//
// Global imperative confirmation dialog, similar to useToast.
//
// Usage (any component or composable):
//
//   const { confirm } = useConfirm()
//
//   const result = await confirm({
//     title: 'Delete Workflow',
//     message: 'This action cannot be undone.',
//     confirmText: 'Delete',
//     variant: 'danger',
//   })
//
//   // result === true   → user clicked the confirm button
//   // result === false  → user clicked the cancel button
//   // result === null   → user dismissed via X or backdrop (do nothing)
//
// The matching <AppConfirmPanel /> must be mounted once in App.vue (overlay slot).

import { ref, readonly } from 'vue'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConfirmVariant = 'danger' | 'warning' | 'primary'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  hostId?: string
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (value: boolean | null) => void
}

// ── Global singleton state ────────────────────────────────────────────────────

const current = ref<ConfirmRequest | null>(null)

// ── Composable ────────────────────────────────────────────────────────────────

export function useConfirm() {
  /**
   * Opens the confirmation dialog imperatively.
   *
   * Resolves to:
   *   true  — user clicked the confirm button
   *   false — user clicked the cancel button
   *   null  — user dismissed via X or backdrop (treat as "do nothing")
   */
  function confirm(options: ConfirmOptions): Promise<boolean | null> {
    return new Promise<boolean | null>((resolve) => {
      current.value = { ...options, resolve }
    })
  }

  /**
   * Called internally by AppConfirmPanel.
   * Pass `null` for X-button / backdrop dismissal.
   *
   * IMPORTANT: capture resolve before nulling current — Vue's reactivity
   * may re-render synchronously when current changes, so we must guarantee
   * the promise is settled with the correct value regardless of render order.
   */
  function _resolve(value: boolean | null) {
    const resolve = current.value?.resolve
    current.value = null   // close the panel first
    resolve?.(value)       // then settle the promise
  }

  return {
    /** Read-only reactive current request — consumed by AppConfirmPanel */
    current: readonly(current),
    confirm,
    _resolve,
  }
}
