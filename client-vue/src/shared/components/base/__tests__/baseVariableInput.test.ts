import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { insertDroppedText } from '../baseVariableInput.ts'

describe('base variable input helpers', () => {
  it('replaces the selected text with the dropped token exactly once', () => {
    const result = insertDroppedText('steps.http_1.output', '{{ steps.http_1.output }}', 0, 19)

    assert.equal(result, '{{ steps.http_1.output }}')
  })

  it('appends the dropped token when the selection is unavailable', () => {
    const result = insertDroppedText('{{ trigger.payload }}', '{{ trigger.payload }}', null, null)

    assert.equal(result, '{{ trigger.payload }}{{ trigger.payload }}')
  })
})
