import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildTriggerFormProdUrl, buildTriggerFormTestUrl } from '../triggerRuntimeUrls.ts'

describe('trigger runtime urls', () => {
  it('builds Form Trigger test URLs from the backend public origin', () => {
    assert.equal(
      buildTriggerFormTestUrl('https://public.example.test/', 'lead-capture'),
      'https://public.example.test/forms-test/lead-capture',
    )
  })

  it('keeps published Form Trigger URLs on the production forms route', () => {
    assert.equal(
      buildTriggerFormProdUrl('https://public.example.test/', 'lead-capture'),
      'https://public.example.test/forms/lead-capture',
    )
  })
})
