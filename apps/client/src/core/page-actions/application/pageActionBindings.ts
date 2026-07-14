import type {
  PageActionDefinition,
  PageActionElementBindingTarget,
  PageActionInputBinding,
  PageActionOutputBinding,
} from '../domain/pageAction.types'

export function createElementInputBinding(
  action: PageActionDefinition,
  inputKey: string,
  target: PageActionElementBindingTarget,
): PageActionInputBinding {
  return {
    id: stableBindingId('input', action.id, inputKey, target),
    actionId: action.id,
    inputKey,
    source: 'element',
    target,
    createdAt: new Date().toISOString(),
  }
}

export function resolvePageActionInputBindings(
  input: Record<string, unknown>,
  bindings: Record<string, PageActionInputBinding>,
  readTargetValue: (target: PageActionElementBindingTarget) => unknown,
  readScopeValue: (path: string) => unknown = () => undefined,
): Record<string, unknown> {
  const resolved = { ...input }
  for (const binding of Object.values(bindings)) {
    if (binding.source === 'scope') {
      resolved[binding.inputKey] = readScopeValue(binding.scopePath ?? '')
      continue
    }
    if (binding.target) resolved[binding.inputKey] = readTargetValue(binding.target)
  }
  return resolved
}

export function createScopeInputBinding(
  action: PageActionDefinition,
  inputKey: string,
  scopePath: string,
): PageActionInputBinding {
  return {
    id: `page-action-scope-binding:${action.id}:${inputKey}:${scopePath}`,
    actionId: action.id,
    inputKey,
    source: 'scope',
    scopePath,
    createdAt: new Date().toISOString(),
  }
}

export function createElementOutputBinding(
  action: PageActionDefinition,
  resultPath: string,
  target: PageActionElementBindingTarget,
): PageActionOutputBinding {
  return {
    id: stableBindingId('output', action.id, resultPath, target),
    actionId: action.id,
    resultPath,
    target,
    createdAt: new Date().toISOString(),
  }
}

export function resolvePageActionResultPath(result: unknown, path: string): unknown {
  const segments = path.split('.').map((segment) => segment.trim()).filter(Boolean)
  if (segments.length === 0) return result
  let value = result
  for (const segment of segments) {
    if (value == null) return undefined
    if (/^\d+$/.test(segment) && Array.isArray(value)) {
      value = value[Number(segment)]
      continue
    }
    if (typeof value !== 'object') return undefined
    value = (value as Record<string, unknown>)[segment]
  }
  return value
}

function stableBindingId(kind: 'input' | 'output', actionId: string, key: string, target: PageActionElementBindingTarget) {
  return `page-action-${kind}-binding:${actionId}:${key}:${target.elementId}:${target.property}`
}
