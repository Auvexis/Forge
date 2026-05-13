import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildTemporaryFormUrl,
  buildTemporaryFormUrlPreview,
  resolveWaitFormRuntimeSlug,
} from '../waitFormRuntimeUrls.ts'

describe('wait form runtime urls', () => {
  it('resolves event-listener output templates to the same sanitized temporary form slug as the server', () => {
    const preview = resolveWaitFormRuntimeSlug(
      'job-{{ steps.event-listener_1.output.cod_vaga }}',
      {
        steps: {
          'event-listener_1': {
            output: { cod_vaga: '4f41f350-f37c-41ec-88f3-c9c7851ec3a9' },
          },
        },
      },
    )

    assert.deepEqual(preview, {
      slug: 'job-4f41f350-f37c-41ec-88f3-c9c7851ec3a9',
      hasTemplate: true,
      isResolved: true,
    })
  })

  it('does not expose a clickable URL while a template still has no runtime value', () => {
    const preview = resolveWaitFormRuntimeSlug(
      'job-{{ steps.event-listener_1.output.cod_vaga }}',
      { steps: {} },
    )

    assert.equal(preview.slug, '')
    assert.equal(preview.hasTemplate, true)
    assert.equal(preview.isResolved, false)
    assert.equal(buildTemporaryFormUrl('http://localhost:23802', preview.slug), '')
  })

  it('builds a copyable temporary form preview url with generated placeholders', () => {
    assert.equal(
      buildTemporaryFormUrlPreview('http://localhost:23802', '<generated-on-execution>'),
      'http://localhost:23802/temporary-forms/<generated-on-execution>',
    )

    assert.equal(
      buildTemporaryFormUrlPreview(
        'http://localhost:23802',
        '<generated after upstream values exist>',
      ),
      'http://localhost:23802/temporary-forms/<generated after upstream values exist>',
    )
  })
})
