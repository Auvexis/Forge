import type {
  PageActionDefinition,
  PageActionInputField,
  PageActionInputPrimitive,
  PageActionReturnField,
  PageActionTriggerSummary,
  PageActionWorkflowSummary,
} from '../domain/pageAction.types'

export interface CallableWorkflowLike {
  id: string
  name: string
  description?: string
  triggers: Array<{
    id: string
    name: string
    type: 'manual' | 'form' | 'webhook'
    icon?: string
    schema?: Record<string, unknown>
  }>
}

export function mapCallableWorkflowsToPageActions(workflows: CallableWorkflowLike[]): PageActionWorkflowSummary[] {
  return workflows.map((workflow) => ({
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    actions: workflow.triggers.map((trigger) => ({
      id: trigger.id,
      workflowId: workflow.id,
      workflowName: workflow.name,
      name: trigger.name,
      type: trigger.type,
      icon: trigger.icon,
      inputs: mapSchemaToInputFields(trigger.schema),
      returns: [],
    })),
  }))
}

export function createPageActionDefinition(trigger: PageActionTriggerSummary): PageActionDefinition {
  return {
    id: stableActionId(trigger.workflowId, trigger.id),
    name: trigger.name,
    workflowId: trigger.workflowId,
    workflowName: trigger.workflowName,
    triggerId: trigger.id,
    triggerName: trigger.name,
    triggerType: trigger.type,
    inputs: trigger.inputs,
    returns: trigger.returns,
  }
}

export function buildDefaultActionInput(fields: PageActionInputField[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field.key, defaultInputValue(field.type)]))
}

function mapSchemaToInputFields(schema: Record<string, unknown> = {}): PageActionInputField[] {
  const properties = schemaProperties(schema)
  return Object.entries(properties).map(([key, value]) => {
    const field = normalizeSchemaField(value)
    return {
      key,
      label: humanizeKey(key),
      type: field.type,
      required: field.required,
      description: field.description,
    }
  })
}

function schemaProperties(schema: Record<string, unknown>): Record<string, unknown> {
  if (schema.type === 'object') {
    return isRecord(schema.properties) ? schema.properties : {}
  }
  if (isRecord(schema.properties) && Object.keys(schema).every((key) => ['type', 'properties', 'required', 'description', 'title'].includes(key))) {
    return schema.properties
  }
  return schema
}

function normalizeSchemaField(value: unknown): {
  type: PageActionInputPrimitive
  required: boolean
  description?: string
} {
  if (!value || typeof value !== 'object') return { type: 'string', required: false }
  const raw = value as { type?: unknown; required?: unknown; description?: unknown }
  return {
    type: normalizeInputType(raw.type),
    required: raw.required === true,
    description: typeof raw.description === 'string' ? raw.description : undefined,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeInputType(value: unknown): PageActionInputPrimitive {
  if (value === 'number') return 'number'
  if (value === 'boolean') return 'boolean'
  if (value === 'object') return 'object'
  if (value === 'array') return 'array'
  if (value === 'file') return 'file'
  return 'string'
}

function defaultInputValue(type: PageActionInputPrimitive): unknown {
  if (type === 'number') return 0
  if (type === 'boolean') return false
  if (type === 'object') return {}
  if (type === 'array') return []
  if (type === 'file') return null
  return ''
}

function stableActionId(workflowId: string, triggerId: string): string {
  return `page-action:${workflowId}:${triggerId}`
}

function humanizeKey(key: string): string {
  return key
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
