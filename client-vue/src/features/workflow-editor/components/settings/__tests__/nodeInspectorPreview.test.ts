import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildEventListenerInputPreview,
  buildNodeTestExecutionContext,
} from '../nodeInspectorPreview.ts'

describe('node inspector preview helpers', () => {
  it('builds a node test execution context from successful frontend node outputs', () => {
    const context = buildNodeTestExecutionContext(
      {
        trigger: {
          status: 'success',
          output: { fields: { cod_vaga: 'trigger-value' } },
        },
        generateUUID_1: {
          status: 'success',
          output: { uuid: '4f41f350-f37c-41ec-88f3-c9c7851ec3a9' },
        },
        set_1: {
          status: 'failed',
          error: 'boom',
        },
      },
      { token: 'abc' },
    )

    assert.deepEqual(context, {
      trigger: { fields: { cod_vaga: 'trigger-value' } },
      steps: {
        generateUUID_1: {
          status: 'SUCCESS',
          output: { uuid: '4f41f350-f37c-41ec-88f3-c9c7851ec3a9' },
        },
      },
      variables: { token: 'abc' },
    })
  })

  it('resolves event listener expected payload from emit event params and known outputs', () => {
    const preview = buildEventListenerInputPreview({
      eventName: 'job.publish',
      workflowNodes: {
        emit_1: {
          type: 'event',
          eventName: 'job.publish',
          payloadParams: [
            { key: 'cod_vaga', value: '{{ steps.set_1.output.cod_vaga }}' },
            { key: 'teste', value: '{{ steps.generateUUID_1.output.uuid }}' },
          ],
        },
      },
      nodeStatuses: {
        generateUUID_1: {
          status: 'success',
          output: { uuid: '4f41f350-f37c-41ec-88f3-c9c7851ec3a9' },
        },
        set_1: {
          status: 'success',
          output: { cod_vaga: '4f41f350-f37c-41ec-88f3-c9c7851ec3a9' },
        },
      },
    })

    assert.deepEqual(preview, {
      cod_vaga: '4f41f350-f37c-41ec-88f3-c9c7851ec3a9',
      teste: '4f41f350-f37c-41ec-88f3-c9c7851ec3a9',
    })
  })
})
