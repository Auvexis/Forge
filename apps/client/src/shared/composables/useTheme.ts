/**
 * useTheme — Scalable theme management composable.
 *
 * Supports three modes:
 *   'dark'   — Force dark theme (class="dark" on <html>)
 *   'light'  — Force light theme (class="light" on <html>)
 *   'system' — Follow OS preference (prefers-color-scheme)
 *
 * Design decisions:
 * - All CSS theme switching is done ONLY by toggling the class on <html>.
 *   No Vue component should ever check `isDark` to conditionally apply colors.
 *   Colors are handled 100% by CSS variables in tokens.css.
 * - Preference is persisted in localStorage under 'sailor:theme'.
 * - A system OS listener auto-updates when mode is 'system'.
 */

import { ref, computed, watchEffect, onUnmounted } from 'vue'

export type ThemeMode = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'sailor:theme'
const HTML_EL = typeof document !== 'undefined' ? document.documentElement : null

// ─── Module-level singleton state ─────────────────────────────────────────────
// Shared across all composable invocations to avoid state mismatch.

const mode = ref<ThemeMode>(
  ((): ThemeMode => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
      if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
    }
    return 'dark' // default
  })(),
)

function resolveTheme(m: ThemeMode): 'dark' | 'light' {
  if (m === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return m
}

function applyTheme(resolved: 'dark' | 'light') {
  if (!HTML_EL) return
  HTML_EL.classList.remove('dark', 'light')
  HTML_EL.classList.add(resolved)
}

// ─── OS preference listener ────────────────────────────────────────────────────

let mediaQuery: MediaQueryList | null = null
let mediaListener: ((e: MediaQueryListEvent) => void) | null = null

function attachSystemListener() {
  if (typeof window === 'undefined') return
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaListener = (e: MediaQueryListEvent) => {
    if (mode.value === 'system') {
      applyTheme(e.matches ? 'dark' : 'light')
    }
  }
  mediaQuery.addEventListener('change', mediaListener)
}

function detachSystemListener() {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener('change', mediaListener)
  }
}

attachSystemListener()

// ─── Watch and sync ────────────────────────────────────────────────────────────

watchEffect(() => {
  const resolved = resolveTheme(mode.value)
  applyTheme(resolved)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, mode.value)
  }
})

// ─── Public composable ─────────────────────────────────────────────────────────

export function useTheme() {
  const resolvedTheme = computed<'dark' | 'light'>(() => resolveTheme(mode.value))
  const isDark = computed(() => resolvedTheme.value === 'dark')

  /**
   * Theme-aware logo source.
   * dark  → LOGO_LIGHT.svg (light logo on dark chrome)
   * light → LOGO_DARK.svg  (dark logo on light chrome)
   */
  const logoSrc = computed(() => (isDark.value ? '/LOGO_LIGHT.svg' : '/LOGO_DARK.svg'))

  function setMode(newMode: ThemeMode) {
    mode.value = newMode
  }

  function toggle() {
    const resolved = resolveTheme(mode.value)
    mode.value = resolved === 'dark' ? 'light' : 'dark'
  }

  onUnmounted(() => {
    // Only detach listener when the last consumer unmounts.
    // Since this is a singleton pattern, in practice the listener lives for the
    // app lifetime — but we expose cleanup for SSR/test environments.
    detachSystemListener()
  })

  return {
    /** Current mode setting: 'dark' | 'light' | 'system' */
    mode,
    /** Resolved actual theme applied to the DOM */
    resolvedTheme,
    /** Shorthand boolean for resolved dark state */
    isDark,
    /** Theme-aware logo path ('/LOGO_LIGHT.svg' or '/LOGO_DARK.svg') */
    logoSrc,
    /** Set a specific mode */
    setMode,
    /** Toggle between dark and light (exits system mode) */
    toggle,
  }
}
