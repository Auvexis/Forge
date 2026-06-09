import assert from 'node:assert/strict'
import test from 'node:test'

import type { PluginSummary } from '@/core/types/plugin.types'
import {
  buildPickerActionItems,
  buildPickerCategoryItems,
  buildPickerSecondColumnItems,
  catalogItemsToPickerPresets,
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
