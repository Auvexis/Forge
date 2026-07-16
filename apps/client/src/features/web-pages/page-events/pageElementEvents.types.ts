import type { PageActionDefinition } from '@/core/page-actions'
import type { PageElementEvent, PageElementEventName } from '../types/page.types.ts'

export type PageElementEventOption = {
  value: PageElementEventName
  label: string
  icon: string
}

export type PageElementEventAction = Pick<
  PageActionDefinition,
  'id' | 'name' | 'workflowId' | 'workflowName' | 'triggerId' | 'triggerName' | 'returns' | 'inputs'
>

export type PageElementEventPatch = Partial<PageElementEvent>
