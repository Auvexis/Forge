import { createPageActionDefinition, type PageActionTriggerSummary } from '@/core/page-actions'
import type {
  PageBlock,
  PageElementEvent,
  PageElementEventName,
} from '../types/page.types.ts'
import type { PageElementEventOption } from './pageElementEvents.types.ts'

export const PAGE_ELEMENT_EVENT_OPTIONS: PageElementEventOption[] = [
  { value: 'click', label: 'Click', icon: 'mouse-pointer-click' },
  { value: 'change', label: 'Change', icon: 'refresh-cw' },
  { value: 'input', label: 'Input', icon: 'text-cursor-input' },
  { value: 'submit', label: 'Submit', icon: 'send' },
]

export function eventOptionsForBlock(block: PageBlock): PageElementEventOption[] {
  if (block.tag === 'form') return PAGE_ELEMENT_EVENT_OPTIONS.filter((option) => option.value === 'submit')
  if (block.tag === 'input') {
    return PAGE_ELEMENT_EVENT_OPTIONS.filter((option) => option.value === 'change' || option.value === 'input')
  }
  return PAGE_ELEMENT_EVENT_OPTIONS.filter((option) => option.value === 'click')
}

export function createElementEvent(
  eventName: PageElementEventName,
  trigger: PageActionTriggerSummary,
): PageElementEvent {
  const action = createPageActionDefinition(trigger)
  return {
    id: `page-event:${action.id}:${eventName}`,
    event: eventName,
    actionId: action.id,
    workflowId: action.workflowId,
    triggerId: action.triggerId,
  }
}

export function eventLabel(eventName: PageElementEventName) {
  return PAGE_ELEMENT_EVENT_OPTIONS.find((option) => option.value === eventName)?.label ?? eventName
}

export function actionIdForWorkflowTrigger(workflowId: string, triggerId: string) {
  return `page-action:${workflowId}:${triggerId}`
}
