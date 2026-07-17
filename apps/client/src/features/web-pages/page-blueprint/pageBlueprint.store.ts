import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import { useSitesStore } from '../stores/sites.store.ts'
import {
  createDefaultPageBlueprintDocument,
  PAGE_BLUEPRINT_DOCUMENT_PATH,
  parsePageBlueprintDocument,
  serializePageBlueprintDocument,
  type PageBlueprintDocument,
} from './pageBlueprintDocument.ts'

export const usePageBlueprintStore = defineStore('web-page-blueprint', () => {
  const document = ref<PageBlueprintDocument>(createDefaultPageBlueprintDocument())
  const savedSnapshot = ref<string>(serialize(document.value))
  const lastHistorySnapshot = ref<string>(serialize(document.value))
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])
  let suppressHistory = false

  const isDirty = computed(() => serialize(document.value) !== savedSnapshot.value)
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function loadFromActiveSite() {
    const sitesStore = useSitesStore()
    const file = sitesStore.activeSite?.files.find((item) => item.path === PAGE_BLUEPRINT_DOCUMENT_PATH && item.kind === 'file')
    const nextDocument = parsePageBlueprintDocument(file?.content)
    const snapshot = serialize(nextDocument)

    suppressHistory = true
    document.value = nextDocument
    savedSnapshot.value = snapshot
    lastHistorySnapshot.value = snapshot
    undoStack.value = []
    redoStack.value = []
    suppressHistory = false
  }

  function saveToActiveSite() {
    const sitesStore = useSitesStore()
    if (!sitesStore.activeSite) return false

    const nextDocument = touchDocument(document.value)
    const content = serializePageBlueprintDocument(nextDocument)
    const updated = sitesStore.updateFile(PAGE_BLUEPRINT_DOCUMENT_PATH, content)
    if (!updated) sitesStore.createFile(PAGE_BLUEPRINT_DOCUMENT_PATH, content)

    suppressHistory = true
    document.value = nextDocument
    const snapshot = serialize(nextDocument)
    savedSnapshot.value = snapshot
    lastHistorySnapshot.value = snapshot
    suppressHistory = false
    return true
  }

  function setViewport(viewport: BaseCanvasViewport) {
    patchDocument({ viewport })
  }

  function setNodePosition(nodeId: string, position: { x: number; y: number }) {
    patchDocument({
      nodes: {
        ...document.value.nodes,
        [nodeId]: position,
      },
    })
  }

  function setNodePositions(positions: Record<string, { x: number; y: number }>) {
    patchDocument({
      nodes: {
        ...document.value.nodes,
        ...positions,
      },
    })
  }

  function setCollapsedGroups(groupIds: string[]) {
    patchDocument({ collapsedGroups: groupIds })
  }

  function undo() {
    if (undoStack.value.length === 0) return
    redoStack.value.push(serialize(document.value))
    applySnapshot(undoStack.value.pop()!)
  }

  function redo() {
    if (redoStack.value.length === 0) return
    undoStack.value.push(serialize(document.value))
    applySnapshot(redoStack.value.pop()!)
  }

  function patchDocument(patch: Partial<PageBlueprintDocument>) {
    const nextDocument = {
      ...document.value,
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    if (serialize(nextDocument) === serialize(document.value)) return
    recordHistory()
    document.value = nextDocument
    lastHistorySnapshot.value = serialize(nextDocument)
  }

  function recordHistory() {
    if (suppressHistory) return
    const currentSnapshot = serialize(document.value)
    undoStack.value.push(currentSnapshot)
    if (undoStack.value.length > 50) undoStack.value.shift()
    redoStack.value = []
  }

  function applySnapshot(snapshot: string) {
    suppressHistory = true
    document.value = JSON.parse(snapshot) as PageBlueprintDocument
    lastHistorySnapshot.value = snapshot
    suppressHistory = false
  }

  return {
    document,
    isDirty,
    canUndo,
    canRedo,
    loadFromActiveSite,
    saveToActiveSite,
    setViewport,
    setNodePosition,
    setNodePositions,
    setCollapsedGroups,
    undo,
    redo,
  }
})

function touchDocument(document: PageBlueprintDocument): PageBlueprintDocument {
  return {
    ...document,
    updatedAt: new Date().toISOString(),
  }
}

function serialize(document: PageBlueprintDocument) {
  return JSON.stringify(document)
}
