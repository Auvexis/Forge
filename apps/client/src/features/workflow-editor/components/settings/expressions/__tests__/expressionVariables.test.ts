import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildExpressionItems,
  findExpressionTokens,
  insertExpressionToken,
} from '../expressionVariables.ts'

describe('expression variable helpers', () => {
  it('normalizes local and global variables into insertable picker items', () => {
    const items = buildExpressionItems({
      localVariables: [
        { name: 'customer_id', type: 'string', defaultValue: 'cus_123', description: 'Customer' },
        { name: 'api_key', type: 'secret', defaultValue: 'hidden' },
      ],
      globalVariables: [
        {
          key: 'BASE_URL',
          value: 'https://api.example.com',
          description: 'API root',
          created_at: '2026-05-12T00:00:00.000Z',
          updated_at: '2026-05-12T00:00:00.000Z',
        },
      ],
    })

    assert.deepEqual(
      items.map((item) => ({
        scope: item.scope,
        name: item.name,
        preview: item.preview,
        type: item.type,
        token: item.token,
      })),
      [
        {
          scope: 'local',
          name: 'customer_id',
          preview: 'cus_123',
          type: 'string',
          token: '{{ variables.customer_id }}',
        },
        {
          scope: 'local',
          name: 'api_key',
          preview: '************',
          type: 'secret',
          token: '{{ variables.api_key }}',
        },
        {
          scope: 'global',
          name: 'BASE_URL',
          preview: '************',
          type: 'string',
          token: '{{ env.BASE_URL }}',
        },
      ],
    )
  })

  it('finds local and global expression tokens for input badges', () => {
    const tokens = findExpressionTokens('Call {{ env.BASE_URL }}/customers/{{ variables.customer_id }}')

    assert.deepEqual(tokens, [
      { scope: 'global', name: 'BASE_URL', token: '{{ env.BASE_URL }}' },
      { scope: 'local', name: 'customer_id', token: '{{ variables.customer_id }}' },
    ])
  })

  it('inserts the selected token at the current input selection', () => {
    const result = insertExpressionToken('Hello world', '{{ variables.name }}', {
      start: 6,
      end: 11,
    })

    assert.equal(result, 'Hello {{ variables.name }}')
  })
})
