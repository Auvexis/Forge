import type { WorkflowEdge, WorkflowItem, WorkflowNode } from '@/core/types/workflow.types'

const DUPLICATE_OFFSET = 40

export interface WorkflowSelectionMutationResult {
  nodeIds: string[]
  edgeIds: string[]
}

function cloneNode(node: WorkflowNode): WorkflowNode {
  return JSON.parse(JSON.stringify(node)) as WorkflowNode
}

function nextCopyId(existingIds: Set<string>, sourceId: string) {
  const base = `${sourceId}_copy`
  if (!existingIds.has(base)) {
    existingIds.add(base)
    return base
  }

  let index = 2
  while (existingIds.has(`${base}_${index}`)) index++
  const nextId = `${base}_${index}`
  existingIds.add(nextId)
  return nextId
}

function nextEdgeId(existingIds: Set<string>, source: string, target: string) {
  const base = `e-${source}-${target}`
  if (!existingIds.has(base)) {
    existingIds.add(base)
    return base
  }

  let index = 2
  while (existingIds.has(`${base}-${index}`)) index++
  const nextId = `${base}-${index}`
  existingIds.add(nextId)
  return nextId
}

export function duplicateWorkflowSelection(
  workflow: WorkflowItem,
  selectedIds: string[],
): WorkflowSelectionMutationResult {
  const sourceIds = selectedIds.filter((id) => id !== 'trigger' && workflow.nodes[id])
  const existingNodeIds = new Set(Object.keys(workflow.nodes))
  const existingEdgeIds = new Set(workflow.edges.map((edge) => edge.id))
  const idMap = new Map<string, string>()
  const nodeIds: string[] = []
  const edgeIds: string[] = []

  for (const sourceId of sourceIds) {
    const sourceNode = workflow.nodes[sourceId]
    if (!sourceNode) continue

    const copyId = nextCopyId(existingNodeIds, sourceId)
    const copy = cloneNode(sourceNode)
    copy.name = `${copy.name ?? sourceId} Copy`
    copy.ui = {
      ...(copy.ui ?? { positionX: 0, positionY: 0 }),
      positionX: (copy.ui?.positionX ?? 0) + DUPLICATE_OFFSET,
      positionY: (copy.ui?.positionY ?? 0) + DUPLICATE_OFFSET,
    }

    workflow.nodes[copyId] = copy
    idMap.set(sourceId, copyId)
    nodeIds.push(copyId)
  }

  for (const edge of workflow.edges) {
    const source = idMap.get(edge.source)
    const target = idMap.get(edge.target)
    if (!source || !target) continue

    const newEdge: WorkflowEdge = {
      ...edge,
      id: nextEdgeId(existingEdgeIds, source, target),
      source,
      target,
    }
    workflow.edges.push(newEdge)
    edgeIds.push(newEdge.id)
  }

  return { nodeIds, edgeIds }
}

export function deleteWorkflowSelection(
  workflow: WorkflowItem,
  selectedIds: string[],
): WorkflowSelectionMutationResult {
  const removableIds = selectedIds.filter((id) => id !== 'trigger' && workflow.nodes[id])
  const removableSet = new Set(removableIds)
  const removedEdgeIds = workflow.edges
    .filter((edge) => removableSet.has(edge.source) || removableSet.has(edge.target))
    .map((edge) => edge.id)

  workflow.edges = workflow.edges.filter(
    (edge) => !removableSet.has(edge.source) && !removableSet.has(edge.target),
  )

  for (const id of removableIds) {
    delete workflow.nodes[id]
  }

  return { nodeIds: removableIds, edgeIds: removedEdgeIds }
}
