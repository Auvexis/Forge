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
  const canvas = read('src/features/workflow-editor/components/WorkflowBaseCanvas.vue')

  for (const componentName of ['TextDatasetNode', 'FileDatasetNode', 'DatabaseDatasetNode', 'EmbeddingsNode', 'VectorStoreNode', 'RetrieverNode']) {
    assert.match(canvas, new RegExp(`import ${componentName} from './nodes/${componentName}\\.vue'`))
  }

  assert.match(canvas, /'text-dataset': TextDatasetNode/)
  assert.match(canvas, /'file-dataset': FileDatasetNode/)
  assert.match(canvas, /'database-dataset': DatabaseDatasetNode/)
  assert.match(canvas, /embeddings: EmbeddingsNode/)
  assert.match(canvas, /'vector-store': VectorStoreNode/)
  assert.match(canvas, /retriever: RetrieverNode/)
})

test('workflow canvas defines backend-valid defaults for retrieval nodes added from picker', () => {
  const canvas = read('src/features/workflow-editor/components/WorkflowBaseCanvas.vue')

  for (const [nodeType, defaultName] of [
    ['text-dataset', 'Text Dataset'],
    ['file-dataset', 'Extract From File'],
    ['database-dataset', 'Database Dataset'],
    ['embeddings', 'Embeddings'],
    ['vector-store', 'Vector Store'],
    ['retriever', 'Retriever'],
  ]) {
    const keyPattern = nodeType.includes('-') ? `'${nodeType}'` : nodeType
    assert.match(canvas, new RegExp(`${keyPattern}: '${defaultName}'`))
    assert.match(canvas, new RegExp(`type === '${nodeType}'`))
  }

  for (const field of [
    "format: 'plain-text'",
    "filePath: ''",
    "textColumns: ['body']",
    "ensureCollectionMethodId: 'ensureCollection'",
    "upsertMethodId: 'upsertDocuments'",
    "queryMethodId: 'querySimilar'",
    "metric: 'cosine'",
    "outputMode: 'context'",
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
    ['RetrieverNode', 'RetrieverNode', 'search'],
  ]) {
    const source = read(`src/features/workflow-editor/components/nodes/${componentName}.vue`)
    assert.match(source, new RegExp(`NodeProps<${typeName}>`))
    assert.match(source, /BaseNode/)
    if (componentName === 'RetrieverNode') assert.match(source, /BaseHandle/)
    if (componentName === 'EmbeddingsNode') assert.match(source, /usePluginNodePresentation\(pluginId, 'scan-text'\)/)
    else assert.match(source, new RegExp(`icon="${icon}"`))
  }
})

test('embedding models reuse plugin presentation instead of hardcoded catalog colors', () => {
  const source = read('src/features/workflow-editor/components/nodes/EmbeddingsNode.vue')
  assert.match(source, /usePluginNodePresentation/)
  assert.match(source, /:icon="pluginIcon"/)
  assert.match(source, /customBg/)
  assert.doesNotMatch(source, /icon="scan-text"/)
  assert.match(source, /customBg \|\| 'transparent'/)
  assert.match(source, /customBorder \|\| 'var\(--fabric-node-border\)'/)
  assert.match(source, /customIconColor \|\| 'var\(--fabric-node-plugin-icon\)'/)
})

test('retrieval node components use their catalog colors instead of generic node tokens', () => {
  const expectedColors = {
    TextDatasetNode: ['#0f766e', '#f0fdfa', '#5eead4'],
    FileDatasetNode: ['#2563eb', '#eff6ff', '#93c5fd'],
    DatabaseDatasetNode: ['#7c3aed', '#f5f3ff', '#c4b5fd'],
    EmbeddingsNode: [],
    RetrieverNode: ['#65a30d', '#f7fee7', '#bef264'],
  }

  for (const [componentName, colors] of Object.entries(expectedColors)) {
    const source = read(`src/features/workflow-editor/components/nodes/${componentName}.vue`)
    assert.doesNotMatch(source, /--fabric-node-(?:ai|if|merge)-/)
    for (const color of colors) assert.match(source, new RegExp(color))
  }
})

test('vector store exposes embedding and document configuration handles', () => {
  const source = read('src/features/workflow-editor/components/nodes/VectorStoreNode.vue')
  const definitions = read('src/features/workflow-editor/layout/advancedNodeDefinitions.ts')
  const quickAdd = read('src/features/workflow-editor/components/QuickAddButton.vue')
  const vectorSection = definitions.slice(
    definitions.indexOf('export const VECTOR_STORE_HANDLERS'),
    definitions.indexOf('export const CONFIGURATION_SOURCE_HANDLER'),
  )

  assert.match(source, /BaseAdvancedNode/)
  assert.match(source, /getAdvancedNodeHandlers/)
  assert.match(source, /getAdvancedNodeHandlers\('vector-store'\)/)
  assert.match(source, /auto-organize/)
  assert.match(vectorSection, /capability:embedding-model/)
  assert.doesNotMatch(vectorSection, /node:embeddings/)
  assert.doesNotMatch(vectorSection, /node:document-loader/)
  assert.match(vectorSection, /node:file-dataset/)
  assert.match(vectorSection, /node:text-dataset/)
  assert.match(vectorSection, /node:database-dataset/)
  assert.match(source, /usePluginNodePresentation/)
  assert.match(source, /customBg/)
  assert.match(source, /customBorder/)
  assert.match(source, /customIconColor/)
  assert.match(source, /database-zap/)
  assert.match(source, /<template #icon-left>/)
  assert.doesNotMatch(source, /BaseHandle/)
  assert.doesNotMatch(source, /QuickAddButton/)
  assert.match(quickAdd, /mode\?: 'source' \| NodeQuickAddMode/)
  assert.match(quickAdd, /quickAddMode: props\.mode/)
  assert.match(quickAdd, /allowedNodes: props\.allowedNodes/)
})

test('vector configuration children are circular and connect from the top', () => {
  for (const componentName of ['EmbeddingsNode', 'TextDatasetNode', 'FileDatasetNode', 'DatabaseDatasetNode']) {
    const source = read(`src/features/workflow-editor/components/nodes/${componentName}.vue`)
    assert.match(source, /rounded="full"/)
    assert.match(source, /CONFIGURATION_SOURCE_HANDLER/)
    assert.match(source, /width="100px"/)
    assert.match(source, /height="100px"/)
    assert.match(source, /:handlers="\[CONFIGURATION_SOURCE_HANDLER\]"/)
    assert.doesNotMatch(source, /has-source/)
    assert.doesNotMatch(source, /BaseHandle/)
    assert.doesNotMatch(source, /has-target/)
  }
})

test('advanced handler definitions declare shape and connection-aware quick add behavior', () => {
  const definitions = read('src/features/workflow-editor/layout/advancedNodeDefinitions.ts')

  assert.match(definitions, /CONFIGURATION_SOURCE_HANDLER/)
  assert.match(definitions, /id: 'source'[\s\S]*style: 'diamond'/)
  assert.match(definitions, /id: 'tool'[\s\S]*quickAddAfterConnected: true/)
  assert.match(definitions, /id: 'document'[\s\S]*quickAddAfterConnected: true/)
})

test('vector configuration edges use the shared dashed routing and hide ordinary tools', () => {
  const source = read('src/features/workflow-editor/components/WorkflowEdge.vue')
  const edgeLayer = read('src/features/workflow-editor/components/WorkflowEdgeLayer.vue')

  assert.match(edgeLayer, /getNodeDefinition/)
  assert.match(edgeLayer, /handle\?\.accepts\?\.length/)
  assert.doesNotMatch(source, /CONFIGURATION_TARGET_HANDLES/)
  assert.match(source, /isConfigurationEdge/)
  assert.match(edgeLayer, /makeConfigurationWorkflowEdgePath/)
  assert.match(source, /v-if="!isConfigurationEdge"/)
})
