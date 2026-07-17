import type { PageActionReturnField } from '@/core/page-actions'
import type { PageBlockAttributes, PageBlockProps } from '../types/page.types.ts'
import type { PageBlueprintBindingNode, PageBlueprintElementNode, PageBlueprintWorkflowNode } from './pageBlueprintViewModel.ts'

export type PageBlueprintFieldMode = 'single' | 'multiple'

export interface PageBlueprintField {
  id: string
  label: string
  type?: string
  value?: string
  input?: boolean
  output?: boolean
  mode?: PageBlueprintFieldMode
}

export function createElementFields(element: PageBlueprintElementNode): PageBlueprintField[] {
  const baseFields = bindableElementFields(element.tag, element.props, element.attributes, element.className)
  return baseFields.map((field) => ({
    ...field,
    input: true,
    output: false,
  }))
}

export function createWorkflowFields(workflow: PageBlueprintWorkflowNode): PageBlueprintField[] {
  return workflow.returns.map((field) => ({
    id: field.key,
    label: field.label,
    type: field.type,
    output: true,
    mode: defaultReturnMode(field),
  }))
}

export function createBindingFields(binding: PageBlueprintBindingNode): PageBlueprintField[] {
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
): PageBlueprintField[] {
  if (tag === 'input') {
    const type = String(props.type ?? attributes.type ?? 'text')
    return [
      htmlField('value', 'Value', 'string', props.value ?? attributes.value),
      ...(type === 'checkbox' ? [htmlField('checked', 'Checked', 'boolean', props.checked ?? attributes.checked)] : []),
      htmlField('placeholder', 'Placeholder', 'string', props.placeholder ?? attributes.placeholder),
      htmlField('type', 'Type', 'string', type),
    ]
  }

  if (tag === 'text' || tag === 'button' || tag === 'link') {
    return [
      htmlField('text', 'Text', 'string', props.text ?? props.label),
      ...(tag === 'link' ? [htmlField('href', 'Href', 'string', props.href ?? attributes.href)] : []),
    ]
  }

  if (tag === 'image') {
    return [
      htmlField('src', 'Source', 'string', props.src ?? attributes.src),
      htmlField('alt', 'Alt', 'string', props.alt ?? attributes.alt),
    ]
  }

  if (tag === 'video' || tag === 'audio' || tag === 'youtube') {
    return [
      htmlField('src', 'Source', 'string', props.src ?? attributes.src),
      htmlField('title', 'Title', 'string', props.title ?? attributes.title),
    ]
  }

  return [
    htmlField('id', 'Element ID', 'string', attributes.id),
    htmlField('class', 'Class', 'string', className || attributes.class),
  ]
}

function htmlField(id: string, label: string, type: string, value: unknown): PageBlueprintField {
  return {
    id,
    label,
    type,
    value: stringifyFieldValue(value),
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
