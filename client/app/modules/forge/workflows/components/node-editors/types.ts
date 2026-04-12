import type { Node, Edge } from "@xyflow/react";

/**
 * Shared props injected into every node editor component.
 * Each editor receives everything it needs to both read and write node state.
 */
export interface NodeEditorProps {
  /** The ReactFlow node currently being edited */
  node: Node;
  /** All nodes in the workflow (used for upstream traversal) */
  nodes: Node[];
  /** All edges in the workflow (used for upstream traversal) */
  edges: Edge[];
  /** Merge partial data into the current node's data object */
  updateNodeData: (patch: Record<string, any>) => void;
  /** Inject a variable template string into a specific param key */
  injectVariable: (paramKey: string, variable: string) => void;
  /** Resolved list of all upstream nodes (topological ancestors) */
  upstreamNodes: Node[];
}
