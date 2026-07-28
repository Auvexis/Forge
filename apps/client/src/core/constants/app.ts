export const APP_NAME = 'Fabric'
export const APP_VERSION = '0.1.0-alpha.4'

function resolveApiBaseUrl(): string {
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  const configured = viteEnv?.VITE_API_URL
  if (configured !== undefined) return configured
  if (typeof window === 'undefined') return 'http://localhost:23801'

  const { hostname, port } = window.location
  const isLocalVite = port === '23802' && (hostname === 'localhost' || hostname === '127.0.0.1')
  return isLocalVite ? 'http://localhost:23801' : ''
}

/** Backend API base URL - override with VITE_API_URL env var. */
export const API_BASE_URL = resolveApiBaseUrl()

/** Client origin for SSE and CORS. */
export const CLIENT_ORIGIN =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_CLIENT_ORIGIN) ??
  'http://localhost:23802'

/** Default request timeout in ms. */
export const DEFAULT_TIMEOUT_MS = 30_000

/** Debounce delay for auto-save in ms. */
export const AUTOSAVE_DEBOUNCE_MS = 800

/** Max toast duration in ms. */
export const TOAST_DURATION_MS = 4_000

/** SSE heartbeat check interval in ms. */
export const SSE_HEARTBEAT_INTERVAL_MS = 15_000
