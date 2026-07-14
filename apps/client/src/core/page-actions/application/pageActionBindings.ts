import type {
  PageActionDefinition,
  PageActionElementBindingTarget,
  PageActionInputBinding,
} from '../domain/pageAction.types'

export function createElementInputBinding(
  action: PageActionDefinition,
  inputKey: string,
  target: PageActionElementBindingTarget,
): PageActionInputBinding {
  return {
    id: stableBindingId(action.id, inputKey, target),
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
): Record<string, unknown> {
  const resolved = { ...input }
  for (const binding of Object.values(bindings)) {
    resolved[binding.inputKey] = readTargetValue(binding.target)
  }
  return resolved
}

function stableBindingId(actionId: string, inputKey: string, target: PageActionElementBindingTarget) {
  return `page-action-binding:${actionId}:${inputKey}:${target.elementId}:${target.property}`
}
