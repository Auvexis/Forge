import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const HISTORY_LIMIT = 50

export const usePluginCreatorHistoryStore = defineStore('plugin-creator-history', () => {
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function clear() {
    undoStack.value = []
    redoStack.value = []
  }

  function record(snapshot: string) {
    undoStack.value.push(snapshot)
    if (undoStack.value.length > HISTORY_LIMIT) {
      undoStack.value.shift()
    }
    redoStack.value = []
  }

  function undo(currentSnapshot: string): string | null {
    const previous = undoStack.value.pop()
    if (!previous) return null
    redoStack.value.push(currentSnapshot)
    return previous
  }

  function redo(currentSnapshot: string): string | null {
    const next = redoStack.value.pop()
    if (!next) return null
    undoStack.value.push(currentSnapshot)
    return next
  }

  return {
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    clear,
    record,
    undo,
    redo,
  }
})
