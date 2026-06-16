import assert from 'node:assert/strict'
import test from 'node:test'

import type { PluginSummary } from '@/core/types/plugin.types'
import {
  buildEmbeddingModelItems,
  buildEmbeddingProviderItems,
  buildPickerActionItems,
  buildPickerCategoryItems,
  buildPickerSecondColumnItems,
  buildVectorStoreProviderItems,
  catalogItemsToPickerPresets,
  filterDefaultPickerPresets,
  type AddNodePickerPreset,
} from '../addNodePickerModel.ts'

function plugin(overrides: Partial<PluginSummary> & { id: string }): PluginSummary {
  return {
    id: overrides.id,
    auth_type: 'none',
    status: {
      status: 'connected',
      auth_type: 'none',
      credential_schema: null,
      credentials: null,
    },
    manifest: {
      metadata: {
        id: overrides.id,
        name: overrides.id,
        description: `${overrides.id} plugin`,
        icon: 'box',
        categories: ['Apps'],
        author: 'Test',
        version: '1.0.0',
        repository: '',
        ...(overrides.manifest?.metadata ?? {}),
      },
      methods: overrides.manifest?.methods ?? {
        listItems: {
          metadata: { label: 'List items', description: 'Read items' },
          parameters: { type: 'object' },
          responseSchema: { type: 'object' },
        },
      },
    },
  }
}

test('picker categories count plugins in every declared category', () => {
  const github = plugin({
    id: 'github',
    manifest: {
      metadata: {
        id: 'github',
        name: 'GitHub',
        description: 'Repository automation',
        icon: 'github',
        categories: ['Apps', 'Developer'],
        author: 'Test',
        version: '1.0.0',
        repository: '',
      },
      methods: {},
    },
  })

  const items = buildPickerCategoryItems({ plugins: [github], presets: [] })

  assert.equal(items.find((item) => item.category === 'Apps')?.count, 1)
  assert.equal(items.find((item) => item.category === 'Developer')?.count, 1)
})

test('vector store preset lists only plugins implementing the generic provider contract', () => {
  const vectorProvider = plugin({
    id: 'vector-provider',
    manifest: {
      metadata: {
        id: 'vector-provider',
        name: 'Vector Provider',
        description: 'Stores vectors',
        icon: 'database-zap',
        categories: ['AI'],
        author: 'Test',
        version: '1.0.0',
        repository: '',
      },
      methods: Object.fromEntries(
        ['ensureCollection', 'upsertDocuments', 'querySimilar', 'deleteDocuments', 'describeCollection']
          .map((methodKey) => [methodKey, {
            metadata: { label: methodKey, description: methodKey },
            parameters: { type: 'object' },
            responseSchema: { type: 'object' },
          }]),
      ),
    },
  })

  const items = buildVectorStoreProviderItems({
    plugins: [vectorProvider, plugin({ id: 'regular-plugin' })],
  })

  assert.deepEqual(items.map((item) => item.plugin.id), ['vector-provider'])
})

test('embedding picker exposes provider models first and their embedding methods second', () => {
  const openai = plugin({
    id: 'sailor-openai',
    manifest: {
      metadata: {
        id: 'sailor-openai',
        name: 'OpenAI',
        description: 'OpenAI models',
        icon: 'openai',
        categories: ['AI'],
        author: 'Test',
        version: '1.0.0',
        repository: '',
      },
      methods: {
        createEmbeddings: {
          metadata: { label: 'Create embeddings', description: 'Create document vectors' },
          parameters: { type: 'object' },
          responseSchema: { type: 'object' },
        },
        embedQuery: {
          metadata: { label: 'Embed query', description: 'Create one query vector' },
          parameters: { type: 'object' },
          responseSchema: { type: 'object' },
        },
        listModels: {
          metadata: { label: 'List models', description: 'List available models' },
          parameters: { type: 'object' },
          responseSchema: { type: 'object' },
        },
      },
    },
  })

  assert.deepEqual(buildEmbeddingModelItems({ plugins: [openai] }).map((item) => item.label), [
    'OpenAI Embedding Model',
  ])
  assert.deepEqual(
    buildEmbeddingProviderItems({ plugins: [openai] }).map((item) => [item.methodKey, item.label]),
    [
      ['createEmbeddings', 'Create embeddings'],
      ['embedQuery', 'Embed query'],
    ],
  )
})

test('picker categories stay visible when search matches an item inside them', () => {
  const items = buildPickerCategoryItems({
    plugins: [
      plugin({
        id: 'youtube',
        manifest: {
          metadata: {
            id: 'youtube',
            name: 'YouTube',
            description: 'Manage videos and channels',
            icon: 'youtube',
            categories: ['Apps'],
            author: 'Test',
            version: '1.0.0',
            repository: '',
          },
          methods: {},
        },
      }),
    ],
    presets: [],
    search: 'youtube',
  })

  assert.deepEqual(items.map((item) => item.category), ['Apps'])
  assert.equal(items[0]?.count, 1)
})

test('second column includes presets and plugins for the selected category', () => {
  const presets: AddNodePickerPreset[] = [
    {
      id: 'switch',
      label: 'Switch',
      description: 'Route by value',
      icon: 'git-branch-plus',
      categories: ['Flow'],
      nodeType: 'switch',
    },
  ]

  const waitPlugin = plugin({
    id: 'wait',
    manifest: {
      metadata: {
        id: 'wait',
        name: 'Wait',
        description: 'Pause execution',
        icon: 'timer',
        categories: ['Flow', 'Core'],
        author: 'Test',
        version: '1.0.0',
        repository: '',
      },
      methods: {},
    },
  })

  const items = buildPickerSecondColumnItems({
    category: 'Flow',
    plugins: [waitPlugin],
    presets,
  })

  assert.deepEqual(items.map((item) => item.id), ['preset:switch', 'plugin:wait'])
})

test('tool context action column keeps only agent-enabled methods', () => {
  const github = plugin({
    id: 'github',
    manifest: {
      metadata: {
        id: 'github',
        name: 'GitHub',
        description: 'Repository automation',
        icon: 'github',
        categories: ['Apps', 'Developer'],
        author: 'Test',
        version: '1.0.0',
        repository: '',
      },
      methods: {
        listIssues: {
          metadata: { label: 'List issues', description: 'Read issues' },
          parameters: { type: 'object' },
          responseSchema: { type: 'object' },
        },
        createIssue: {
          metadata: { label: 'Create issue', description: 'Open an issue' },
          parameters: { type: 'object' },
          responseSchema: { type: 'object' },
          agentTool: { enabled: true, sideEffect: 'write', requiresApproval: true },
        },
      },
    },
  })

  const items = buildPickerActionItems({ plugin: github, agentConfigHandle: 'tool' })

  assert.deepEqual(items.map((item) => item.methodKey), ['createIssue'])
})

test('catalog items map to utility picker presets with style metadata', () => {
  const presets = catalogItemsToPickerPresets([
    {
      type: 'code',
      label: 'Code Block',
      description: 'Run code',
      category: 'Developer',
      packId: 'sailor-core',
      packName: 'Sailor Core',
      role: 'configuration',
      capabilities: ['output-parser'],
      handles: [],
      presentation: { base: 'standard' },
      style: {
        icon: 'code-2',
        iconColor: '#60a5fa',
        bgColor: '#eff6ff',
        borderColor: '#93c5fd',
      },
    },
  ])

  assert.deepEqual(presets, [
    {
      id: 'code',
      nodeType: 'code',
      label: 'Code Block',
      description: 'Run code',
      icon: 'code-2',
      categories: ['Developer'],
      style: {
        icon: 'code-2',
        iconColor: '#60a5fa',
        bgColor: '#eff6ff',
        borderColor: '#93c5fd',
      },
      role: 'configuration',
      capabilities: ['output-parser'],
    },
  ])
})

test('catalog retrieval nodes appear as picker presets in their catalog categories', () => {
  const presets = catalogItemsToPickerPresets([
    {
      type: 'text-dataset',
      label: 'Text Dataset',
      description: 'Load text items',
      category: 'Data transformation',
      packId: 'sailor-core',
      packName: 'Sailor Core',
      style: {
        icon: 'text',
        iconColor: '#0ea5e9',
        bgColor: '#ecfeff',
        borderColor: '#67e8f9',
      },
    },
    {
      type: 'vector-store',
      label: 'Vector Store',
      description: 'Upsert and query vectors',
      category: 'AI',
      packId: 'sailor-core',
      packName: 'Sailor Core',
      style: {
        icon: 'database-zap',
        iconColor: '#8b5cf6',
        bgColor: '#f5f3ff',
        borderColor: '#c4b5fd',
      },
    },
    {
      type: 'retriever',
      label: 'Retriever',
      description: 'Fetch relevant vector matches',
      category: 'AI',
      packId: 'sailor-core',
      packName: 'Sailor Core',
      style: {
        icon: 'search',
        iconColor: '#f97316',
        bgColor: '#fff7ed',
        borderColor: '#fdba74',
      },
    },
  ])

  assert.deepEqual(presets.map((preset) => preset.nodeType), ['text-dataset', 'vector-store', 'retriever'])
  assert.equal(buildPickerCategoryItems({ plugins: [], presets }).find((item) => item.category === 'AI')?.count, 2)
  assert.equal(buildPickerCategoryItems({ plugins: [], presets }).find((item) => item.category === 'Data transformation')?.count, 1)
  assert.deepEqual(
    buildPickerSecondColumnItems({ category: 'AI', plugins: [], presets }).map((item) => item.id),
    ['preset:vector-store', 'preset:retriever'],
  )
})

test('default picker hides contextual AI and vector configuration nodes', () => {
  const presets: AddNodePickerPreset[] = [
    { id: 'ai-agent', nodeType: 'ai-agent', label: 'AI Agent', description: '', icon: 'bot', categories: ['AI'] },
    { id: 'ai-model', nodeType: 'ai-model', label: 'AI Model', description: '', icon: 'brain', categories: ['AI'] },
    { id: 'ai-memory', nodeType: 'ai-memory', label: 'AI Memory', description: '', icon: 'database', categories: ['AI'] },
    { id: 'ai-tool', nodeType: 'ai-tool', label: 'AI Tool', description: '', icon: 'wrench', categories: ['AI'] },
    { id: 'embeddings', nodeType: 'embeddings', label: 'Embeddings', description: '', icon: 'scan-text', categories: ['AI'] },
    { id: 'document-loader', nodeType: 'document-loader', label: 'Default Data Loader', description: '', icon: 'file-search', categories: ['AI'] },
    { id: 'vector-store', nodeType: 'vector-store', label: 'Vector Store', description: '', icon: 'database', categories: ['AI'] },
    { id: 'retriever', nodeType: 'retriever', label: 'Retriever', description: '', icon: 'search', categories: ['AI'] },
  ]
  const visibleTypes = filterDefaultPickerPresets(presets).map((preset) => preset.nodeType)

  assert.deepEqual(visibleTypes, ['ai-agent', 'vector-store'])
})

test('document quick add presents the default loader before compatibility document sources', () => {
  const presets: AddNodePickerPreset[] = [
    { id: 'text-dataset', nodeType: 'text-dataset', label: 'Text Dataset', description: '', icon: 'text', categories: ['Data transformation'], capabilities: ['document-source'] },
    { id: 'database-dataset', nodeType: 'database-dataset', label: 'Database Dataset', description: '', icon: 'table-2', categories: ['Data transformation'], capabilities: ['document-source'] },
    { id: 'document-loader', nodeType: 'document-loader', label: 'Default Data Loader', description: '', icon: 'file-search', categories: ['AI'], capabilities: ['document-source'] },
  ]

  const items = buildPickerSecondColumnItems({
    category: 'AI',
    plugins: [],
    presets,
    preferredNodeTypes: ['document-loader', 'text-dataset', 'database-dataset'],
  })

  assert.deepEqual(items.map((item) => item.id), ['preset:document-loader'])
})

test('data quick add keeps extraction sources in the file data category', () => {
  const presets: AddNodePickerPreset[] = [
    { id: 'text-dataset', nodeType: 'text-dataset', label: 'Text Dataset', description: '', icon: 'text', categories: ['Data transformation'], capabilities: ['document-source'] },
    { id: 'file-dataset', nodeType: 'file-dataset', label: 'Extract From File', description: 'Extract structured file data', icon: 'file-text', categories: ['Data transformation'], capabilities: ['file-data-source'] },
    { id: 'database-dataset', nodeType: 'database-dataset', label: 'Database Dataset', description: '', icon: 'table-2', categories: ['Data transformation'], capabilities: ['document-source'] },
  ]

  const items = buildPickerSecondColumnItems({
    category: 'Data transformation',
    plugins: [],
    presets,
    preferredNodeTypes: ['file-dataset', 'text-dataset', 'database-dataset'],
  })

  assert.deepEqual(items.map((item) => item.id), ['preset:file-dataset', 'preset:text-dataset', 'preset:database-dataset'])
})
