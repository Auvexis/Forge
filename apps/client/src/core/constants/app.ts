// ─────────────────────────────────────────────────────────────
//  App-wide constants
// ─────────────────────────────────────────────────────────────

export const APP_NAME = 'Fabric'
export const APP_VERSION = '1.0.0'

/** Backend API base URL — override with VITE_API_URL env var */
export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:23801'

/** Client origin for SSE and CORS */
export const CLIENT_ORIGIN =
  (import.meta.env.VITE_CLIENT_ORIGIN as string | undefined) ?? 'http://localhost:23802'

/** Default request timeout in ms */
export const DEFAULT_TIMEOUT_MS = 30_000

/** Debounce delay for auto-save in ms */
export const AUTOSAVE_DEBOUNCE_MS = 800

/** Max toast duration in ms */
export const TOAST_DURATION_MS = 4_000

/** SSE heartbeat check interval (ms) */
export const SSE_HEARTBEAT_INTERVAL_MS = 15_000
