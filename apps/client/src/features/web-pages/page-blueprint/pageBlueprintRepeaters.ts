import type { PageBlock } from '../types/page.types.ts'
import type {
  PageBlueprintConnectionEndpoint,
  PageBlueprintRepeatBinding,
} from './pageBlueprintSchema.ts'

export const PAGE_BLUEPRINT_REPEAT_FIELD_ID = 'repeat'
export const PAGE_BLUEPRINT_ITEM_PATH_MARKER = '[]'

export function isBlueprintRepeatFieldId(fieldId: string) {
  return fieldId === PAGE_BLUEPRINT_REPEAT_FIELD_ID
}

export function isBlueprintRepeatSourceField(
  field: { type?: string; mode?: string } | undefined | null,
) {
  return field?.mode === 'multiple' || field?.type === 'array'
}

export function isBlueprintItemFieldId(fieldId: string) {
  return fieldId.includes(PAGE_BLUEPRINT_ITEM_PATH_MARKER)
}

export function collectionFieldIdFromItemFieldId(fieldId: string) {
  const markerIndex = fieldId.indexOf(PAGE_BLUEPRINT_ITEM_PATH_MARKER)
  return markerIndex >= 0 ? fieldId.slice(0, markerIndex) : fieldId
}

export function collectionPathFromFieldId(fieldId: string) {
  const collectionFieldId = collectionFieldIdFromItemFieldId(fieldId)
  if (collectionFieldId === 'return') return ''
  if (collectionFieldId.startsWith('return:')) return collectionFieldId.slice('return:'.length)
  return collectionFieldId
}

export function itemPathFromFieldId(fieldId: string, itemAlias = 'item') {
  const markerIndex = fieldId.indexOf(PAGE_BLUEPRINT_ITEM_PATH_MARKER)
  if (markerIndex < 0) return itemAlias
  const itemPath = fieldId.slice(markerIndex + PAGE_BLUEPRINT_ITEM_PATH_MARKER.length).replace(/^\./, '')
  return itemPath ? `${itemAlias}.${itemPath}` : itemAlias
}

export function repeatBindingId(source: PageBlueprintConnectionEndpoint, targetNodeId: string) {
  return `repeat:${source.nodeId}:${collectionFieldIdFromItemFieldId(source.fieldId)}->${targetNodeId}`
}

export function createRepeatBinding(
  source: PageBlueprintConnectionEndpoint,
  targetNodeId: string,
  targetElementId: string,
): PageBlueprintRepeatBinding {
  return {
    id: repeatBindingId(source, targetNodeId),
    source: {
      nodeId: source.nodeId,
      fieldId: collectionFieldIdFromItemFieldId(source.fieldId),
    },
    targetNodeId,
    targetElementId,
    collectionPath: collectionPathFromFieldId(source.fieldId),
    itemAlias: 'item',
    createdAt: new Date().toISOString(),
  }
}

export function sourceBelongsToRepeatBinding(
  source: PageBlueprintConnectionEndpoint,
  binding: Pick<PageBlueprintRepeatBinding, 'source'>,
) {
  return source.nodeId === binding.source.nodeId
    && collectionFieldIdFromItemFieldId(source.fieldId) === binding.source.fieldId
}

export function buildPageBlockParentMap(blocks: PageBlock[]) {
  const parents = new Map<string, string | null>()
  const visit = (items: PageBlock[], parentId: string | null) => {
    for (const block of items) {
      parents.set(block.id, parentId)
      visit(block.children ?? [], block.id)
    }
  }
  visit(blocks, null)
  return parents
}

export function isPageBlockDescendantOf(
  parents: Map<string, string | null>,
  childId: string,
  ancestorId: string,
) {
  let current = parents.get(childId) ?? null
  while (current) {
    if (current === ancestorId) return true
    current = parents.get(current) ?? null
  }
  return false
}

export function isPageBlockContainer(block: { tag: string }) {
  return ['header', 'section', 'div', 'footer', 'form'].includes(block.tag)
}
