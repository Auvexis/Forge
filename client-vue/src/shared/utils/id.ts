// ─────────────────────────────────────────────────────────────
// ID Generation Utilities
// ─────────────────────────────────────────────────────────────

/**
 * Generates a fast, semi-secure pseudo-random ID string.
 * Recommended for local UI use only (e.g. element keys, transient node IDs).
 * Format: e.g., "y73g1o9p_8q1"
 */
export function generateId(prefix = ''): string {
  const randomPart = Math.random().toString(36).substring(2, 11)
  const timePart = Date.now().toString(36).substring(3, 8)
  return `${prefix ? prefix + '-' : ''}${randomPart}_${timePart}`
}

/**
 * Checks if a string looks like a standard UUID.
 */
export function isUuid(str: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return regex.test(str)
}
