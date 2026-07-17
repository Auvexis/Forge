export type PageActionTriggerType = 'manual' | 'form' | 'webhook'
export type PageActionInputPrimitive = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file'
export type PageActionRunStatus = 'idle' | 'running' | 'success' | 'error'
export type PageActionBindableElementProperty = 'value' | 'checked' | 'text'

export interface PageActionInputField {
  key: string
  label: string
  type: PageActionInputPrimitive
  required: boolean
  description?: string
}

export interface PageActionReturnField {
  key: string
  label: string
  type: PageActionInputPrimitive | 'unknown'
}

export interface PageActionWorkflowSummary {
  id: string
  name: string
  description?: string
  actions: PageActionTriggerSummary[]
}

export interface PageActionTriggerSummary {
  id: string
  workflowId: string
  workflowName: string
  name: string
  type: PageActionTriggerType
  icon?: string
  inputs: PageActionInputField[]
  returns: PageActionReturnField[]
}

export interface PageActionDefinition {
  id: string
  name: string
  workflowId: string
  workflowName: string
  triggerId: string
  triggerName: string
  triggerType: PageActionTriggerType
  inputs: PageActionInputField[]
  returns: PageActionReturnField[]
}

export interface PageActionElementBindingTarget {
  elementId: string
  property: PageActionBindableElementProperty
  label: string
}

export interface PageActionInputBinding {
  id: string
  actionId: string
  inputKey: string
  source: 'element' | 'scope'
  target?: PageActionElementBindingTarget
  scopePath?: string
  createdAt: string
}

export interface PageActionOutputBinding {
  id: string
  actionId: string
  resultPath: string
  expression?: string
  target: PageActionElementBindingTarget
  createdAt: string
}

export interface PageActionCollectionBinding {
  id: string
  actionId: string
  collectionPath: string
  targetElementId: string
  itemAlias: string
  mode?: 'repeater' | 'table'
  createdAt: string
}

export interface PageActionRunRequest {
  action: PageActionDefinition
  input: Record<string, unknown>
}

export interface PageActionRunResult {
  ok: boolean
  executionId?: string
  data?: unknown
  error?: string
  meta: {
    workflowId: string
    triggerId: string
    actionId: string
  }
}

export interface PageActionCatalogGateway {
  listAvailableActions: () => Promise<PageActionWorkflowSummary[]>
}

export interface PageActionRunnerGateway {
  runAction: (request: PageActionRunRequest) => Promise<PageActionRunResult>
}
