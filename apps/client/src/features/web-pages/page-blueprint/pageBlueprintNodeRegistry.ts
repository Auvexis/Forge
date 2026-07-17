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
    height: 110,
    fields: [{
      id: 'event',
      label: 'Event',
      type: 'event',
      direction: 'output',
      configurable: false,
    }],
  },
  {
    type: 'transform-data',
    label: 'Transform Data',
    description: 'Map, shape, or create values before binding them.',
    category: 'Data',
    icon: 'braces',
    accent: 'var(--fabric-text-error)',
    width: 280,
    height: 110,
    fields: [],
  },
]

export function pageBlueprintNodeDefinitionsByCategory() {
  const groups = new Map<PageBlueprintNodeDefinition['category'], PageBlueprintNodeDefinition[]>()
  for (const definition of PAGE_BLUEPRINT_NODE_DEFINITIONS) {
    groups.set(definition.category, [...(groups.get(definition.category) ?? []), definition])
  }
  return [...groups.entries()].map(([category, items]) => ({ category, items }))
}

export function getPageBlueprintNodeDefinition(type: PageBlueprintUtilityNodeType) {
  return PAGE_BLUEPRINT_NODE_DEFINITIONS.find((definition) => definition.type === type)
}

export function createUtilityNodeFromDefinition(
  definition: PageBlueprintNodeDefinition,
  id = `utility:${definition.type}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`,
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
