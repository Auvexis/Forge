import type { WorkflowNodeCatalogItem } from '@/core/types/workflow-node-catalog.types'

let definitions = new Map<string, WorkflowNodeCatalogItem>()

export function replaceNodeDefinitions(items: readonly WorkflowNodeCatalogItem[]) {
  definitions = new Map(items.map((item) => [item.type, item]))
}

export function getNodeDefinition(type: string | undefined) {
  return type ? definitions.get(type) : undefined
}
