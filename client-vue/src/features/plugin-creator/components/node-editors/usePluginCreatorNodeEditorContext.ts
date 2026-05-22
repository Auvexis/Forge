import { computed, type ComputedRef } from 'vue'
import type {
  PluginBlueprint,
  PluginBlueprintMethod,
  PluginBlueprintNode,
} from '@/core/types/plugin-creator.types'
import type { PluginCreatorNodeEditorEmitFn, PluginCreatorNodeEditorProps } from './types'

export interface PluginCreatorNodeEditorContext {
  blueprint: ComputedRef<PluginBlueprint | null | undefined>
  node: ComputedRef<PluginBlueprintNode | null>
  methodId: ComputedRef<string | null>
  method: ComputedRef<PluginBlueprintMethod | null>
  updateNodeData: (data: Record<string, unknown>) => void
  updateMethodPatch: (payload: Partial<PluginBlueprintMethod>) => void
}

export function usePluginCreatorNodeEditorContext(
  props: PluginCreatorNodeEditorProps,
  emit: PluginCreatorNodeEditorEmitFn,
): PluginCreatorNodeEditorContext {
  const blueprint = computed(() => props.blueprint)
  const node = computed(() =>
    props.blueprint && props.nodeId ? props.blueprint.canvas.nodes[props.nodeId] ?? null : null,
  )
  const methodId = computed(() => {
    const candidate = node.value?.data.methodId
    if (typeof candidate === 'string') return candidate
    return props.blueprint?.methods[0]?.id ?? null
  })
  const method = computed(() => {
    if (!props.blueprint || !methodId.value) return null
    return props.blueprint.methods.find((candidate) => candidate.id === methodId.value) ?? null
  })

  function updateNodeData(data: Record<string, unknown>) {
    if (!node.value) return
    emit('updateNode', node.value.id, {
      data: {
        ...node.value.data,
        ...data,
      },
    })
  }

  function updateMethodPatch(payload: Partial<PluginBlueprintMethod>) {
    if (!method.value) return
    emit('updateMethod', method.value.id, payload)
  }

  return {
    blueprint,
    node,
    methodId,
    method,
    updateNodeData,
    updateMethodPatch,
  }
}
