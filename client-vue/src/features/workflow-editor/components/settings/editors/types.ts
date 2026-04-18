import type { GraphNode, Edge } from '@vue-flow/core'

/**
 * Contract shared by every node editor component.
 * Each editor receives everything it needs to read and write node state.
 */
export interface NodeEditorProps {
  /** The VueFlow node currently being edited */
  node: GraphNode<any>
  /** All nodes in the workflow (used for upstream traversal) */
  nodes: GraphNode<any>[]
  /** All edges in the workflow (used for upstream traversal) */
  edges: Edge[]
  /** Merge partial data into the current node's data object */
  updateNodeData: (patch: Record<string, any>) => void
  /** Inject a variable template string into a specific param key */
  injectVariable: (paramKey: string, variable: string) => void
  /** Resolved list of all upstream nodes (topological ancestors) */
  upstreamNodes: GraphNode<any>[]
}
