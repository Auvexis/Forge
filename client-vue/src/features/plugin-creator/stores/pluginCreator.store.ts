import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type {
  CreatePluginBlueprintPayload,
  PluginBlueprint,
  PluginBlueprintCredentialField,
  PluginBlueprintInput,
  PluginBlueprintMetadata,
  PluginBlueprintMethod,
  PluginBlueprintNode,
  PluginBlueprintRequest,
  PluginCreatorGeneratePreviewResult,
  PluginCreatorRelease,
  PluginCreatorTestMethodPayload,
  PluginCreatorTestResult,
  PluginCreatorVersionsResult,
  RollbackPluginBlueprintPayload,
} from '../../../core/types/plugin-creator.types.ts'
import { usePluginCreatorHistoryStore } from './pluginCreatorHistory.store.ts'

export interface PluginCreatorApiClient {
  listBlueprints: () => Promise<PluginBlueprint[]>
  createBlueprint: (payload: CreatePluginBlueprintPayload) => Promise<PluginBlueprint>
  getBlueprint: (id: string) => Promise<PluginBlueprint>
  updateBlueprint: (id: string, blueprint: PluginBlueprint) => Promise<PluginBlueprint>
  testMethod: (id: string, payload: PluginCreatorTestMethodPayload) => Promise<PluginCreatorTestResult>
  generatePreview: (id: string) => Promise<PluginCreatorGeneratePreviewResult>
  publish: (id: string) => Promise<PluginCreatorRelease>
  listVersions: (id: string) => Promise<PluginCreatorVersionsResult>
  rollback: (id: string, payload: RollbackPluginBlueprintPayload) => Promise<PluginBlueprint>
  exportZip: (id: string) => Promise<Blob>
}

function cloneBlueprint(blueprint: PluginBlueprint): PluginBlueprint {
  return JSON.parse(JSON.stringify(blueprint)) as PluginBlueprint
}

function snapshot(blueprint: PluginBlueprint | null): string {
  return JSON.stringify(blueprint)
}

const defaultApiClient: PluginCreatorApiClient = {
  listBlueprints: (...args) =>
    import('../../../core/api/plugin-creator.api.ts').then((api) =>
      api.pluginCreatorApi.listBlueprints(...args),
    ),
  createBlueprint: (...args) =>
    import('../../../core/api/plugin-creator.api.ts').then((api) =>
      api.pluginCreatorApi.createBlueprint(...args),
    ),
  getBlueprint: (...args) =>
    import('../../../core/api/plugin-creator.api.ts').then((api) =>
      api.pluginCreatorApi.getBlueprint(...args),
    ),
  updateBlueprint: (...args) =>
    import('../../../core/api/plugin-creator.api.ts').then((api) =>
      api.pluginCreatorApi.updateBlueprint(...args),
    ),
  testMethod: (...args) =>
    import('../../../core/api/plugin-creator.api.ts').then((api) =>
      api.pluginCreatorApi.testMethod(...args),
    ),
  generatePreview: (...args) =>
    import('../../../core/api/plugin-creator.api.ts').then((api) =>
      api.pluginCreatorApi.generatePreview(...args),
    ),
  publish: (...args) =>
    import('../../../core/api/plugin-creator.api.ts').then((api) =>
      api.pluginCreatorApi.publish(...args),
    ),
  listVersions: (...args) =>
    import('../../../core/api/plugin-creator.api.ts').then((api) =>
      api.pluginCreatorApi.listVersions(...args),
    ),
  rollback: (...args) =>
    import('../../../core/api/plugin-creator.api.ts').then((api) =>
      api.pluginCreatorApi.rollback(...args),
    ),
  exportZip: (...args) =>
    import('../../../core/api/plugin-creator.api.ts').then((api) =>
      api.pluginCreatorApi.exportZip(...args),
    ),
}

export const usePluginCreatorStore = defineStore('plugin-creator', () => {
  const activeBlueprint = ref<PluginBlueprint | null>(null)
  const blueprints = ref<PluginBlueprint[]>([])
  const savedSnapshot = ref<string | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const isTesting = ref(false)
  const error = ref<string | null>(null)
  const lastTestResult = ref<PluginCreatorTestResult | null>(null)
  const lastPreview = ref<PluginCreatorGeneratePreviewResult | null>(null)
  const versions = ref<PluginCreatorVersionsResult | null>(null)
  const lastRelease = ref<PluginCreatorRelease | null>(null)
  const apiClient = ref<PluginCreatorApiClient>(defaultApiClient)
  const history = usePluginCreatorHistoryStore()

  const isDirty = computed(
    () => activeBlueprint.value !== null && savedSnapshot.value !== snapshot(activeBlueprint.value),
  )
  const canUndo = computed(() => history.canUndo)
  const canRedo = computed(() => history.canRedo)

  function setApiClient(client: PluginCreatorApiClient) {
    apiClient.value = client
  }

  function setActiveBlueprint(blueprint: PluginBlueprint) {
    activeBlueprint.value = cloneBlueprint(blueprint)
    savedSnapshot.value = snapshot(activeBlueprint.value)
    history.clear()
    error.value = null
  }

  function recordHistory() {
    if (!activeBlueprint.value) return
    history.record(snapshot(activeBlueprint.value))
  }

  async function listBlueprints() {
    isLoading.value = true
    error.value = null
    try {
      blueprints.value = await apiClient.value.listBlueprints()
      return blueprints.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load plugin blueprints'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createBlueprint(payload: CreatePluginBlueprintPayload) {
    isSaving.value = true
    error.value = null
    try {
      const blueprint = await apiClient.value.createBlueprint(payload)
      setActiveBlueprint(blueprint)
      return blueprint
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create plugin blueprint'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function loadBlueprint(id: string) {
    isLoading.value = true
    error.value = null
    try {
      const blueprint = await apiClient.value.getBlueprint(id)
      setActiveBlueprint(blueprint)
      return blueprint
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load plugin blueprint'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function saveDraft() {
    if (!activeBlueprint.value) return null
    isSaving.value = true
    error.value = null
    try {
      const saved = await apiClient.value.updateBlueprint(activeBlueprint.value.id, activeBlueprint.value)
      activeBlueprint.value = cloneBlueprint(saved)
      savedSnapshot.value = snapshot(activeBlueprint.value)
      return saved
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save plugin blueprint'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function runMethodTest(payload: PluginCreatorTestMethodPayload) {
    if (!activeBlueprint.value) return null
    isTesting.value = true
    error.value = null
    try {
      const result = await apiClient.value.testMethod(activeBlueprint.value.id, payload)
      lastTestResult.value = result
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to test plugin method'
      throw err
    } finally {
      isTesting.value = false
    }
  }

  function updateMetadata(payload: Partial<PluginBlueprintMetadata>) {
    if (!activeBlueprint.value) return
    recordHistory()
    activeBlueprint.value.metadata = {
      ...activeBlueprint.value.metadata,
      ...payload,
    }
  }

  function addNode(node: PluginBlueprintNode) {
    if (!activeBlueprint.value) return
    recordHistory()
    activeBlueprint.value.canvas.nodes[node.id] = cloneNode(node)
  }

  function updateNode(nodeId: string, payload: Partial<PluginBlueprintNode>) {
    if (!activeBlueprint.value) return
    const existing = activeBlueprint.value.canvas.nodes[nodeId]
    if (!existing) return
    recordHistory()
    activeBlueprint.value.canvas.nodes[nodeId] = {
      ...existing,
      ...payload,
      data: payload.data ? { ...existing.data, ...payload.data } : existing.data,
      position: payload.position ? { ...existing.position, ...payload.position } : existing.position,
    }
  }

  function updateMethod(methodId: string, payload: Partial<PluginBlueprintMethod>) {
    if (!activeBlueprint.value) return
    const index = activeBlueprint.value.methods.findIndex((method) => method.id === methodId)
    if (index < 0) return
    const existing = activeBlueprint.value.methods[index]
    if (!existing) return
    recordHistory()
    activeBlueprint.value.methods[index] = {
      ...existing,
      ...payload,
      request: payload.request
        ? { ...existing.request, ...payload.request }
        : existing.request,
    }
  }

  function updateMethodInput(
    methodId: string,
    inputName: string,
    payload: Partial<PluginBlueprintInput>,
  ) {
    if (!activeBlueprint.value) return
    const method = activeBlueprint.value.methods.find((candidate) => candidate.id === methodId)
    if (!method) return
    const index = method.inputs.findIndex((input) => input.name === inputName)
    if (index < 0) return
    const existing = method.inputs[index]
    if (!existing) return
    recordHistory()
    method.inputs[index] = {
      ...existing,
      ...payload,
    }
  }

  function updateCredentialField(
    fieldName: string,
    payload: Partial<PluginBlueprintCredentialField>,
  ) {
    if (!activeBlueprint.value) return
    const index = activeBlueprint.value.auth.fields.findIndex((field) => field.name === fieldName)
    if (index < 0) return
    const existing = activeBlueprint.value.auth.fields[index]
    if (!existing) return
    recordHistory()
    activeBlueprint.value.auth.fields[index] = {
      ...existing,
      ...payload,
    }
  }

  function updateMethodRequest(
    methodId: string,
    payload: Partial<PluginBlueprintRequest>,
  ) {
    if (!activeBlueprint.value) return
    const method = activeBlueprint.value.methods.find((candidate) => candidate.id === methodId)
    if (!method) return
    recordHistory()
    method.request = {
      ...method.request,
      ...payload,
      body: payload.body ? { ...method.request.body, ...payload.body } : method.request.body,
    }
  }

  function undo() {
    if (!activeBlueprint.value) return
    const previous = history.undo(snapshot(activeBlueprint.value))
    if (!previous) return
    activeBlueprint.value = JSON.parse(previous) as PluginBlueprint
  }

  function redo() {
    if (!activeBlueprint.value) return
    const next = history.redo(snapshot(activeBlueprint.value))
    if (!next) return
    activeBlueprint.value = JSON.parse(next) as PluginBlueprint
  }

  return {
    activeBlueprint,
    blueprints,
    isLoading,
    isSaving,
    isTesting,
    error,
    isDirty,
    canUndo,
    canRedo,
    lastTestResult,
    lastPreview,
    versions,
    lastRelease,
    setApiClient,
    setActiveBlueprint,
    listBlueprints,
    createBlueprint,
    loadBlueprint,
    saveDraft,
    runMethodTest,
    updateMetadata,
    addNode,
    updateNode,
    updateMethod,
    updateMethodInput,
    updateCredentialField,
    updateMethodRequest,
    undo,
    redo,
  }
})

function cloneNode(node: PluginBlueprintNode): PluginBlueprintNode {
  return JSON.parse(JSON.stringify(node)) as PluginBlueprintNode
}
