import type { WorkflowEdge, WorkflowNode } from "../../shared/models/workflow-types.ts";
import type { NodeHandlerInput, WorkflowExecutionContext } from "./types.ts";

interface ExecuteSubgraphOptions {
  ownerNodeId: string;
  bodyHandle: string;
  input: NodeHandlerInput;
  context: WorkflowExecutionContext;
  onNodeResult?: (nodeId: string, result: any) => void;
}

export function collectBodyNodeIds(
  ownerNodeId: string,
  bodyHandle: string,
  nodes: Record<string, WorkflowNode>,
  edges: WorkflowEdge[],
): Set<string> {
  const bodyNodeIds = new Set<string>();
  const queue = edges
    .filter((edge) => edge.source === ownerNodeId && edge.sourceHandle === bodyHandle)
    .map((edge) => edge.target);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (bodyNodeIds.has(nodeId) || nodeId === ownerNodeId || !nodes[nodeId]) {
      continue;
    }

    bodyNodeIds.add(nodeId);
    for (const edge of edges) {
      if (edge.source === nodeId && !bodyNodeIds.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  return bodyNodeIds;
}

export async function executeBodySubgraph(options: ExecuteSubgraphOptions): Promise<any[]> {
  const { ownerNodeId, bodyHandle, input, context, onNodeResult } = options;
  const bodyNodeIds = collectBodyNodeIds(
    ownerNodeId,
    bodyHandle,
    input.workflow.nodes,
    input.edges,
  );
  const internalEdges = input.edges.filter(
    (edge) => bodyNodeIds.has(edge.source) && bodyNodeIds.has(edge.target),
  );
  const localInDegree: Record<string, number> = {};
  bodyNodeIds.forEach((nodeId) => {
    localInDegree[nodeId] = 0;
  });
  internalEdges.forEach((edge) => {
    localInDegree[edge.target]++;
  });

  const bodyTargets = new Set(
    input.edges
      .filter((edge) => edge.source === ownerNodeId && edge.sourceHandle === bodyHandle)
      .map((edge) => edge.target),
  );
  const queue = [...bodyNodeIds].filter(
    (nodeId) => localInDegree[nodeId] === 0 || bodyTargets.has(nodeId),
  );
  const executed = new Set<string>();
  const results: any[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (executed.has(nodeId)) continue;
    executed.add(nodeId);

    const node = input.workflow.nodes[nodeId];
    if (!node) continue;

    input.services.emitNodeStart(nodeId);

    try {
      const result = await input.services.executeNode({
        nodeId,
        node,
        context,
        workflow: input.workflow,
        edges: input.edges,
        executionId: input.executionId,
      });

      recordSuccessfulStep(context, nodeId, node, result);
      input.services.emitNodeSuccess(nodeId, result, node);
      results.push(result);
      onNodeResult?.(nodeId, result);
    } catch (error: any) {
      const nodeError = error instanceof Error ? error : new Error(String(error));
      context.steps[nodeId] = { status: "FAILED", error: nodeError.message };
      input.services.emitNodeFailure(nodeId, nodeError);
      throw nodeError;
    }

    for (const edge of internalEdges) {
      if (edge.source === nodeId) {
        localInDegree[edge.target]--;
        if (localInDegree[edge.target] === 0) queue.push(edge.target);
      }
    }
  }

  return results;
}

function recordSuccessfulStep(
  context: WorkflowExecutionContext,
  nodeId: string,
  node: WorkflowNode,
  result: any,
): void {
  if (node.type === "code") {
    context.steps[nodeId] = {
      status: "SUCCESS",
      output: result.output,
      logs: result.logs,
    };
    return;
  }

  context.steps[nodeId] = { status: "SUCCESS", output: result };
}
