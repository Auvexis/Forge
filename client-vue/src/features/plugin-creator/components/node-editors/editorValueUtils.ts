export function stringifyEditorValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === undefined) return ''
  return JSON.stringify(value, null, 2)
}

export function parseEditorValue(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

export function parseJsonObject(value: string): Record<string, unknown> {
  const parsed = parseEditorValue(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {}
}

export function parseJsonArray<T = unknown>(value: string): T[] {
  const parsed = parseEditorValue(value)
  return Array.isArray(parsed) ? (parsed as T[]) : []
}
