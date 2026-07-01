import assert from 'node:assert/strict'
import test from 'node:test'
import type { WorkflowNodeCatalogItem, WorkflowNodeHandleDefinition } from '@/core/types/workflow-node-catalog.types'
import { matchesNodeDefinition, nextConnectionAction, shouldShowQuickAdd } from '../nodeCapabilityMatcher.ts'

const candidate = (capabilities: string[], providerId?: string): WorkflowNodeCatalogItem => ({
  type: 'embeddings', label: 'Candidate', description: '', category: 'AI', packId: 'test', packName: 'Test',
  role: 'configuration', capabilities, handles: [], presentation: { base: 'standard' },
  style: { icon: 'box', iconColor: '#000', bgColor: '#fff', borderColor: '#ccc' },
  ...(providerId ? { providerId } : {}),
} as WorkflowNodeCatalogItem)

const handle = (overrides: Partial<WorkflowNodeHandleDefinition> = {}): WorkflowNodeHandleDefinition => ({
  id: 'embedding', label: 'Embedding', type: 'target', position: 'bottom',
  accepts: [{ capability: 'embedding-model' }], cardinality: 'one', connectionPolicy: 'replace',
  quickAdd: 'capability', ...overrides,
})

test('matches candidates by capability and optional explicit restrictions', () => {
  assert.equal(matchesNodeDefinition(handle(), candidate(['embedding-model'])), true)
  assert.equal(matchesNodeDefinition(handle(), candidate(['chat-model'])), false)
  assert.equal(matchesNodeDefinition(handle({ allowedNodes: ['node:embeddings'] }), candidate(['embedding-model'])), true)
  assert.equal(matchesNodeDefinition(handle({ allowedNodes: ['node:ai-model'] }), candidate(['embedding-model'])), false)
})

test('applies provider restrictions and rejects selecting the consumer itself', () => {
  assert.equal(matchesNodeDefinition(handle({ accepts: [{ capability: 'embedding-model', providerId: 'openai' }] }), candidate(['embedding-model'], 'ollama')), false)
  assert.equal(matchesNodeDefinition(handle(), candidate(['embedding-model']), { candidateId: 'same', consumerId: 'same' }), false)
})

test('derives persistent quick add and connection actions from handle policy', () => {
  assert.equal(shouldShowQuickAdd(handle({ quickAddAfterConnected: true }), 1), true)
  assert.equal(nextConnectionAction(handle(), 1), 'replace')
  assert.equal(nextConnectionAction(handle({ cardinality: 'many', connectionPolicy: 'append' }), 3), 'append')
  assert.equal(nextConnectionAction(handle({ connectionPolicy: undefined }), 1), 'blocked')
})
