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

export function buildPageBlueprintGroups(blocks: PageBlock[], items: PageBlueprintGroupItem[]): PageBlueprintGroupNode[] {
  const byElementId = new Map(items.map((item) => [item.elementId, item]))

  return flattenBlocks(blocks).flatMap((block, index) => {
    if (!block.children?.length) return []

    const descendants = flattenBlocks([block])
    const groupItems = descendants
      .map((item) => byElementId.get(item.id))
      .filter((item): item is PageBlueprintGroupItem => Boolean(item))

    if (groupItems.length < 2) return []

    const minX = Math.min(...groupItems.map((item) => item.x)) - 20
    const minY = Math.min(...groupItems.map((item) => item.y)) - 112
    const maxX = Math.max(...groupItems.map((item) => item.x + item.width)) + 20
    const maxY = Math.max(...groupItems.map((item) => item.y + item.height)) + 20

    return [{
      id: `group:${block.id}`,
      block,
      label: pageBlockLabel(block),
      tag: block.tag,
      icon: pageBlockIcon(block.tag),
      preview: String(block.props?.text ?? block.props?.label ?? `${block.children.length} direct children`),
      childCount: descendants.length - 1,
      nodeIds: groupItems.map((item) => item.id),
      color: GROUP_COLORS[index % GROUP_COLORS.length] ?? DEFAULT_GROUP_COLOR,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }]
  })
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

function pageBlockLabel(block: PageBlock) {
  return String(block.props?.text ?? block.props?.label ?? block.elementId ?? block.id)
}
