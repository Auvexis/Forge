import assert from 'node:assert/strict'
import test from 'node:test'

import type { PluginSummary } from '@/core/types/plugin.types'
import {
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

test('default picker can omit the deprecated retriever preset while keeping vector store', () => {
  const presets: AddNodePickerPreset[] = [
    { id: 'vector-store', nodeType: 'vector-store', label: 'Vector Store', description: '', icon: 'database', categories: ['AI'] },
    { id: 'retriever', nodeType: 'retriever', label: 'Retriever', description: '', icon: 'search', categories: ['AI'] },
  ]
  const visibleTypes = filterDefaultPickerPresets(presets)

  assert.deepEqual(visibleTypes.map((preset) => preset.nodeType), ['vector-store'])
  assert.equal(visibleTypes.some((preset) => preset.nodeType === 'retriever'), false)
})
