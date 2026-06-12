import assert from 'node:assert/strict'
import test from 'node:test'
import type { PluginSummary } from '@/core/types/plugin.types'
import {
  allowedNodeSelectorsPermitPlugin,
  allowedNodeSelectorsPermitPreset,
  pluginAllowedNodeCapabilities,
} from '../allowedNodeSelectors.ts'

function plugin(options: {
  id: string
  chatModel?: boolean
  memoryStore?: boolean
  agentTool?: boolean
  embedding?: boolean
  vectorStore?: boolean
}): PluginSummary {
  const methods: Record<string, any> = {}
  if (options.agentTool) {
    methods.runTool = {
      metadata: { label: 'Run tool', description: 'Run tool' },
      parameters: { type: 'object' },
      responseSchema: { type: 'object' },
      agentTool: { enabled: true },
    }
  }
  if (options.embedding) {
    methods.createEmbeddings = {
      metadata: { label: 'Create embeddings', description: 'Embed text' },
      parameters: { type: 'object' },
      responseSchema: { type: 'object' },
    }
  }
  if (options.vectorStore) {
    for (const methodId of ['ensureCollection', 'upsertDocuments', 'querySimilar', 'deleteDocuments', 'describeCollection']) {
      methods[methodId] = {
        metadata: { label: methodId, description: methodId },
        parameters: { type: 'object' },
        responseSchema: { type: 'object' },
      }
    }
  }

  return {
    id: options.id,
    auth_type: 'none',
    status: { status: 'connected', auth_type: 'none', credential_schema: null, credentials: null },
    manifest: {
      metadata: {
        id: options.id,
        name: options.id,
        description: options.id,
        icon: 'box',
        categories: ['AI'],
        author: 'Test',
        version: '1.0.0',
        repository: '',
        agentCapabilities: {
          chatModel: options.chatModel ? { enabled: true } : undefined,
          memoryStore: options.memoryStore ? { enabled: true } : undefined,
        },
      },
      methods,
    },
  }
}

test('empty selectors deny every picker entry and wildcard allows every entry', () => {
  assert.equal(
    allowedNodeSelectorsPermitPreset([], { id: 'text', nodeType: 'text-dataset' }),
    false,
  )
  assert.equal(
    allowedNodeSelectorsPermitPreset('*', { id: 'text', nodeType: 'text-dataset' }),
    true,
  )
})

test('namespaced selectors match nodes, presets, and plugins without collisions', () => {
  assert.equal(
    allowedNodeSelectorsPermitPreset(
      ['node:text-dataset'],
      { id: 'text', nodeType: 'text-dataset' },
    ),
    true,
  )
  assert.equal(
    allowedNodeSelectorsPermitPreset(
      ['preset:sqlite-memory'],
      { id: 'sqlite-memory', nodeType: 'ai-memory' },
    ),
    true,
  )
  assert.equal(
    allowedNodeSelectorsPermitPlugin(
      ['plugin:openai'],
      { id: 'openai', capabilities: [] },
    ),
    true,
  )
  assert.equal(
    allowedNodeSelectorsPermitPlugin(
      ['plugin:openai'],
      { id: 'openrouter', capabilities: [] },
    ),
    false,
  )
})

test('capability selectors allow only compatible plugins', () => {
  assert.equal(
    allowedNodeSelectorsPermitPlugin(
      ['capability:chat-model'],
      { id: 'openai', capabilities: ['chat-model'] },
    ),
    true,
  )
  assert.equal(
    allowedNodeSelectorsPermitPlugin(
      ['capability:chat-model'],
      { id: 'file', capabilities: [] },
    ),
    false,
  )
})

test('plugin capabilities derive from manifests instead of plugin names', () => {
  assert.deepEqual(pluginAllowedNodeCapabilities(plugin({ id: 'chat', chatModel: true })), ['chat-model'])
  assert.deepEqual(pluginAllowedNodeCapabilities(plugin({ id: 'memory', memoryStore: true })), ['memory-store'])
  assert.deepEqual(pluginAllowedNodeCapabilities(plugin({ id: 'tool', agentTool: true })), ['agent-tool'])
  assert.deepEqual(pluginAllowedNodeCapabilities(plugin({ id: 'embedding', embedding: true })), ['embedding-provider'])
  assert.deepEqual(pluginAllowedNodeCapabilities(plugin({ id: 'vector', vectorStore: true })), ['vector-store-provider'])
})
