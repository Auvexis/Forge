import type { PageActionReturnField } from '@/core/page-actions'
import type { PageBlockAttributes, PageBlockProps } from '../types/page.types.ts'
import type { PageBlueprintBindingNode, PageBlueprintElementNode, PageBlueprintWorkflowNode } from './pageBlueprintViewModel.ts'
import { isPageBlockContainer, PAGE_BLUEPRINT_REPEAT_FIELD_ID } from './pageBlueprintRepeaters.ts'

export type PageBlueprintFieldMode = 'single' | 'multiple'

export interface PageBlueprintDisplayField {
  id: string
  label: string
  type?: string
  value?: string
  input?: boolean
  output?: boolean
  inputConnected?: boolean
  outputConnected?: boolean
  mode?: PageBlueprintFieldMode
}

export function createElementFields(element: PageBlueprintElementNode): PageBlueprintDisplayField[] {
  const baseFields = bindableElementFields(element.tag, element.props, element.attributes, element.className, element.elementId)
  return baseFields.map((field) => ({
    ...field,
    input: true,
    output: false,
  }))
}

export function createWorkflowFields(workflow: PageBlueprintWorkflowNode): PageBlueprintDisplayField[] {
  return workflow.returns.map((field) => ({
    id: field.key,
    label: field.label,
    type: field.type,
    output: true,
    mode: defaultReturnMode(field),
  }))
}

export function createBindingFields(binding: PageBlueprintBindingNode): PageBlueprintDisplayField[] {
  return [
    {
      id: 'source',
      label: 'Source',
      type: binding.mode,
      value: binding.source,
      output: true,
      mode: binding.mode,
    },
    {
      id: 'target',
      label: 'Target',
      value: binding.target,
      input: true,
    },
  ]
}

function bindableElementFields(
  tag: string,
  props: PageBlockProps,
  attributes: PageBlockAttributes,
  className: string,
  elementId?: string,
): PageBlueprintDisplayField[] {
  const repeatFields = isPageBlockContainer({ tag })
    ? [htmlField(PAGE_BLUEPRINT_REPEAT_FIELD_ID, 'Repeat Source', 'array', '')]
    : []

  if (tag === 'input') {
    const type = String(props.type ?? attributes.type ?? 'text')
    return [
      ...repeatFields,
      htmlField('value', 'Value', 'string', props.value ?? attributes.value),
      ...(type === 'checkbox' ? [htmlField('checked', 'Checked', 'boolean', props.checked ?? attributes.checked)] : []),
      htmlField('placeholder', 'Placeholder', 'string', props.placeholder ?? attributes.placeholder),
      htmlField('type', 'Type', 'string', type),
    ]
  }

  if (tag === 'text' || tag === 'button' || tag === 'link') {
    return [
      ...repeatFields,
      htmlField('text', 'Text', 'string', props.text ?? props.label),
      ...(tag === 'link' ? [htmlField('href', 'Href', 'string', props.href ?? attributes.href)] : []),
    ]
  }

  if (tag === 'image') {
    return [
      ...repeatFields,
      htmlField('src', 'Source', 'string', props.src ?? attributes.src),
      htmlField('alt', 'Alt', 'string', props.alt ?? attributes.alt),
    ]
  }

  if (tag === 'video' || tag === 'audio' || tag === 'youtube') {
    return [
      ...repeatFields,
      htmlField('src', 'Source', 'string', props.src ?? attributes.src),
      htmlField('title', 'Title', 'string', props.title ?? attributes.title),
    ]
  }

  return [
    ...repeatFields,
    htmlField('id', 'Element ID', 'string', elementId ?? attributes.id),
    htmlField('class', 'Class', 'string', className || attributes.class),
  ]
}

function htmlField(id: string, label: string, type: string, value: unknown): PageBlueprintDisplayField {
  return {
    id,
    label,
    type,
    value: stringifyFieldValue(value),
    mode: id === PAGE_BLUEPRINT_REPEAT_FIELD_ID ? 'multiple' : undefined,
  }
}

function defaultReturnMode(field: PageActionReturnField): PageBlueprintFieldMode {
  return field.type === 'array' ? 'multiple' : 'single'
}

function stringifyFieldValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}
