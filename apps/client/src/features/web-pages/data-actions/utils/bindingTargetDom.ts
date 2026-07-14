import type { PageActionElementBindingTarget } from '@/core/page-actions'

export function readPageActionBindingTargetAtPoint(x: number, y: number): PageActionElementBindingTarget | null {
  const element = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>('[data-page-action-binding-target="true"]')
  if (!element) return null
  const elementId = element.dataset.pageActionBindingElementId
  const property = element.dataset.pageActionBindingProperty
  if (!elementId || !isBindingProperty(property)) return null
  return {
    elementId,
    property,
    label: element.dataset.pageActionBindingLabel || elementId,
  }
}

function isBindingProperty(value: string | undefined): value is PageActionElementBindingTarget['property'] {
  return value === 'value' || value === 'checked' || value === 'text'
}
