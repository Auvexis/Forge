import type {
  PageBlueprintField,
  PageBlueprintUtilityNode,
  PageBlueprintUtilityNodeType,
} from './pageBlueprintSchema.ts'

export interface PageBlueprintNodeDefinition {
  type: PageBlueprintUtilityNodeType
  label: string
  description: string
  category: 'Actions' | 'Data'
  icon: string
  accent: string
  width: number
  height: number
  fields: PageBlueprintField[]
}

export const PAGE_BLUEPRINT_NODE_DEFINITIONS: PageBlueprintNodeDefinition[] = [
  {
    type: 'run-workflow',
    label: 'Run Workflow',
    description: 'Run a published workflow and expose its return payload.',
    category: 'Actions',
    icon: 'workflow',
    accent: 'var(--fabric-accent)',
    width: 280,
    height: 148,
    fields: [
      { id: 'trigger', label: 'Trigger', type: 'event', direction: 'input', configurable: true },
      { id: 'input', label: 'Input', type: 'object', direction: 'input', configurable: true },
      { id: 'return', label: 'Return', type: 'unknown', direction: 'output', mode: 'single' },
    ],
  },
  {
    type: 'transform-data',
    label: 'Transform Data',
    description: 'Map, shape, or create values before binding them.',
    category: 'Data',
    icon: 'braces',
    accent: 'var(--fabric-text-error)',
    width: 280,
    height: 132,
    fields: [
      { id: 'input', label: 'Input', type: 'unknown', direction: 'input', configurable: true },
      { id: 'output', label: 'Output', type: 'unknown', direction: 'output', mode: 'single' },
    ],
  },
]

export function pageBlueprintNodeDefinitionsByCategory() {
  const groups = new Map<PageBlueprintNodeDefinition['category'], PageBlueprintNodeDefinition[]>()
  for (const definition of PAGE_BLUEPRINT_NODE_DEFINITIONS) {
    groups.set(definition.category, [...(groups.get(definition.category) ?? []), definition])
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }))
}

export function createUtilityNodeFromDefinition(
  definition: PageBlueprintNodeDefinition,
  id = `utility:${definition.type}:${Date.now().toString(36)}`,
): PageBlueprintUtilityNode {
  return {
    id,
    kind: 'utility',
    type: definition.type,
    label: definition.label,
    icon: definition.icon,
    accent: definition.accent,
    fields: definition.fields.map((field) => ({ ...field })),
    data: {},
  }
}
