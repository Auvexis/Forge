import type { PageBlock } from '../types/page.types.ts'

export interface PageBlueprintGroupNode {
  id: string
  block: PageBlock
  label: string
  tag: string
  icon: string
  preview: string
  childCount: number
  nodeIds: string[]
  color: string
  x: number
  y: number
  width: number
  height: number
}

export interface PageBlueprintGroupItem {
  id: string
  elementId: string
  x: number
  y: number
  width: number
  height: number
}

const DEFAULT_GROUP_COLOR = 'var(--fabric-blueprint-group-accent-1, #5b8def)'

const GROUP_COLORS = [
  DEFAULT_GROUP_COLOR,
  'var(--fabric-blueprint-group-accent-2, #8b6fd6)',
  'var(--fabric-blueprint-group-accent-3, #4f9b8f)',
  'var(--fabric-blueprint-group-accent-4, #c27b48)',
]
const GROUP_PADDING_X = 20
const GROUP_HEADER_SPACE = 36
const GROUP_BOTTOM_PADDING = 20

export function buildPageBlueprintGroups(blocks: PageBlock[], items: PageBlueprintGroupItem[]): PageBlueprintGroupNode[] {
  const byElementId = new Map(items.map((item) => [item.elementId, item]))
  return collectAutoGroupBlocks(blocks).flatMap((block, index) => createGroupNode(block, byElementId, index))
}

export function pageBlockIcon(tag: string) {
  if (tag === 'text') return 'type'
  if (tag === 'button') return 'square-mouse-pointer'
  if (tag === 'input') return 'text-cursor-input'
  if (tag === 'form') return 'clipboard-list'
  if (tag === 'image') return 'image'
  return 'box'
}

export function flattenBlocks(blocks: PageBlock[]): PageBlock[] {
  return blocks.flatMap((block) => [block, ...flattenBlocks(block.children ?? [])])
}

function collectAutoGroupBlocks(blocks: PageBlock[]): PageBlock[] {
  return blocks.flatMap((block) => {
    if (isAutoGroupCandidate(block)) return [block]
    return collectAutoGroupBlocks(block.children ?? [])
  })
}

function createGroupNode(
  block: PageBlock,
  byElementId: Map<string, PageBlueprintGroupItem>,
  index: number,
): PageBlueprintGroupNode[] {
  const descendants = flattenBlocks([block])
  const groupItems = descendants
    .map((item) => byElementId.get(item.id))
    .filter((item): item is PageBlueprintGroupItem => Boolean(item))

  if (groupItems.length < 3) return []

  const minX = Math.min(...groupItems.map((item) => item.x)) - GROUP_PADDING_X
  const minY = Math.min(...groupItems.map((item) => item.y)) - GROUP_HEADER_SPACE
  const maxX = Math.max(...groupItems.map((item) => item.x + item.width)) + GROUP_PADDING_X
  const maxY = Math.max(...groupItems.map((item) => item.y + item.height)) + GROUP_BOTTOM_PADDING

  return [{
    id: `group:${block.id}`,
    block,
    label: pageBlockLabel(block),
    tag: block.tag,
    icon: pageBlockIcon(block.tag),
    preview: String(block.props?.text ?? block.props?.label ?? `${block.children?.length ?? 0} direct children`),
    childCount: descendants.length - 1,
    nodeIds: groupItems.map((item) => item.id),
    color: GROUP_COLORS[index % GROUP_COLORS.length] ?? DEFAULT_GROUP_COLOR,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }]
}

function isAutoGroupCandidate(block: PageBlock) {
  const children = block.children ?? []
  if (children.length === 0) return false
  if (block.tag === 'form' && flattenBlocks(children).length >= 2) return true
  return hasComponentBoundary(block) && flattenBlocks(children).length >= 2
}

function hasComponentBoundary(block: PageBlock) {
  const styles = block.styles ?? {}
  return hasStyleValue(styles.border)
    || hasStyleValue(styles.borderWidth)
    || hasStyleValue(styles.borderStyle)
    || hasStyleValue(styles.borderColor)
    || hasStyleValue(styles.borderRadius)
    || styles.overflow === 'hidden'
}

function hasStyleValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function pageBlockLabel(block: PageBlock) {
  return String(block.props?.text ?? block.props?.label ?? block.elementId ?? block.id)
}
