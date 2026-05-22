import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  extractPluginCreatorMethodBlock,
  hasPluginCreatorMethodSteps,
  resolvePluginCreatorSelectedNodePreview,
  resolvePluginCreatorMethodHandle,
} from '../usePluginCreatorMethodPreview.ts'
import type { PluginBlueprint } from '@/core/types/plugin-creator.types'

const generatedMethodsSource = `import type { PluginContext } from "@auvexis/sailor-sdk";

export const methods = {
  method1: async (params: Record<string, unknown>) => {
    const request = {
      url: "https://api.example.com/{{ params.id }}",
      body: { value: "{still string}" },
    };
    return request;
  },
  method2: async (params: Record<string, unknown>) => {
    return { ok: true };
  }
};

function buildUrl(url: string): string {
  return url;
}
`

describe('usePluginCreatorMethodPreview', () => {
  it('extracts only the selected generated method block', () => {
    const block = extractPluginCreatorMethodBlock(generatedMethodsSource, 'method1')

    assert.match(block, /method1: async/)
    assert.match(block, /https:\/\/api\.example\.com/)
    assert.doesNotMatch(block, /import type/)
    assert.doesNotMatch(block, /method2: async/)
    assert.doesNotMatch(block, /function buildUrl/)
  })

  it('falls back to the full source when the generated method cannot be found', () => {
    assert.equal(
      extractPluginCreatorMethodBlock(generatedMethodsSource, 'missingMethod'),
      generatedMethodsSource.trim(),
    )
  })

  it('resolves the method handle from the selected node methodId', () => {
    const blueprint = {
      methods: [
        { id: 'method-a', handle: 'firstMethod' },
        { id: 'method-b', handle: 'selectedMethod' },
      ],
      canvas: {
        nodes: {
          selected: { data: { methodId: 'method-b' } },
        },
      },
    } as PluginBlueprint

    assert.equal(resolvePluginCreatorMethodHandle(blueprint, 'selected'), 'selectedMethod')
  })

  it('falls back to the first method handle when no selected node has a methodId', () => {
    const blueprint = {
      methods: [{ id: 'method-a', handle: 'firstMethod' }],
      canvas: { nodes: {} },
    } as PluginBlueprint

    assert.equal(resolvePluginCreatorMethodHandle(blueprint, null), 'firstMethod')
  })

  it('treats an empty canvas or method-only canvas as no method steps', () => {
    const emptyBlueprint = {
      methods: [{ id: 'method-a', handle: 'firstMethod' }],
      canvas: { nodes: {} },
    } as PluginBlueprint
    const methodOnlyBlueprint = {
      methods: [{ id: 'method-a', handle: 'firstMethod' }],
      canvas: {
        nodes: {
          method: { id: 'method', type: 'method', data: { methodId: 'method-a' } },
        },
      },
    } as PluginBlueprint

    assert.equal(hasPluginCreatorMethodSteps(emptyBlueprint, 'firstMethod'), false)
    assert.equal(hasPluginCreatorMethodSteps(methodOnlyBlueprint, 'firstMethod'), false)
  })

  it('detects real method steps for the generated preview', () => {
    const blueprint = {
      methods: [{ id: 'method-a', handle: 'firstMethod' }],
      canvas: {
        nodes: {
          method: { id: 'method', type: 'method', data: { methodId: 'method-a' } },
          request: { id: 'request', type: 'request', data: { methodId: 'method-a' } },
        },
      },
    } as PluginBlueprint

    assert.equal(hasPluginCreatorMethodSteps(blueprint, 'firstMethod'), true)
  })

  it('uses selected code block source instead of compiled method internals', () => {
    const blueprint = {
      methods: [
        {
          id: 'method-a',
          handle: 'method1',
          codeBlocks: [
            {
              id: 'code-shape',
              name: 'Shape response',
              source: 'return { id: previous.id };',
            },
          ],
        },
      ],
      canvas: {
        nodes: {
          method: { id: 'method', type: 'method', data: { methodId: 'method-a' } },
          code: {
            id: 'code',
            type: 'codeBlock',
            data: { methodId: 'method-a', codeBlockId: 'code-shape' },
          },
        },
      },
    } as PluginBlueprint

    const preview = resolvePluginCreatorSelectedNodePreview({
      blueprint,
      selectedNodeId: 'code',
    })

    assert.equal(preview.code, 'return { id: previous.id };')
    assert.equal(preview.label, 'Shape response code block')
    assert.doesNotMatch(preview.code, /method1: async/)
    assert.doesNotMatch(preview.code, /fetch/)
  })

  it('summarizes selected method instead of showing compiled generated source', () => {
    const blueprint = {
      methods: [{ id: 'method-a', handle: 'method1', name: 'Method 1' }],
      canvas: {
        nodes: {
          method: { id: 'method', type: 'method', data: { methodId: 'method-a' } },
          request: { id: 'request', type: 'request', data: { methodId: 'method-a' } },
        },
      },
    } as PluginBlueprint

    const preview = resolvePluginCreatorSelectedNodePreview({
      blueprint,
      selectedNodeId: 'method',
    })

    assert.equal(preview.label, 'Method 1 method')
    assert.match(preview.code, /handle: method1/)
    assert.doesNotMatch(preview.code, /method1: async/)
    assert.doesNotMatch(preview.code, /fetch/)
  })
})
