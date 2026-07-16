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

export function readPageActionElementTargetAtPoint(x: number, y: number): PageActionElementBindingTarget | null {
  const bindingTarget = readPageActionBindingTargetAtPoint(x, y)
  if (bindingTarget) return bindingTarget

  const element = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>('[data-page-action-binding-element-id]')
  const elementId = element?.dataset.pageActionBindingElementId
  if (!elementId) return null
  return {
    elementId,
    property: 'text',
    label: element.getAttribute('aria-label') || elementId,
  }
}

export function readPageActionBindingTargetValue(target: PageActionElementBindingTarget): unknown {
  const frame = document.querySelector<HTMLElement>(
    `[data-page-action-binding-element-id="${escapeCss(target.elementId)}"]`,
  )
  const element = frame?.querySelector<HTMLElement>('.web-page-block-frame__inner') ?? frame
  if (!element) return ''
  if (target.property === 'checked' && element instanceof HTMLInputElement) return element.checked
  if (target.property === 'value' && isValueElement(element)) return element.value
  if (target.property === 'text') return element.textContent ?? ''
  return element.getAttribute(target.property) ?? element.textContent ?? ''
}

function isBindingProperty(value: string | undefined): value is PageActionElementBindingTarget['property'] {
  return value === 'value' || value === 'checked' || value === 'text'
}

function isValueElement(element: HTMLElement): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
}

function escapeCss(value: string) {
  if (typeof CSS !== 'undefined' && 'escape' in CSS) return CSS.escape(value)
  return value.replace(/["\\]/g, '\\$&')
}
