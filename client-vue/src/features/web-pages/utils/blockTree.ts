import type { PageBlock } from '../types/page.types.ts'

export type InsertPosition = 'before' | 'inside' | 'after'

const CONTAINER_TAGS = new Set(['header', 'section', 'div', 'footer', 'form'])

export function insertBlock(
  tree: PageBlock[],
  targetId: string,
  position: InsertPosition,
  block: PageBlock,
): PageBlock[] {
  if (position === 'inside') {
    const target = findBlock(tree, targetId)?.block
    if (!target || !isContainer(target)) return tree
  }

  return mapTree(tree, (blocks) => {
    const index = blocks.findIndex((item) => item.id === targetId)
    if (index === -1) return blocks

    if (position === 'inside') {
      return blocks.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, children: [...(item.children ?? []), block] }
          : item,
      )
    }

    const next = [...blocks]
    next.splice(position === 'before' ? index : index + 1, 0, block)
    return next
  })
}

export function moveBlock(
  tree: PageBlock[],
  draggedId: string,
  targetId: string,
  position: InsertPosition,
): PageBlock[] {
  if (draggedId === targetId) return tree
  const dragged = findBlock(tree, draggedId)?.block
  if (!dragged || isDescendant(tree, draggedId, targetId)) return tree

  const withoutDragged = deleteBlock(tree, draggedId)
  return insertBlock(withoutDragged, targetId, position, dragged)
}

export function deleteBlock(tree: PageBlock[], blockId: string): PageBlock[] {
  return tree
    .filter((block) => block.id !== blockId)
    .map((block) => ({ ...block, children: deleteBlock(block.children ?? [], blockId) }))
}

export function duplicateBlock(tree: PageBlock[], blockId: string): PageBlock[] {
  const found = findBlock(tree, blockId)
  if (!found) return tree
  return insertBlock(tree, blockId, 'after', cloneWithNewIds(found.block))
}

export function findBlock(
  tree: PageBlock[],
  blockId: string,
  path: number[] = [],
): { block: PageBlock; path: number[] } | null {
  for (const [index, block] of tree.entries()) {
    const currentPath = [...path, index]
    if (block.id === blockId) return { block, path: currentPath }
    const child = findBlock(block.children ?? [], blockId, currentPath)
    if (child) return child
  }
  return null
}

export function blockDisplayName(block: PageBlock): string {
  return String(block.props?.text ?? block.props?.label ?? block.props?.name ?? block.props?.alt ?? block.id)
}

export function blockChildCount(block: PageBlock): number {
  return block.children?.length ?? 0
}

function mapTree(tree: PageBlock[], mapper: (siblings: PageBlock[]) => PageBlock[]): PageBlock[] {
  const mapped = mapper(tree)
  if (mapped !== tree) return mapped
  return tree.map((block) => ({
    ...block,
    children: mapTree(block.children ?? [], mapper),
  }))
}

function isContainer(block: PageBlock): boolean {
  return CONTAINER_TAGS.has(block.tag)
}

function isDescendant(tree: PageBlock[], ancestorId: string, targetId: string): boolean {
  const ancestor = findBlock(tree, ancestorId)?.block
  return ancestor ? findBlock(ancestor.children ?? [], targetId) !== null : false
}

function cloneWithNewIds(block: PageBlock): PageBlock {
  const tagPrefix = block.tag
  return {
    ...block,
    id: `${tagPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    children: (block.children ?? []).map(cloneWithNewIds),
  }
}
