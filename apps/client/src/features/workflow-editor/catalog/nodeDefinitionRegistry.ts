import { shallowRef } from 'vue'
import type { WorkflowNodeCatalogItem } from '@/core/types/workflow-node-catalog.types'

const definitions = shallowRef(new Map<string, WorkflowNodeCatalogItem>())

export function replaceNodeDefinitions(items: readonly WorkflowNodeCatalogItem[]) {
  definitions.value = new Map(items.map((item) => [item.type, item]))
}

export function getNodeDefinition(type: string | undefined) {
  return type ? definitions.value.get(type) : undefined
}
