const BLUEPRINT_PATH_PATTERN = /utility:run-workflow:[A-Za-z0-9:_-]+\.return(?::[A-Za-z0-9_-]+)?(?:\.(?:[A-Za-z_$][\w$-]*|\d+))*/g
const BLUEPRINT_TOKEN_PATTERN = /\{\{\s*(utility:run-workflow:[^}]+?)\s*\}\}/g

export function evaluateBlueprintExpression(
  template: string,
  resolvePath: (path: string) => unknown,
): unknown {
  const expression = normalizeBlueprintExpression(template)
  if (!expression.trim()) return undefined
  const simpleValue = resolvePath(expression)
  if (simpleValue !== undefined) return simpleValue

  const jsExpression = expression.replace(BLUEPRINT_PATH_PATTERN, (path) => JSON.stringify(resolvePath(path)))
  try {
    return Function('"use strict"; return (' + jsExpression + ')')()
  } catch {
    return undefined
  }
}

export function unwrapBlueprintExpression(template: string) {
  return template.trim().match(/^\{\{\s*(.+?)\s*\}\}$/)?.[1]?.trim() ?? ''
}

export function normalizeBlueprintExpression(template: string) {
  const trimmed = template.trim()
  const unwrapped = unwrapBlueprintExpression(trimmed)
  if (unwrapped) return unwrapped
  return trimmed.replace(BLUEPRINT_TOKEN_PATTERN, (_, path: string) => path.trim())
}

export function resolveBlueprintRunWorkflowPath(path: string, nodeId: string, result: unknown) {
  const prefix = `${nodeId}.return`
  if (!path.startsWith(prefix)) return undefined
  const remainder = path.slice(prefix.length)
  const segments = normalizeReturnPath(remainder)
  return resolveObjectPath(result, segments)
}

export function blueprintResultPathFromExpression(template: string, nodeId: string, fieldId: string) {
  const expression = normalizeBlueprintExpression(template)
  if (!expression) return null
  const prefix = `${nodeId}.${fieldId}`
  const path = [expression, ...Array.from(expression.matchAll(BLUEPRINT_PATH_PATTERN), (match) => match[0])]
    .find((candidate) => candidate.startsWith(prefix))
  if (!path) return null
  const fieldPath = fieldId.startsWith('return:') ? fieldId.slice('return:'.length) : ''
  const suffix = path.slice(prefix.length).replace(/^[:.]/, '')
  return [fieldPath, suffix].filter(Boolean).join('.')
}

function normalizeReturnPath(path: string) {
  const normalized = path.replace(/^:/, '').replace(/^\./, '')
  return normalized ? normalized.split('.').filter(Boolean) : []
}

function resolveObjectPath(value: unknown, segments: string[]) {
  if (segments.length === 0) return value
  let current = value
  for (const segment of segments) {
    if (current == null) return undefined
    if (/^\d+$/.test(segment) && Array.isArray(current)) {
      current = current[Number(segment)]
      continue
    }
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}
