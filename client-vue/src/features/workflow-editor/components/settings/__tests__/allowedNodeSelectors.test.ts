import assert from 'node:assert/strict'
import test from 'node:test'
import {
  allowedNodeSelectorsPermitPlugin,
  allowedNodeSelectorsPermitPreset,
} from '../allowedNodeSelectors.ts'

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
