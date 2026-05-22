import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  extractPluginCreatorMethodBlock,
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
})
