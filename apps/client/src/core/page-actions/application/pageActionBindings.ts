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

function stableBindingId(actionId: string, inputKey: string, target: PageActionElementBindingTarget) {
  return `page-action-binding:${actionId}:${inputKey}:${target.elementId}:${target.property}`
}
