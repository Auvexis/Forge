// ─────────────────────────────────────────────────────────────
// Cloning Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Deep clones an object using structuredClone if available,
 * falling back to JSON serialization for older environments.
 */
export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // Fallback if structuredClone fails (e.g. on Symbols or functions, which shouldn't happen for our state)
    }
  }

  // Only use JSON fallback if structuredClone isn't available or fails
  if (value === undefined) return undefined as any
  return JSON.parse(JSON.stringify(value))
}

/**
 * Shallow clones an object or array.
 */
export function shallowClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return [...value] as any
  }
  if (value !== null && typeof value === 'object') {
    return { ...value }
  }
  return value
}
