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
  geometryVersion: Ref<number>
  registerHandle: (registration: WorkflowHandleRegistration) => () => void
  invalidateGeometry: () => void
  getNodeHandles: (nodeId: string) => WorkflowHandleRegistration[]
  getHandle: (
    nodeId: string,
    handleId: string,
    type?: WorkflowHandleType,
  ) => WorkflowHandleRegistration | null
}

export const isWorkflowBaseCanvasHandleModeKey = Symbol(
  'workflow-base-canvas-handle-mode',
) as InjectionKey<boolean>
export const workflowCanvasHandleRegistryKey = Symbol(
  'workflow-canvas-handle-registry',
) as InjectionKey<WorkflowHandleRegistry>
export const workflowCanvasNodeIdKey = Symbol('workflow-canvas-node-id') as InjectionKey<string>

export function createWorkflowHandleRegistry(): WorkflowHandleRegistry {
  const registrations = new Map<string, WorkflowHandleRegistration>()
  const handles = shallowRef<WorkflowHandleRegistration[]>([])
  const geometryVersion = shallowRef(0)
  const observedNodes = new Map<HTMLElement, number>()
  const resizeObserver =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => invalidateGeometry())

  function invalidateGeometry() {
    geometryVersion.value++
  }

  function syncHandles() {
    handles.value = Array.from(registrations.values())
    invalidateGeometry()
  }

  function observeNode(registration: WorkflowHandleRegistration) {
    const node = getWorkflowHandleNodeElement(registration)
    if (!node || !resizeObserver) return
    const count = observedNodes.get(node) ?? 0
    if (count === 0) resizeObserver.observe(node)
    observedNodes.set(node, count + 1)
  }

  function unobserveNode(registration: WorkflowHandleRegistration) {
    const node = getWorkflowHandleNodeElement(registration)
    if (!node || !resizeObserver) return
    const count = observedNodes.get(node) ?? 0
    if (count <= 1) {
      resizeObserver.unobserve(node)
      observedNodes.delete(node)
      return
    }
    observedNodes.set(node, count - 1)
  }

  function keyOf(registration: Pick<WorkflowHandleRegistration, 'nodeId' | 'handleId' | 'type'>) {
    return `${registration.nodeId}:${registration.type}:${registration.handleId}`
  }

  function registerHandle(registration: WorkflowHandleRegistration) {
    const key = keyOf(registration)
    registrations.set(key, registration)
    observeNode(registration)
    syncHandles()

    return () => {
      if (registrations.get(key) !== registration) return
      registrations.delete(key)
      unobserveNode(registration)
      syncHandles()
    }
  }

  function getNodeHandles(nodeId: string) {
    return handles.value.filter((handle) => handle.nodeId === nodeId)
  }

  function getHandle(nodeId: string, handleId: string, type?: WorkflowHandleType) {
    return (
      handles.value.find(
        (handle) =>
          handle.nodeId === nodeId &&
          handle.handleId === handleId &&
          (type ? handle.type === type : true),
      ) ?? null
    )
  }

  return {
    handles,
    geometryVersion,
    registerHandle,
    invalidateGeometry,
    getNodeHandles,
    getHandle,
  }
}

export function getWorkflowHandleOffset(
  registration: WorkflowHandleRegistration,
): { x: number; y: number } | null {
  const node = getWorkflowHandleNodeElement(registration)
  if (!node) return null

  let x = 0
  let y = 0
  let current: HTMLElement | null = registration.element
  while (current && current !== node) {
    x += current.offsetLeft
    y += current.offsetTop
    current = current.offsetParent as HTMLElement | null
  }

  return current === node ? { x, y } : null
}

function getWorkflowHandleNodeElement(
  registration: WorkflowHandleRegistration,
): HTMLElement | null {
  return registration.element.closest('.fabric-workflow-base-canvas__node') as HTMLElement | null
}

export function normalizeWorkflowHandleSide(position: unknown): WorkflowHandleSide {
  const value = String(position).toLowerCase()
  if (value === 'top' || value === 'right' || value === 'bottom' || value === 'left') return value
  return 'right'
}
