import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('workflow types expose retrieval utility nodes', () => {
  const types = read('src/core/types/workflow.types.ts')

  for (const nodeType of ['text-dataset', 'file-dataset', 'database-dataset', 'embeddings', 'vector-store', 'retriever']) {
    assert.match(types, new RegExp(`\\| '${nodeType}'`))
  }

  for (const typeName of ['DatasetChunkingConfig', 'DatasetItem', 'DatasetOutput', 'VectorDocument', 'VectorQuery', 'VectorSearchResult', 'VectorCollectionInfo', 'VectorStoreProviderConfig', 'TextDatasetNode', 'FileDatasetNode', 'DatabaseDatasetNode', 'EmbeddingsNode', 'VectorStoreNode', 'RetrieverNode']) {
    assert.match(types, new RegExp(`export interface ${typeName}`))
  }

  assert.match(types, /contextualOverlapEnabled: boolean/)
  assert.match(types, /maxPreviousContextChars\?: number/)
  assert.match(types, /count: number/)
  assert.match(types, /raw\?: any/)
  assert.match(types, /export type VectorStoreMethodId =/)
  assert.match(types, /export type VectorDistanceMetric = 'cosine' \| 'dot' \| 'euclidean'/)
  assert.doesNotMatch(types, /dotproduct/)
})

test('workflow canvas registers retrieval node renderers', () => {
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')

  for (const componentName of ['TextDatasetNode', 'FileDatasetNode', 'DatabaseDatasetNode', 'EmbeddingsNode', 'VectorStoreNode', 'RetrieverNode']) {
    assert.match(canvas, new RegExp(`import ${componentName} from './nodes/${componentName}\\.vue'`))
  }

  for (const slotName of ['text-dataset', 'file-dataset', 'database-dataset', 'embeddings', 'vector-store', 'retriever']) {
    assert.match(canvas, new RegExp(`#node-${slotName}="nodeProps"`))
  }
})

test('workflow canvas defines backend-valid defaults for retrieval nodes added from picker', () => {
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')

  for (const [nodeType, defaultName] of [
    ['text-dataset', 'Text Dataset'],
    ['file-dataset', 'File Dataset'],
    ['database-dataset', 'Database Dataset'],
    ['embeddings', 'Embeddings'],
    ['vector-store', 'Vector Store'],
    ['retriever', 'Retriever'],
  ]) {
    assert.match(canvas, new RegExp(`'${nodeType}': '${defaultName}'`))
    assert.match(canvas, new RegExp(`type === '${nodeType}'`))
  }

  for (const field of [
    "defaultData.format = 'plain-text'",
    "defaultData.filePath = '",
    "defaultData.textColumns = ['body']",
    "defaultData.ensureCollectionMethodId = 'ensureCollection'",
    "defaultData.upsertMethodId = 'upsertDocuments'",
    "defaultData.queryMethodId = 'querySimilar'",
    "defaultData.metric = 'cosine'",
    "defaultData.outputMode = 'context'",
  ]) {
    assert.match(canvas, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('retrieval node components render typed BaseNode shells', () => {
  for (const [componentName, typeName, icon] of [
    ['TextDatasetNode', 'TextDatasetNode', 'text'],
    ['FileDatasetNode', 'FileDatasetNode', 'file-text'],
    ['DatabaseDatasetNode', 'DatabaseDatasetNode', 'table-2'],
    ['EmbeddingsNode', 'EmbeddingsNode', 'scan-text'],
    ['VectorStoreNode', 'VectorStoreNode', 'database-zap'],
    ['RetrieverNode', 'RetrieverNode', 'search'],
  ]) {
    const source = read(`src/features/workflow-editor/components/nodes/${componentName}.vue`)
    assert.match(source, new RegExp(`NodeProps<${typeName}>`))
    assert.match(source, /BaseNode/)
    assert.match(source, /BaseHandle/)
    assert.match(source, new RegExp(`icon="${icon}"`))
  }
})
