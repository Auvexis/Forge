import assert from 'node:assert/strict'
import test from 'node:test'

import { getInputContextNodes } from '../nodeInputContext.ts'

const node = (id: string, type: string) => ({
  id,
  type,
  data: { type, name: id },
  position: { x: 0, y: 0 },
})

const isConfigurationEdge = (edge: { targetHandle?: string | null }) =>
  edge.targetHandle === 'embedding' || edge.targetHandle === 'document'

test('advanced configuration children inherit their parent input context', () => {
  const nodes = [
    node('trigger', 'trigger'),
    node('vector', 'vector-store'),
    node('embeddings_1', 'embeddings'),
    node('text-dataset_1', 'text-dataset'),
  ]
  const edges = [
    { id: 'trigger-vector', source: 'trigger', target: 'vector', sourceHandle: 'source', targetHandle: 'target' },
    { id: 'embedding-vector', source: 'embeddings_1', target: 'vector', sourceHandle: 'source', targetHandle: 'embedding' },
    { id: 'dataset-vector', source: 'text-dataset_1', target: 'vector', sourceHandle: 'source', targetHandle: 'document' },
  ]

  assert.deepEqual(
    getInputContextNodes({ currentId: 'embeddings_1', nodes, edges, isConfigurationEdge }).map((item) => item.id),
    ['trigger', 'embeddings_1', 'text-dataset_1'],
  )
})

test('ordinary nodes keep their own upstream input context', () => {
  const nodes = [
    node('trigger', 'trigger'),
    node('set_1', 'set'),
    node('vector', 'vector-store'),
  ]
  const edges = [
    { id: 'trigger-set', source: 'trigger', target: 'set_1', sourceHandle: 'source', targetHandle: 'target' },
    { id: 'set-vector', source: 'set_1', target: 'vector', sourceHandle: 'source', targetHandle: 'target' },
  ]

  assert.deepEqual(
    getInputContextNodes({ currentId: 'vector', nodes, edges, isConfigurationEdge }).map((item) => item.id),
    ['set_1', 'trigger'],
  )
})
