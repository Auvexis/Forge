import type {
  WorkflowEdge,
  WorkflowItem,
  WorkflowNode,
} from "../../../shared/models/workflow-types.ts";

export function createGraph(workflow: WorkflowItem): {
  nodeIds: string[];
  inDegree: Record<string, number>;
  adjList: Record<string, WorkflowEdge[]>;
} {
  const nodeIds = ["trigger", ...Object.keys(workflow.nodes)];
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, WorkflowEdge[]> = {};

  nodeIds.forEach((nodeId) => {
    inDegree[nodeId] = 0;
    adjList[nodeId] = [];
  });

  for (const edge of workflow.edges) {
    if (inDegree[edge.target] !== undefined) {
      inDegree[edge.target]++;
      adjList[edge.source]?.push(edge);
    }
  }

  return { nodeIds, inDegree, adjList };
}

export function shouldReleaseEdge(node: WorkflowNode, edge: WorkflowEdge, output: any): boolean {
  if (node.type === "if") {
    return edge.sourceHandle === output?.branch || (!edge.sourceHandle && output?.branch === "then");
  }

  if (node.type === "switch") {
    return Boolean(output?.activeHandle) && edge.sourceHandle === output.activeHandle;
  }

  if (node.type === "loop") {
    return edge.sourceHandle === "loop-done" || !edge.sourceHandle;
  }

  if (node.type === "split-in-batches") {
    return edge.sourceHandle === "batch-done" || !edge.sourceHandle;
  }

  return true;
}
