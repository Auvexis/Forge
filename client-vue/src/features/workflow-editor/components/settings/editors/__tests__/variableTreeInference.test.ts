import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  inferAssignedPath,
  inferEventListenerPaths,
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
})
