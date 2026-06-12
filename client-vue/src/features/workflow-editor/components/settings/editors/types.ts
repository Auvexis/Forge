import type { GraphNode, Edge } from '@vue-flow/core'

/**
 * The data shape stored in every workflow graph node.
 * Using `Record<string, unknown>` instead of `any` avoids the explicit-any
 * lint rule while still accommodating heterogeneous node payloads.
 * Individual editors cast `node.data` to their specific type (WorkflowTrigger,
 * PluginNode, etc.) internally.
 */
export type NodeData = Record<string, unknown>

/**
 * Contract shared by every node editor component.
 * Each editor receives everything it needs to read and write node state.
 */
export interface NodeEditorProps {
  /** The VueFlow node currently being edited */
  node: GraphNode<NodeData>
  /** All nodes in the workflow (used for upstream traversal) */
  nodes: GraphNode<NodeData>[]
  /** All edges in the workflow (used for upstream traversal) */
  edges: Edge[]
  /** Merge partial data into the current node's data object */
  updateNodeData: (patch: Record<string, unknown>) => void
  /** Inject a variable template string into a specific param key */
  injectVariable: (paramKey: string, variable: string) => void
  /** Resolved list of all upstream nodes (topological ancestors) */
  upstreamNodes: GraphNode<NodeData>[]
}
