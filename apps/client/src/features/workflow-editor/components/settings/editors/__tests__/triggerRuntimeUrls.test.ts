import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildTriggerFormProdUrl,
  buildTriggerFormTestUrl,
  buildTriggerWebhookProdUrl,
} from '../triggerRuntimeUrls.ts'

describe('trigger runtime urls', () => {
  it('builds Form Trigger test URLs from the backend public origin', () => {
    assert.equal(
      buildTriggerFormTestUrl('https://public.example.test/', 'lead-capture'),
      'https://public.example.test/forms-test/lead-capture',
    )
  })

  it('keeps published Form Trigger URLs on the production forms route', () => {
    assert.equal(
      buildTriggerFormProdUrl('https://public.example.test/', 'lead-capture', 'bruno'),
      'https://public.example.test/p/bruno/forms/lead-capture',
    )
  })

  it('falls back to legacy Form Trigger production URLs without a profile id', () => {
    assert.equal(
      buildTriggerFormProdUrl('https://public.example.test/', 'lead-capture'),
      'https://public.example.test/forms/lead-capture',
    )
  })

  it('builds profile-scoped webhook production URLs', () => {
    assert.equal(
      buildTriggerWebhookProdUrl('https://public.example.test/', 'orders', 'bruno'),
      'https://public.example.test/p/bruno/webhook/orders',
    )
  })
})
