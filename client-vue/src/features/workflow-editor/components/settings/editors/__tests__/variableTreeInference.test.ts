import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  inferAssignedPath,
  inferEventListenerPaths,
  inferWaitFormOutputPaths,
} from '../variableTreeInference.ts'

describe('variable tree inference', () => {
  it('preserves the real value when a set field uses a resolved template', () => {
    const inferred = inferAssignedPath({
      path: 'steps.set-fields_1.output.cod_vaga',
      label: 'cod_vaga',
      sourceNodeName: 'Set Fields',
      rawValue: '{{ trigger.fields.cod_vaga }}',
      knownPaths: [
        {
          path: 'trigger.fields.cod_vaga',
          label: 'cod_vaga',
          type: 'string',
          sourceNodeName: 'Trigger',
          value: '4f41f350-f37c-41ec-88f3-c9c7851ec3a9',
        },
      ],
    })

    assert.equal(inferred.type, 'string')
    assert.equal(inferred.value, '4f41f350-f37c-41ec-88f3-c9c7851ec3a9')
  })

  it('interpolates inline templates when building static variable previews', () => {
    const inferred = inferAssignedPath({
      path: 'steps.set-fields_1.output.slug',
      label: 'slug',
      sourceNodeName: 'Set Fields',
      rawValue: 'job-{{ trigger.fields.cod_vaga }}',
      knownPaths: [
        {
          path: 'trigger.fields.cod_vaga',
          label: 'cod_vaga',
          type: 'string',
          sourceNodeName: 'Trigger',
          value: 'abc-123',
        },
      ],
    })

    assert.equal(inferred.type, 'string')
    assert.equal(inferred.value, 'job-abc-123')
  })

  it('infers event-listener params from matching emit event payload templates', () => {
    const inferred = inferEventListenerPaths({
      eventName: 'job.created',
      listenerNodeId: 'event-listener_1',
      sourceNodeName: 'Event Listener',
      knownPaths: [
        {
          path: 'steps.set-fields_1.output.cod_vaga',
          label: 'cod_vaga',
          type: 'string',
          sourceNodeName: 'Set Fields',
          value: '4f41f350-f37c-41ec-88f3-c9c7851ec3a9',
        },
      ],
      workflowNodes: {
        'emit-event_1': {
          id: 'emit-event_1',
          type: 'event',
          eventName: 'job.created',
          payloadParams: [
            {
              key: 'cod_vaga',
              value: '{{ steps.set-fields_1.output.cod_vaga }}',
            },
          ],
        },
      },
    })

    assert.equal(inferred.length, 1)
    assert.equal(inferred[0]?.path, 'steps.event-listener_1.output.cod_vaga')
    assert.equal(inferred[0]?.type, 'string')
    assert.equal(inferred[0]?.value, '4f41f350-f37c-41ec-88f3-c9c7851ec3a9')
  })

  it('infers wait-form output fields from declared form fields and live submitted values', () => {
    const paths = inferWaitFormOutputPaths({
      nodeId: 'wait-form_1',
      sourceNodeName: 'Wait For Form',
      fields: [
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'score', label: 'Score', type: 'number' },
      ],
      liveOutput: {
        formId: 'job-1',
        fields: { email: 'ada@example.com', score: 10 },
        submittedAt: 1778716191107,
        formUrl: 'http://localhost:23802/temporary-forms/job-1',
        expiresAt: 1778716226705,
      },
    })

    assert.deepEqual(paths.map((path) => [path.path, path.type, path.value]), [
      ['steps.wait-form_1.output', 'object', {
        formId: 'job-1',
        fields: { email: 'ada@example.com', score: 10 },
        submittedAt: 1778716191107,
        formUrl: 'http://localhost:23802/temporary-forms/job-1',
        expiresAt: 1778716226705,
      }],
      ['steps.wait-form_1.output.formId', 'string', 'job-1'],
      ['steps.wait-form_1.output.fields', 'object', { email: 'ada@example.com', score: 10 }],
      ['steps.wait-form_1.output.fields.email', 'string', 'ada@example.com'],
      ['steps.wait-form_1.output.fields.score', 'number', 10],
      ['steps.wait-form_1.output.submittedAt', 'number', 1778716191107],
      ['steps.wait-form_1.output.formUrl', 'string', 'http://localhost:23802/temporary-forms/job-1'],
      ['steps.wait-form_1.output.expiresAt', 'number', 1778716226705],
    ])
  })

  it('infers wait-form output field types before the form has been submitted', () => {
    const paths = inferWaitFormOutputPaths({
      nodeId: 'wait-form_1',
      sourceNodeName: 'Wait For Form',
      fields: [
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'accepted', label: 'Accepted', type: 'checkbox' },
      ],
    })

    assert.deepEqual(paths.map((path) => [path.path, path.type, path.value]), [
      ['steps.wait-form_1.output.formId', 'string', undefined],
      ['steps.wait-form_1.output.fields', 'object', undefined],
      ['steps.wait-form_1.output.fields.email', 'string', undefined],
      ['steps.wait-form_1.output.fields.accepted', 'boolean', undefined],
      ['steps.wait-form_1.output.submittedAt', 'number', undefined],
      ['steps.wait-form_1.output.formUrl', 'string', undefined],
      ['steps.wait-form_1.output.expiresAt', 'number', undefined],
    ])
  })
})
