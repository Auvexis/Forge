import type { PluginCategory, PluginSummary } from '@/core/types/plugin.types'
import type { WorkflowNodeType } from '@/core/types/workflow.types'
import type { WorkflowNodeCatalogItem, WorkflowNodeStyle } from '@/core/types/workflow-node-catalog.types'

export type AddNodePickerContext = 'chatModel' | 'memory' | 'tool'

export const ADD_NODE_PICKER_CATEGORIES = [
  'AI',
  'Core',
  'Flow',
  'Data transformation',
  'Apps',
  'Files',
  'Developer',
] as const satisfies readonly PluginCategory[]

export interface AddNodePickerPreset {
  id: string
  label: string
  description: string
  icon: string
  categories: readonly PluginCategory[]
  nodeType: WorkflowNodeType
  defaults?: Record<string, unknown>
  style?: WorkflowNodeStyle
}

export interface AddNodePickerCategoryItem {
  category: PluginCategory
  label: string
  description: string
  icon: string
  count: number
}

export type AddNodePickerSecondColumnItem =
  | {
      kind: 'preset'
      id: string
      preset: AddNodePickerPreset
      label: string
      description: string
      icon: string
    }
  | {
      kind: 'plugin'
      id: string
      plugin: PluginSummary
      label: string
      description: string
      icon: string
    }

export interface AddNodePickerActionItem {
  id: string
  methodKey: string
  label: string
  description: string
}

const VECTOR_STORE_METHODS = [
  'ensureCollection',
  'upsertDocuments',
  'querySimilar',
  'deleteDocuments',
  'describeCollection',
] as const

export function isVectorStoreProvider(plugin: PluginSummary): boolean {
  return VECTOR_STORE_METHODS.every((methodKey) => methodKey in plugin.manifest.methods)
}

export function buildVectorStoreProviderItems(options: {
  plugins: readonly PluginSummary[]
  search?: string
}): Array<{ id: string; plugin: PluginSummary; label: string; description: string; icon: string }> {
  return options.plugins
    .filter(isVectorStoreProvider)
    .filter((plugin) => matchesSearch(
      options.search,
      plugin.manifest.metadata.name,
      plugin.manifest.metadata.description,
    ))
    .map((plugin) => ({
      id: `vector-store-provider:${plugin.id}`,
      plugin,
      label: plugin.manifest.metadata.name,
      description: plugin.manifest.metadata.description,
      icon: plugin.manifest.metadata.icon || 'database-zap',
    }))
}

export function catalogItemsToPickerPresets(items: readonly WorkflowNodeCatalogItem[]): AddNodePickerPreset[] {
  return items.map((item) => ({
    id: item.type,
    nodeType: item.type,
    label: item.label,
    description: item.description,
    icon: item.style.icon,
    categories: [item.category as PluginCategory],
    style: item.style,
  }))
}

const CATEGORY_META: Record<PluginCategory, { description: string; icon: string }> = {
  AI: {
    icon: 'bot',
    description: 'Build agents, models, memory, and AI tools.',
  },
  Core: {
    icon: 'square-terminal',
    description: 'Run code, make requests, set fields, and handle basics.',
  },
  Flow: {
    icon: 'route',
    description: 'Branch, merge, wait, loop, and control execution.',
  },
  'Data transformation': {
    icon: 'workflow',
    description: 'Manipulate, filter, map, parse, and convert data.',
  },
  Apps: {
    icon: 'app-window',
    description: 'Use app capabilities like Google, Slack, Notion, and GitHub.',
  },
  Files: {
    icon: 'folder',
    description: 'Read, write, search, upload, and transform files.',
  },
  Developer: {
    icon: 'code-2',
    description: 'Work with repositories, databases, APIs, and dev systems.',
  },
}

const normalized = (value: string) => value.trim().toLowerCase()

const matchesSearch = (search: string | undefined, ...values: Array<string | undefined>) => {
  const query = normalized(search ?? '')
  if (!query) return true
  return values.some((value) => normalized(value ?? '').includes(query))
}

export function pluginCategories(plugin: PluginSummary): PluginCategory[] {
  return plugin.manifest.metadata.categories.filter((category): category is PluginCategory =>
    ADD_NODE_PICKER_CATEGORIES.includes(category as PluginCategory),
  )
}

export function buildPickerCategoryItems(options: {
  plugins: readonly PluginSummary[]
  presets: readonly AddNodePickerPreset[]
  search?: string
}): AddNodePickerCategoryItem[] {
  return ADD_NODE_PICKER_CATEGORIES.map((category) => {
    const meta = CATEGORY_META[category]
    const plugins = options.plugins.filter((plugin) =>
      pluginCategories(plugin).includes(category) &&
      matchesSearch(
        options.search,
        category,
        meta.description,
        plugin.manifest.metadata.name,
        plugin.manifest.metadata.description,
      ),
    )
    const presets = options.presets.filter((preset) =>
      preset.categories.includes(category) &&
      matchesSearch(options.search, category, meta.description, preset.label, preset.description),
    )

    return {
      category,
      label: category,
      description: meta.description,
      icon: meta.icon,
      count: plugins.length + presets.length,
    }
  }).filter((item) => item.count > 0)
}

export function buildPickerSecondColumnItems(options: {
  category: PluginCategory | null
  plugins: readonly PluginSummary[]
  presets: readonly AddNodePickerPreset[]
  search?: string
}): AddNodePickerSecondColumnItem[] {
  if (!options.category) return []

  const presets = options.presets
    .filter((preset) => preset.categories.includes(options.category!))
    .filter((preset) => matchesSearch(options.search, preset.label, preset.description))
    .map((preset): AddNodePickerSecondColumnItem => ({
      kind: 'preset',
      id: `preset:${preset.id}`,
      preset,
      label: preset.label,
      description: preset.description,
      icon: preset.icon,
    }))

  const plugins = options.plugins
    .filter((plugin) => pluginCategories(plugin).includes(options.category!))
    .filter((plugin) =>
      matchesSearch(
        options.search,
        plugin.manifest.metadata.name,
        plugin.manifest.metadata.description,
      ),
    )
    .map((plugin): AddNodePickerSecondColumnItem => ({
      kind: 'plugin',
      id: `plugin:${plugin.id}`,
      plugin,
      label: plugin.manifest.metadata.name,
      description: plugin.manifest.metadata.description,
      icon: plugin.manifest.metadata.icon || 'box',
    }))

  return [...presets, ...plugins]
}

export function buildPickerActionItems(options: {
  plugin: PluginSummary | null
  agentConfigHandle?: AddNodePickerContext
  search?: string
}): AddNodePickerActionItem[] {
  if (!options.plugin) return []

  return Object.entries(options.plugin.manifest.methods)
    .filter(([, method]) =>
      options.agentConfigHandle !== 'tool' || method.agentTool?.enabled === true,
    )
    .filter(([methodKey, method]) =>
      matchesSearch(options.search, methodKey, method.metadata.label, method.metadata.description),
    )
    .map(([methodKey, method]) => ({
      id: `${options.plugin!.id}:${methodKey}`,
      methodKey,
      label: method.metadata.label || methodKey,
      description: method.metadata.description,
    }))
}
