import type { WorkflowItem, WorkflowNode } from '@/core/types/workflow.types'
import { useApi } from '@/shared/composables/useApi'
import { workflowsApi } from '@/core/api/workflows.api'
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useToast } from '@/shared/composables/useToast'

/** 
 * Serializa objetos de forma determinística garantindo ordem das chaves.
 * Isso impede que mudanças na ordem das chaves marquem o workflow como dirty.
 */
function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj)
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']'
  }
  const keys = Object.keys(obj).sort()
  const res = []
  for (const key of keys) {
    const val = obj[key]
    if (val !== undefined) {
      res.push(JSON.stringify(key) + ':' + stableStringify(val))
    }
  }
  return '{' + res.join(',') + '}'
}

/** Serializa o workflow para comparação, ignorando campos voláteis como updatedAt */
function serializeForDiff(workflow: WorkflowItem): string {
  const { metadata: { updatedAt, version, ...restMeta }, ...rest } = workflow

  // Normalize node UI positions to avoid float drift (e.g. 190.0001 vs 190)
  // causing false dirty state after drag-revert.
  const round1 = (n: number | undefined) => n === undefined ? undefined : Math.round(n * 10) / 10

  const normalizeUI = (ui: any) => {
    if (!ui) return ui
    return { ...ui, positionX: round1(ui.positionX), positionY: round1(ui.positionY) }
  }

  const normalizedNodes: Record<string, any> = {}
  for (const [id, node] of Object.entries(rest.nodes ?? {})) {
    const n = node as any
    normalizedNodes[id] = { ...n, ui: normalizeUI(n.ui) }
  }

  const normalizedTrigger = { ...rest.trigger, ui: normalizeUI((rest.trigger as any)?.ui) }

  return stableStringify({
    ...rest,
    nodes: normalizedNodes,
    trigger: normalizedTrigger,
    metadata: restMeta,
  })
}

export const useWorkflowStore = defineStore('workflow', () => {
  const toast = useToast()
  const activeWorkflow = ref<WorkflowItem | null>(null)
  const _savedSnapshot = ref<string | null>(null)
  const _lastHistorySnapshot = ref<string | null>(null)
  const _serverUpdatedAt = ref<string | undefined>(undefined)
  const graphUpdateTrigger = ref(0)
  const autosaveStatus = ref<'idle' | 'saving' | 'saved' | 'error' | 'conflict'>('idle')
  const lastAutosavedAt = ref<number | null>(null)
  const conflictMessage = ref<string | null>(null)
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])
  let suppressHistory = false
  let autosaveTimer: number | null = null

  const isDirty = computed(() => {
    if (!activeWorkflow.value || _savedSnapshot.value === null) return false
    return serializeForDiff(activeWorkflow.value) !== _savedSnapshot.value
  })
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const isAutosaveEnabled = computed(
    () => activeWorkflow.value?.metadata.autosaveEnabled === true,
  )
  const draftStorageKey = computed(() =>
    activeWorkflow.value ? `nod8.workflow-draft.${activeWorkflow.value.metadata.id}` : null,
  )

  function setActiveWorkflow(workflow: WorkflowItem) {
    const snapshot = serializeForDiff(workflow)
    suppressHistory = true
    activeWorkflow.value = workflow
    _savedSnapshot.value = snapshot
    _lastHistorySnapshot.value = JSON.stringify(workflow)
    _serverUpdatedAt.value = workflow.metadata.updatedAt
    undoStack.value = []
    redoStack.value = []
    autosaveStatus.value = 'idle'
    conflictMessage.value = null
    suppressHistory = false
  }

  function clearWorkflow() {
    activeWorkflow.value = null
    _savedSnapshot.value = null
    _lastHistorySnapshot.value = null
    _serverUpdatedAt.value = undefined
    undoStack.value = []
    redoStack.value = []
    if (autosaveTimer) window.clearTimeout(autosaveTimer)
    autosaveTimer = null
  }



  /**
   * Atualiza campos específicos do dado de um node pelo ID.
   * O payload é mesclado (shallow merge) — só os campos enviados são alterados.
   */
  function updateNodeData(nodeId: string, payload: Record<string, unknown>) {
    if (!activeWorkflow.value) return

    if (nodeId === 'trigger') {
      Object.assign(activeWorkflow.value.trigger, payload)
    } else if (activeWorkflow.value.nodes[nodeId]) {
      Object.assign(activeWorkflow.value.nodes[nodeId], payload)
    }
  }

  function removeEdgesBySourceHandle(sourceId: string, sourceHandle: string) {
    if (!activeWorkflow.value) return 0

    const before = activeWorkflow.value.edges.length
    activeWorkflow.value.edges = activeWorkflow.value.edges.filter(
      (edge) => !(edge.source === sourceId && edge.sourceHandle === sourceHandle),
    )
    const removed = before - activeWorkflow.value.edges.length
    return removed
  }

  /**
   * Renomeia o ID de um node. Atualiza edges apontando para ele e forca o canvas a remontar.
   */
  function renameNode(oldId: string, newId: string) {
    if (!activeWorkflow.value) return false
    if (oldId === 'trigger' || newId === 'trigger') return false
    if (activeWorkflow.value.nodes[newId]) return false // Conflict

    const nodeData = activeWorkflow.value.nodes[oldId]
    if (!nodeData) return false

    activeWorkflow.value.nodes[newId] = nodeData
    delete activeWorkflow.value.nodes[oldId]

    // Update edges
    activeWorkflow.value.edges.forEach((edge) => {
      if (edge.source === oldId) edge.source = newId
      if (edge.target === oldId) edge.target = newId
    })

    graphUpdateTrigger.value++
    return true
  }

  /**
   * Bumps the patch segment of a "MAJOR.MINOR.PATCH" version string.
   * Rolls over: ...9 → next minor; minor 9 → next major.
   * Falls back gracefully if the version is not in semver format.
   */
  function bumpVersion(version: string): string {
    const parts = String(version).split('.').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) {
      // Not a valid semver — start fresh
      return '1.0.0'
    }
    let [major, minor, patch] = parts
    patch! += 1
    if (patch! >= 10) {
      patch = 0
      minor! += 1
    }
    if (minor! >= 10) {
      minor = 0
      major! += 1
    }
    return `${major}.${minor}.${patch}`
  }

  const saveApi = useApi(workflowsApi.update)
  async function saveActiveWorkflow(options: { silent?: boolean; autosave?: boolean } = {}) {
    if (!activeWorkflow.value) return

    try {
      autosaveStatus.value = options.autosave ? 'saving' : autosaveStatus.value
      const workflow = activeWorkflow.value
      if (_serverUpdatedAt.value && !workflow.metadata.id.startsWith('draft_')) {
        const serverWorkflow = await workflowsApi.getById(workflow.metadata.id)
        if (
          serverWorkflow.metadata.updatedAt &&
          serverWorkflow.metadata.updatedAt !== _serverUpdatedAt.value
        ) {
          autosaveStatus.value = 'conflict'
          conflictMessage.value = 'Server version changed. Review before saving.'
          if (!options.silent) toast.error(conflictMessage.value, 'Save conflict')
          return
        }
      }
      const updatedVersion = bumpVersion(workflow.metadata.version)
      const updatedDate = new Date().toISOString()

      const updatedWorkflow = {
        ...workflow,
        metadata: {
          ...workflow.metadata,
          version: updatedVersion,
          updatedAt: updatedDate,
        },
      }

      const savedWorkflow = await saveApi.execute(activeWorkflow.value.metadata.id, updatedWorkflow)

      suppressHistory = true
      activeWorkflow.value = savedWorkflow
      const savedSnapshot = serializeForDiff(savedWorkflow)
      _savedSnapshot.value = savedSnapshot
      _lastHistorySnapshot.value = JSON.stringify(savedWorkflow)
      _serverUpdatedAt.value = savedWorkflow.metadata.updatedAt
      suppressHistory = false
      autosaveStatus.value = options.autosave ? 'saved' : 'idle'
      if (options.autosave) lastAutosavedAt.value = Date.now()
      clearDraft()
      if (!options.silent) toast.success('Workflow saved')
    } catch (error) {
      autosaveStatus.value = options.autosave ? 'error' : autosaveStatus.value
      toast.error(error instanceof Error ? error.message : 'Failed to save workflow')
    }
  }

  function saveDraft() {
    if (!activeWorkflow.value || !draftStorageKey.value) return
    localStorage.setItem(
      draftStorageKey.value,
      JSON.stringify({ savedAt: Date.now(), workflow: activeWorkflow.value }),
    )
  }

  function clearDraft() {
    if (!draftStorageKey.value) return
    localStorage.removeItem(draftStorageKey.value)
  }

  function recoverDraft(workflowId: string): boolean {
    const raw = localStorage.getItem(`nod8.workflow-draft.${workflowId}`)
    if (!raw) return false
    try {
      const parsed = JSON.parse(raw) as { workflow?: WorkflowItem }
      if (!parsed.workflow) return false
      setActiveWorkflow(parsed.workflow)
      _savedSnapshot.value = serializeForDiff(parsed.workflow)
      return true
    } catch {
      return false
    }
  }

  function applySnapshot(snapshot: string) {
    suppressHistory = true
    activeWorkflow.value = JSON.parse(snapshot) as WorkflowItem
    _lastHistorySnapshot.value = JSON.stringify(activeWorkflow.value)
    graphUpdateTrigger.value++
    suppressHistory = false
    saveDraft()
  }

  function setAutosaveEnabled(enabled: boolean) {
    if (!activeWorkflow.value) return
    activeWorkflow.value.metadata.autosaveEnabled = enabled
    if (!enabled && autosaveTimer) {
      window.clearTimeout(autosaveTimer)
      autosaveTimer = null
      autosaveStatus.value = 'idle'
    }
    void saveActiveWorkflow({ silent: true })
  }

  function undo() {
    if (!activeWorkflow.value || undoStack.value.length === 0) return
    redoStack.value.push(JSON.stringify(activeWorkflow.value))
    applySnapshot(undoStack.value.pop()!)
  }

  function redo() {
    if (!activeWorkflow.value || redoStack.value.length === 0) return
    undoStack.value.push(JSON.stringify(activeWorkflow.value))
    applySnapshot(redoStack.value.pop()!)
  }

  function scheduleAutosave() {
    if (!activeWorkflow.value) return
    saveDraft()
    if (!isAutosaveEnabled.value || !isDirty.value || autosaveStatus.value === 'conflict') return
    if (autosaveTimer) window.clearTimeout(autosaveTimer)
    autosaveTimer = window.setTimeout(() => {
      void saveActiveWorkflow({ silent: true, autosave: true })
    }, 1500)
  }

  watch(
    activeWorkflow,
    (workflow) => {
      if (!workflow || suppressHistory) return
      const snapshot = JSON.stringify(workflow)
      const diffSnapshot = serializeForDiff(workflow)
      const previousDiff = _lastHistorySnapshot.value
        ? serializeForDiff(JSON.parse(_lastHistorySnapshot.value) as WorkflowItem)
        : null
      if (_lastHistorySnapshot.value && previousDiff && diffSnapshot !== previousDiff) {
        undoStack.value.push(_lastHistorySnapshot.value)
        if (undoStack.value.length > 50) undoStack.value.shift()
        redoStack.value = []
        _lastHistorySnapshot.value = snapshot
      }
      scheduleAutosave()
    },
    { deep: true },
  )

  const deleteApi = useApi(workflowsApi.delete)
  async function deleteActiveWorkflow() {
    if (!activeWorkflow.value) return

    try {
      // Only call delete API if it's a real workflow ID, avoid throwing on drafts
      if (!activeWorkflow.value.metadata.id.startsWith('draft_')) {
        await deleteApi.execute(activeWorkflow.value.metadata.id)
      }
      clearWorkflow()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workflow')
      throw error
    }
  }

  async function deleteWorkflow(id: string) {
    try {
      await deleteApi.execute(id)
      clearWorkflow()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workflow')
      throw error
    }
  }


  return {
    activeWorkflow,
    isDirty,
    autosaveStatus,
    lastAutosavedAt,
    conflictMessage,
    canUndo,
    canRedo,
    isAutosaveEnabled,
    graphUpdateTrigger,
    isSaving: saveApi.loading,
    setActiveWorkflow,
    clearWorkflow,
    updateNodeData,
    removeEdgesBySourceHandle,
    renameNode,
    saveActiveWorkflow,
    recoverDraft,
    setAutosaveEnabled,
    undo,
    redo,
    deleteActiveWorkflow,
    deleteWorkflow,
  }
})
