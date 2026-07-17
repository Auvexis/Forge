const BLUEPRINT_PATH_PATTERN = /\b(?:utility|blueprint-element):[A-Za-z0-9:_-]+(?:\.[A-Za-z0-9:_-]+)+(?:\.(?:[A-Za-z_$][\w$-]*|\d+))*/g
const BLUEPRINT_TOKEN_PATTERN = /\{\{\s*((?:utility|blueprint-element):[^}]+?)\s*\}\}/g

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

export function blueprintResultPathFromExpression(template: string, nodeId: string, fieldId: string) {
  const expression = normalizeBlueprintExpression(template)
  if (!expression) return null
  const prefix = `${nodeId}.${fieldId}`
  const matchedPaths = Array.from(expression.matchAll(BLUEPRINT_PATH_PATTERN), (match) => match[0])
    .filter((candidate) => candidate.startsWith(prefix))
  const path = matchedPaths.at(-1) ?? (expression.startsWith(prefix) ? expression : '')
  if (!path) return null
  const fieldPath = fieldId.startsWith('return:') ? fieldId.slice('return:'.length) : ''
  const suffix = path.slice(prefix.length).replace(/^[:.]/, '')
  return [fieldPath, suffix].filter(Boolean).join('.')
}
