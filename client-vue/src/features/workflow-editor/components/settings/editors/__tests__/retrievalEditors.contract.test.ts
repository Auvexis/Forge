import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('editor registry maps retrieval nodes to dedicated editors', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/index.ts')

  for (const editor of ['TextDatasetEditor', 'FileDatasetEditor', 'DatabaseDatasetEditor', 'EmbeddingsEditor', 'VectorStoreEditor', 'RetrieverEditor']) {
    assert.match(source, new RegExp(`import ${editor} from './${editor}\\.vue'`))
  }

  assert.match(source, /'text-dataset': TextDatasetEditor/)
  assert.match(source, /'file-dataset': FileDatasetEditor/)
  assert.match(source, /'database-dataset': DatabaseDatasetEditor/)
  assert.match(source, /embeddings: EmbeddingsEditor/)
  assert.match(source, /'vector-store': VectorStoreEditor/)
  assert.match(source, /retriever: RetrieverEditor/)
})

test('dataset editors expose chunking and contextual overlap controls', () => {
  for (const editor of ['TextDatasetEditor', 'FileDatasetEditor', 'DatabaseDatasetEditor']) {
    const source = read(`src/features/workflow-editor/components/settings/editors/${editor}.vue`)
    assert.match(source, /chunking/)
    assert.match(source, /contextualOverlapEnabled/)
    assert.match(source, /maxPreviousContextChars/)
    assert.match(source, /BaseSwitch/)
  }
})

test('file dataset editor uses the dedicated multiple files input', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/FileDatasetEditor.vue')

  assert.match(source, /import FileDatasetFilesInput from '.\/FileDatasetFilesInput\.vue'/)
  assert.match(source, /<FileDatasetFilesInput/)
  assert.match(source, /FORMAT_OPTIONS/)
  assert.match(source, /BaseSelect/)
  assert.doesNotMatch(source, /EditorField label="File Path"/)
  assert.doesNotMatch(source, /EditorField label="File URL"/)
})

test('text dataset editor uses a format select with supported formats', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/TextDatasetEditor.vue')

  assert.match(source, /FORMAT_OPTIONS/)
  assert.match(source, /value: 'plain-text'/)
  assert.match(source, /value: 'json-array'/)
  assert.match(source, /BaseSelect/)
})

test('document loader editor exposes data mode, type, and metadata template controls', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/DocumentLoaderEditor.vue')

  for (const field of [
    'dataType',
    'dataMode',
    'dataPath',
    'textTemplate',
    'metadataTemplate',
    'includeSourceMetadata',
  ]) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /Load All Input Data/)
  assert.match(source, /Load Specific Data/)
  assert.match(source, /Binary\/File/)
  assert.match(source, /BaseCodeEditor/)
  assert.match(source, /useExecutionStore/)
  assert.match(source, /buildDocumentLoaderTemplateSuggestion/)
  assert.match(source, /Regenerate from Data Path/)
  assert.doesNotMatch(source, /ExpressionTextarea/)
  assert.doesNotMatch(source, /Document Preview/)
  assert.doesNotMatch(source, /document-preview/)
  assert.doesNotMatch(source, /metadata-preview/)
  assert.match(source, /updateMetadataTemplate/)
  assert.match(source, /Path inside the incoming data/)
})

test('vector store editor exposes Pinecone and Qdrant provider config sections', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/VectorStoreEditor.vue')

  for (const field of ['pluginId', 'collectionName', 'dimension', 'metric', 'config']) {
    assert.match(source, new RegExp(field))
  }

  assert.doesNotMatch(source, /label="Provider Plugin"/)
  assert.match(source, /METRIC_OPTIONS/)
  assert.match(source, /METHOD_OPTIONS/)
  assert.match(source, /ensureCollectionMethodId/)
  assert.match(source, /upsertMethodId/)
  assert.match(source, /queryMethodId/)
  assert.match(source, /sailor-pinecone/)
  assert.match(source, /sailor-qdrant/)
  assert.match(source, /localHost/)
  assert.match(source, /namespace/)
  assert.match(source, /host/)
  assert.match(source, /config\.url/)
  assert.match(source, /self-hosted/)
  assert.match(source, /preferGrpc/)
  assert.match(source, /tls/)
  assert.match(source, /timeoutMs/)
})

test('database dataset editor uses plugin and method selects with credential management', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/DatabaseDatasetEditor.vue')

  assert.match(source, /pluginsApi\.getAll/)
  assert.match(source, /databasePluginOptions/)
  assert.match(source, /methodOptions/)
  assert.match(source, /isDatabasePlugin/)
  assert.match(source, /BaseSelect/)
  assert.match(source, /Credential/)
  assert.match(source, /openCredentialsFor/)
  assert.match(source, /Manage Credentials/)
  assert.doesNotMatch(source, /PluginMenuAuth/)
})

test('vector store editor owns retrieval query and output settings', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/VectorStoreEditor.vue')

  for (const field of ['query', 'topK', 'outputMode', 'maxContextChars', 'filter']) {
    assert.match(source, new RegExp(field))
  }
})

test('vector store editor uses mode selectors for local, cloud, and self-hosted provider modes', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/VectorStoreEditor.vue')

  assert.match(source, /BaseSelect/)
  assert.match(source, /PINECONE_MODES/)
  assert.match(source, /QDRANT_MODES/)
  assert.match(source, /value: 'local'/)
  assert.match(source, /value: 'cloud'/)
  assert.match(source, /value: 'self-hosted'/)
})

test('vector store editor writes Qdrant endpoint fields to config.url expected by the plugin', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/VectorStoreEditor.vue')
  const qdrantSection = source.slice(source.indexOf(`<template v-if="pluginId === 'sailor-qdrant'">`))

  assert.match(qdrantSection, /:model-value="config\.url \|\| ''"/)
  assert.match(qdrantSection, /updateConfig\(\{ url: \$event as string \}\)/)
  assert.doesNotMatch(qdrantSection, /updateConfig\(\{ host:/)
  assert.doesNotMatch(qdrantSection, /updateConfig\(\{ localHost:/)
})

test('dataset editors use BaseSwitch for contextual overlap carry-over', () => {
  for (const editor of ['TextDatasetEditor', 'FileDatasetEditor', 'DatabaseDatasetEditor']) {
    const source = read(`src/features/workflow-editor/components/settings/editors/${editor}.vue`)
    assert.match(source, /BaseSwitch/)
    assert.match(source, /contextualOverlapEnabled/)
    assert.match(source, /Carry previous chunk context/)
  }
})

test('vector store editor can select and manage plugin credentials for cloud and self-hosted modes', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/VectorStoreEditor.vue')

  assert.match(source, /useSettingsStore/)
  assert.match(source, /fetchCredential/)
  assert.match(source, /openCredentialsFor/)
  assert.match(source, /apiKeyCredentialId/)
  assert.match(source, /credentialOptions/)
  assert.match(source, /Manage Credentials/)
})

test('retrieval editors show validation hints for vector config and search limits', () => {
  const vectorStore = read('src/features/workflow-editor/components/settings/editors/VectorStoreEditor.vue')
  const embeddings = read('src/features/workflow-editor/components/settings/editors/EmbeddingsEditor.vue')
  const retriever = read('src/features/workflow-editor/components/settings/editors/RetrieverEditor.vue')

  for (const hint of [
    'Must match the embedding dimension',
    'Collection or index name',
    'Namespace keeps tenants or environments separated',
    'Use the full URL',
  ]) {
    assert.match(vectorStore, new RegExp(hint))
  }

  assert.match(embeddings, /Must match the vector store dimension/)
  assert.match(retriever, /Must be greater than 0/)
  assert.match(retriever, /Score threshold is optional/)
})

test('embeddings and retriever editors expose retrieval controls', () => {
  const embeddings = read('src/features/workflow-editor/components/settings/editors/EmbeddingsEditor.vue')
  const retriever = read('src/features/workflow-editor/components/settings/editors/RetrieverEditor.vue')

  assert.doesNotMatch(embeddings, /label="Provider Plugin"/)
  assert.doesNotMatch(embeddings, /label="Method"/)

  for (const field of ['model', 'dimension', 'input', 'batchSize']) {
    assert.match(embeddings, new RegExp(field))
  }

  for (const field of ['query', 'topK', 'scoreThreshold', 'outputMode', 'maxContextChars']) {
    assert.match(retriever, new RegExp(field))
  }
})
