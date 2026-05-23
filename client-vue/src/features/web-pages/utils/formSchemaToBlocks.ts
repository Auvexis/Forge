import type { FormDefinition } from '../../../core/api/workflows.api.ts'
import type { PageBlock } from '../types/page.types.ts'

interface FormSchemaToBlocksOptions {
  createId?: (prefix: string) => string
}

export interface ParsedFormReference {
  formId: string
  profileId?: string
  mode?: 'test' | 'prod'
}

export function formSchemaToBlocks(
  definition: FormDefinition,
  options: FormSchemaToBlocksOptions = {},
): PageBlock {
  const createId = options.createId ?? defaultCreateId
  const actionId = createId('action')

  return {
    id: createId('form'),
    tag: 'form',
    props: { name: definition.id },
    action: {
      id: actionId,
      type: 'submitForm',
      formId: definition.id,
      workflowId: definition.workflowId,
    },
    styles: {},
    children: [
      ...definition.fields.map<PageBlock>((field) => ({
        id: createId('input'),
        tag: 'input',
        props: {
          name: field.name,
          label: field.label,
          type: field.type,
          placeholder: field.placeholder,
          required: field.required,
        },
        styles: {},
        children: [],
      })),
      {
        id: createId('button'),
        tag: 'button',
        props: { text: 'Submit', type: 'submit' },
        styles: {},
        children: [],
      },
    ],
  }
}

export function parseFormReference(reference: string): ParsedFormReference {
  const value = reference.trim()
  const withoutOrigin = value.replace(/^https?:\/\/[^/]+/i, '')

  const profileMatch = withoutOrigin.match(/^\/p\/([^/]+)\/forms\/([^/?#]+)/)
  if (profileMatch?.[1] && profileMatch[2]) {
    return {
      profileId: decodeURIComponent(profileMatch[1]),
      formId: decodeURIComponent(profileMatch[2]),
    }
  }

  const testMatch = withoutOrigin.match(/^\/forms-test\/([^/?#]+)/)
  if (testMatch?.[1]) {
    return { formId: decodeURIComponent(testMatch[1]), mode: 'test' }
  }

  const formMatch = withoutOrigin.match(/^\/forms\/([^/?#]+)/)
  if (formMatch?.[1]) {
    return { formId: decodeURIComponent(formMatch[1]) }
  }

  return { formId: value }
}

function defaultCreateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
