import type { InjectionKey, Ref } from 'vue'
import { shallowRef } from 'vue'

export type WorkflowHandleSide = 'top' | 'right' | 'bottom' | 'left'
export type WorkflowHandleType = 'source' | 'target'
export type WorkflowHandleVariant = 'bar' | 'circle' | 'diamond'

export interface WorkflowHandleRegistration {
  nodeId: string
  handleId: string
  type: WorkflowHandleType
  position: WorkflowHandleSide
  variant: WorkflowHandleVariant
  element: HTMLElement
}

export interface WorkflowHandleRegistry {
  handles: Ref<WorkflowHandleRegistration[]>
  registerHandle: (registration: WorkflowHandleRegistration) => () => void
  getNodeHandles: (nodeId: string) => WorkflowHandleRegistration[]
  getHandle: (nodeId: string, handleId: string, type?: WorkflowHandleType) => WorkflowHandleRegistration | null
}

export const isWorkflowBaseCanvasHandleModeKey = Symbol('workflow-base-canvas-handle-mode') as InjectionKey<boolean>
export const workflowCanvasHandleRegistryKey = Symbol('workflow-canvas-handle-registry') as InjectionKey<WorkflowHandleRegistry>
export const workflowCanvasNodeIdKey = Symbol('workflow-canvas-node-id') as InjectionKey<string>

export function createWorkflowHandleRegistry(): WorkflowHandleRegistry {
  const registrations = new Map<string, WorkflowHandleRegistration>()
  const handles = shallowRef<WorkflowHandleRegistration[]>([])

  function syncHandles() {
    handles.value = Array.from(registrations.values())
  }

  function keyOf(registration: Pick<WorkflowHandleRegistration, 'nodeId' | 'handleId' | 'type'>) {
    return `${registration.nodeId}:${registration.type}:${registration.handleId}`
  }

  function registerHandle(registration: WorkflowHandleRegistration) {
    const key = keyOf(registration)
    registrations.set(key, registration)
    syncHandles()

    return () => {
      if (registrations.get(key) !== registration) return
      registrations.delete(key)
      syncHandles()
    }
  }

  function getNodeHandles(nodeId: string) {
    return handles.value.filter((handle) => handle.nodeId === nodeId)
  }

  function getHandle(nodeId: string, handleId: string, type?: WorkflowHandleType) {
    return handles.value.find((handle) =>
      handle.nodeId === nodeId &&
      handle.handleId === handleId &&
      (type ? handle.type === type : true),
    ) ?? null
  }

  return {
    handles,
    registerHandle,
    getNodeHandles,
    getHandle,
  }
}

export function normalizeWorkflowHandleSide(position: unknown): WorkflowHandleSide {
  const value = String(position).toLowerCase()
  if (value === 'top' || value === 'right' || value === 'bottom' || value === 'left') return value
  return 'right'
}
