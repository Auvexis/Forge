import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formSchemaToBlocks, parseFormReference } from '../formSchemaToBlocks.ts'
import type { FormDefinition } from '../../../../core/api/workflows.api.ts'

const definition: FormDefinition = {
  id: 'contact-form',
  workflowId: 'workflow_1',
  triggerNodeId: 'trigger',
  mode: 'prod',
  title: 'Contact',
  description: 'Talk to us',
  fields: [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'you@example.com',
      description: '',
      options: [],
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: false,
      placeholder: '',
      description: '',
      options: [],
    },
  ],
  theme: {} as any,
}

describe('form schema to blocks', () => {
  it('converts fields into one form block, input blocks and one button', () => {
    const block = formSchemaToBlocks(definition, { createId: (prefix) => `${prefix}_fixed` })

    assert.equal(block.tag, 'form')
    assert.equal(block.action?.type, 'submitForm')
    assert.equal(block.action?.id, 'action_fixed')
    assert.equal(block.children?.filter((child) => child.tag === 'input').length, 2)
    assert.equal(block.children?.at(-1)?.tag, 'button')
  })

  it('preserves labels, required flags and field names', () => {
    const block = formSchemaToBlocks(definition, { createId: (prefix) => `${prefix}_fixed` })
    const input = block.children?.[0]

    assert.equal(input?.props?.name, 'email')
    assert.equal(input?.props?.label, 'Email')
    assert.equal(input?.props?.required, true)
    assert.equal(input?.props?.type, 'email')
  })

  it('extracts form id from supported references', () => {
    assert.deepEqual(parseFormReference('/forms/contact-form'), { formId: 'contact-form' })
    assert.deepEqual(parseFormReference('/forms-test/test-form'), { formId: 'test-form', mode: 'test' })
    assert.deepEqual(parseFormReference('/p/profile_a/forms/contact-form'), {
      formId: 'contact-form',
      profileId: 'profile_a',
    })
    assert.deepEqual(parseFormReference('plain-id'), { formId: 'plain-id' })
  })
})
