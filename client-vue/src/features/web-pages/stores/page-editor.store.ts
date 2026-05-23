import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  deleteBlock as deleteTreeBlock,
  duplicateBlock as duplicateTreeBlock,
  findBlock as findTreeBlock,
  insertBlock as insertTreeBlock,
  type InsertPosition,
  moveBlock as moveTreeBlock,
} from '../utils/blockTree.ts'
import type { PageBlock } from '../types/page.types.ts'

export type PageEditorSelection =
  | { type: 'page' }
  | { type: 'body' }
  | { type: 'block'; blockId: string }
  | { type: 'none' }

export interface PageDragIntent {
  targetId: string | 'root'
  position: InsertPosition
}

export const usePageEditorStore = defineStore('web-page-editor', () => {
  const blocks = ref<PageBlock[]>([])
  const selectedBlockId = ref<string | null>(null)
  const selectedTarget = ref<PageEditorSelection>({ type: 'none' })
  const dragIntent = ref<PageDragIntent | null>(null)
  const savedSnapshot = ref<string>('[]')
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])

  const selectedBlock = computed(() =>
    selectedBlockId.value ? findTreeBlock(blocks.value, selectedBlockId.value)?.block ?? null : null,
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
    selectedTarget.value = { type: 'none' }
  }

  function selectBlock(blockId: string | null) {
    selectedBlockId.value = blockId
    selectedTarget.value = blockId ? { type: 'block', blockId } : { type: 'none' }
  }

  function selectPage() {
    selectedBlockId.value = null
    selectedTarget.value = { type: 'page' }
  }

  function selectBody() {
    selectedBlockId.value = null
    selectedTarget.value = { type: 'body' }
  }

  function clearSelection() {
    selectedBlockId.value = null
    selectedTarget.value = { type: 'none' }
  }

  function setDragIntent(intent: PageDragIntent) {
    dragIntent.value = intent
  }

  function clearDragIntent() {
    dragIntent.value = null
  }

  function insertBlock(targetId: string, position: InsertPosition, block: PageBlock) {
    mutate(() => {
      blocks.value = insertTreeBlock(blocks.value, targetId, position, block)
      selectedBlockId.value = block.id
      selectedTarget.value = { type: 'block', blockId: block.id }
      clearDragIntent()
    })
  }

  function moveBlock(draggedId: string, targetId: string, position: InsertPosition) {
    mutate(() => {
      blocks.value = moveTreeBlock(blocks.value, draggedId, targetId, position)
      selectedBlockId.value = draggedId
      selectedTarget.value = { type: 'block', blockId: draggedId }
      clearDragIntent()
    })
  }

  function deleteBlock(blockId: string) {
    mutate(() => {
      blocks.value = deleteTreeBlock(blocks.value, blockId)
      if (selectedBlockId.value === blockId) clearSelection()
    })
  }

  function duplicateBlock(blockId: string) {
    mutate(() => {
      blocks.value = duplicateTreeBlock(blocks.value, blockId)
    })
  }

  function patchBlock(blockId: string, patch: Partial<PageBlock>) {
    mutate(() => {
      blocks.value = patchBlocks(blocks.value, blockId, patch)
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
    selectedTarget,
    dragIntent,
    selectedBlock,
    isDirty,
    canUndo,
    canRedo,
    setBlocks,
    selectBlock,
    selectPage,
    selectBody,
    clearSelection,
    setDragIntent,
    clearDragIntent,
    insertBlock,
    moveBlock,
    deleteBlock,
    duplicateBlock,
    patchBlock,
    undo,
    redo,
    markSaved,
  }
})

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function patchBlocks(blocks: PageBlock[], blockId: string, patch: Partial<PageBlock>): PageBlock[] {
  return blocks.map((block) =>
    block.id === blockId
      ? { ...block, ...patch }
      : { ...block, children: patchBlocks(block.children ?? [], blockId, patch) },
  )
}

function snapshot(value: unknown): string {
  return JSON.stringify(value)
}
