import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  deleteBlock as deleteTreeBlock,
  duplicateBlock as duplicateTreeBlock,
  findBlock as findTreeBlock,
  insertBlock as insertTreeBlock,
  type InsertPosition,
  moveBlock as moveTreeBlock,
  renameBlockId as renameTreeBlockId,
} from '../utils/blockTree.ts'
import type { PageBlock } from '../types/page.types.ts'

export type PageEditorSelection =
  | { type: 'page' }
  | { type: 'body' }
  | { type: 'block'; blockId: string }
  | { type: 'none' }

export type DropEdge = 'top' | 'right' | 'bottom' | 'left' | 'center'

export interface PageDragIntent {
  targetId: string | 'root'
  position: InsertPosition
  dropEdge?: DropEdge
}

export const usePageEditorStore = defineStore('web-page-editor', () => {
  const blocks = ref<PageBlock[]>([])
  const selectedBlockId = ref<string | null>(null)
  const selectedBlockIds = ref<string[]>([])
  const selectedTarget = ref<PageEditorSelection>({ type: 'none' })
  const dragIntent = ref<PageDragIntent | null>(null)
  const collapsedBlockIds = ref<Record<string, boolean>>({})
  const savedSnapshot = ref<string>('[]')
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])

  const selectedBlock = computed(() =>
    selectedBlockId.value ? findTreeBlock(blocks.value, selectedBlockId.value)?.block ?? null : null,
  )
  const selectedBlocks = computed(() =>
    selectedBlockIds.value
      .map((id) => findTreeBlock(blocks.value, id)?.block ?? null)
      .filter((block): block is PageBlock => !!block),
  )
  const isDirty = computed(() => snapshot(blocks.value) !== savedSnapshot.value)
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function setBlocks(nextBlocks: PageBlock[]) {
    blocks.value = clone(nextBlocks)
    savedSnapshot.value = snapshot(blocks.value)
    undoStack.value = []
    redoStack.value = []
    selectedBlockId.value = null
    selectedBlockIds.value = []
    selectedTarget.value = { type: 'none' }
  }

  function selectBlock(blockId: string | null) {
    selectedBlockId.value = blockId
    selectedBlockIds.value = blockId ? [blockId] : []
    selectedTarget.value = blockId ? { type: 'block', blockId } : { type: 'none' }
  }

  function selectBlockRange(blockId: string) {
    toggleBlockSelection(blockId)
  }

  function toggleBlockSelection(blockId: string) {
    const block = findTreeBlock(blocks.value, blockId)?.block
    if (!block) return
    selectedBlockIds.value = selectedBlockIds.value.includes(blockId)
      ? selectedBlockIds.value.filter((id) => id !== blockId)
      : [...selectedBlockIds.value, blockId]
    selectedBlockId.value = selectedBlockIds.value.at(-1) ?? null
    selectedTarget.value = selectedBlockId.value ? { type: 'block', blockId: selectedBlockId.value } : { type: 'none' }
  }

  function selectPage() {
    selectedBlockId.value = null
    selectedBlockIds.value = []
    selectedTarget.value = { type: 'page' }
  }

  function selectBody() {
    selectedBlockId.value = null
    selectedBlockIds.value = []
    selectedTarget.value = { type: 'body' }
  }

  function clearSelection() {
    selectedBlockId.value = null
    selectedBlockIds.value = []
    selectedTarget.value = { type: 'none' }
  }

  function setDragIntent(intent: PageDragIntent) {
    dragIntent.value = intent
  }

  function clearDragIntent() {
    dragIntent.value = null
  }

  function toggleBlockCollapsed(blockId: string) {
    collapsedBlockIds.value = {
      ...collapsedBlockIds.value,
      [blockId]: !collapsedBlockIds.value[blockId],
    }
  }

  function isBlockCollapsed(blockId: string) {
    return Boolean(collapsedBlockIds.value[blockId])
  }

  function insertBlock(targetId: string, position: InsertPosition, block: PageBlock) {
    mutate(() => {
      blocks.value = insertTreeBlock(blocks.value, targetId, position, block)
      selectedBlockId.value = block.id
      selectedBlockIds.value = [block.id]
      selectedTarget.value = { type: 'block', blockId: block.id }
      clearDragIntent()
    })
  }

  function appendBlock(block: PageBlock) {
    mutate(() => {
      blocks.value = [...blocks.value, block]
      selectedBlockId.value = block.id
      selectedBlockIds.value = [block.id]
      selectedTarget.value = { type: 'block', blockId: block.id }
      clearDragIntent()
    })
  }

  function moveBlock(draggedId: string, targetId: string, position: InsertPosition) {
    mutate(() => {
      blocks.value = moveTreeBlock(blocks.value, draggedId, targetId, position)
      selectedBlockId.value = draggedId
      selectedBlockIds.value = [draggedId]
      selectedTarget.value = { type: 'block', blockId: draggedId }
      clearDragIntent()
    })
  }

  function deleteBlock(blockId: string) {
    mutate(() => {
      blocks.value = deleteTreeBlock(blocks.value, blockId)
      selectedBlockIds.value = selectedBlockIds.value.filter((id) => id !== blockId)
      if (selectedBlockId.value === blockId) clearSelection()
    })
  }

  function duplicateBlock(blockId: string) {
    mutate(() => {
      blocks.value = duplicateTreeBlock(blocks.value, blockId)
    })
  }

  function renameBlockId(blockId: string, nextId: string) {
    const normalized = nextId.trim()
    if (!normalized) return false
    if (findTreeBlock(blocks.value, normalized)) return false

    mutate(() => {
      blocks.value = renameTreeBlockId(blocks.value, blockId, normalized)
      selectedBlockId.value = normalized
      selectedBlockIds.value = selectedBlockIds.value.length
        ? selectedBlockIds.value.map((id) => id === blockId ? normalized : id)
        : [normalized]
      selectedTarget.value = { type: 'block', blockId: normalized }
    })

    return true
  }

  function patchBlock(blockId: string, patch: Partial<PageBlock>) {
    mutate(() => {
      const match = findTreeBlock(blocks.value, blockId)?.block
      if (!match) return
      if (patch.props) match.props = patch.props
      if (patch.styles) match.styles = { ...(match.styles ?? {}), ...patch.styles }
      if (patch.elementId !== undefined) match.elementId = patch.elementId
      if (patch.attributes !== undefined) match.attributes = patch.attributes
      if (patch.className !== undefined) match.className = patch.className
      if (patch.customCss !== undefined) match.customCss = patch.customCss
      if (patch.customJs !== undefined) match.customJs = patch.customJs
      if ('action' in patch) match.action = patch.action
      if (patch.children) match.children = patch.children
    })
  }

  function patchSelectedBlocks(patch: Partial<PageBlock>) {
    mutate(() => {
      for (const blockId of selectedBlockIds.value) {
        const match = findTreeBlock(blocks.value, blockId)?.block
        if (!match) continue
        if (patch.props) match.props = patch.props
        if (patch.styles) match.styles = { ...(match.styles ?? {}), ...patch.styles }
        if (patch.elementId !== undefined) match.elementId = patch.elementId
        if (patch.attributes !== undefined) match.attributes = patch.attributes
        if (patch.className !== undefined) match.className = patch.className
        if (patch.customCss !== undefined) match.customCss = patch.customCss
        if (patch.customJs !== undefined) match.customJs = patch.customJs
        if ('action' in patch) match.action = patch.action
        if (patch.children) match.children = patch.children
      }
    })
  }

  function undo() {
    const previous = undoStack.value.pop()
    if (!previous) return
    redoStack.value.push(snapshot(blocks.value))
    blocks.value = JSON.parse(previous) as PageBlock[]
  }

  function redo() {
    const next = redoStack.value.pop()
    if (!next) return
    undoStack.value.push(snapshot(blocks.value))
    blocks.value = JSON.parse(next) as PageBlock[]
  }

  function markSaved() {
    savedSnapshot.value = snapshot(blocks.value)
  }

  function mutate(callback: () => void) {
    undoStack.value.push(snapshot(blocks.value))
    redoStack.value = []
    callback()
  }

  return {
    blocks,
    selectedBlockId,
    selectedBlockIds,
    selectedTarget,
    dragIntent,
    collapsedBlockIds,
    selectedBlock,
    selectedBlocks,
    isDirty,
    canUndo,
    canRedo,
    setBlocks,
    selectBlock,
    selectBlockRange,
    toggleBlockSelection,
    selectPage,
    selectBody,
    clearSelection,
    setDragIntent,
    clearDragIntent,
    toggleBlockCollapsed,
    isBlockCollapsed,
    insertBlock,
    appendBlock,
    moveBlock,
    deleteBlock,
    duplicateBlock,
    renameBlockId,
    patchBlock,
    patchSelectedBlocks,
    undo,
    redo,
    markSaved,
  }
})

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function snapshot(value: unknown): string {
  return JSON.stringify(value)
}
