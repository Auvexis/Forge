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

export const usePageEditorStore = defineStore('web-page-editor', () => {
  const blocks = ref<PageBlock[]>([])
  const selectedBlockId = ref<string | null>(null)
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
  }

  function selectBlock(blockId: string | null) {
    selectedBlockId.value = blockId
  }

  function insertBlock(targetId: string, position: InsertPosition, block: PageBlock) {
    mutate(() => {
      blocks.value = insertTreeBlock(blocks.value, targetId, position, block)
      selectedBlockId.value = block.id
    })
  }

  function moveBlock(draggedId: string, targetId: string, position: InsertPosition) {
    mutate(() => {
      blocks.value = moveTreeBlock(blocks.value, draggedId, targetId, position)
      selectedBlockId.value = draggedId
    })
  }

  function deleteBlock(blockId: string) {
    mutate(() => {
      blocks.value = deleteTreeBlock(blocks.value, blockId)
      if (selectedBlockId.value === blockId) selectedBlockId.value = null
    })
  }

  function duplicateBlock(blockId: string) {
    mutate(() => {
      blocks.value = duplicateTreeBlock(blocks.value, blockId)
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
    selectedBlock,
    isDirty,
    canUndo,
    canRedo,
    setBlocks,
    selectBlock,
    insertBlock,
    moveBlock,
    deleteBlock,
    duplicateBlock,
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
