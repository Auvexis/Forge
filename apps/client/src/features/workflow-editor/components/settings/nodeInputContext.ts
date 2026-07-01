import type { WorkflowGraphEdge as Edge, WorkflowGraphNode as GraphNode } from '../../workflow-canvas/workflowGraphTypes'
import type { NodeData } from './editors/types.ts'

interface InputContextOptions {
  currentId: string
  nodes: GraphNode<NodeData>[]
  edges: Edge[]
  isConfigurationEdge: (edge: Edge) => boolean
}

function findAdvancedConfigurationParentId(options: InputContextOptions): string | null {
  const parentEdge = options.edges.find(
    (edge) => edge.source === options.currentId && options.isConfigurationEdge(edge),
  )
  return parentEdge?.target ?? null
}

function getUpstreamNodesForId(
  currentId: string,
  nodes: GraphNode<NodeData>[],
  edges: Edge[],
  visited = new Set<string>(),
): GraphNode<NodeData>[] {
  if (visited.has(currentId)) return []
  visited.add(currentId)

  const directEdges = edges.filter((edge) => edge.target === currentId)
  let upstream: GraphNode<NodeData>[] = []

  for (const edge of directEdges) {
    const parentNode = nodes.find((node) => node.id === edge.source)
    if (parentNode) {
      upstream.push(parentNode)
      upstream = upstream.concat(getUpstreamNodesForId(edge.source, nodes, edges, visited))
    }
  }

  const byId = new Map<string, GraphNode<NodeData>>()
  for (const node of upstream) {
    if (!byId.has(node.id)) byId.set(node.id, node)
  }

  return Array.from(byId.values())
}

export function getInputContextNodes(options: InputContextOptions): GraphNode<NodeData>[] {
  const contextNodeId = findAdvancedConfigurationParentId(options) ?? options.currentId
  return getUpstreamNodesForId(contextNodeId, options.nodes, options.edges)
}
