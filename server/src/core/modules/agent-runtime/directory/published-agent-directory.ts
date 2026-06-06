import type { WorkflowItem, WorkflowNode } from "../../../../shared/models/workflow-types.ts";

export interface PublishedAgentSummary {
  key: string;
  profileId: string;
  workflowId: string;
  workflowName: string;
  triggerNodeId: string;
  agentNodeId: string;
  chatSlug: string;
  chatTitle: string;
  name: string;
  emoji: string;
  modelNodeId: string;
  executionMode: "loop" | "plan";
}

export function listPublishedAgentsForProfile(
  profileId: string,
  workflows: WorkflowItem[],
): PublishedAgentSummary[] {
  return workflows.flatMap((workflow) => listWorkflowAgents(profileId, workflow));
}

export function listWorkflowDevSessionAgentsForProfile(
  profileId: string,
  workflow: WorkflowItem,
): PublishedAgentSummary[] {
  return listWorkflowAgents(profileId, workflow, { includeDrafts: true });
}

export function buildPublishedAgentKey(
  profileId: string,
  workflowId: string,
  triggerNodeId: string,
  agentNodeId: string,
): string {
  return [profileId, workflowId, triggerNodeId, agentNodeId].join(":");
}

function listWorkflowAgents(
  profileId: string,
  workflow: WorkflowItem,
  options: { includeDrafts?: boolean } = {},
): PublishedAgentSummary[] {
  if (!options.includeDrafts && (!workflow.metadata.isActive || workflow.metadata.isDraft)) return [];

  const adjacency = buildAdjacency(workflow.edges);
  const agents: PublishedAgentSummary[] = [];

  for (const [triggerNodeId, node] of Object.entries(workflow.nodes)) {
    if (node.type !== "trigger" || node.trigger?.type !== "chat") continue;
    const chatSlug = stringValue(node.trigger.chatSlug);
    if (!chatSlug) continue;

    for (const agentNodeId of collectReachable(triggerNodeId, adjacency)) {
      const agentNode = workflow.nodes[agentNodeId];
      if (agentNode?.type !== "ai-agent") continue;
      const modelNodeId = findConnectedModelNodeId(workflow, agentNodeId);
      if (!modelNodeId) continue;

      agents.push({
        key: buildPublishedAgentKey(profileId, workflow.metadata.id, triggerNodeId, agentNodeId),
        profileId,
        workflowId: workflow.metadata.id,
        workflowName: workflow.metadata.name,
        triggerNodeId,
        agentNodeId,
        chatSlug,
        chatTitle: stringValue(node.trigger.chatTitle) ?? node.name,
        name: publicAgentName(agentNode),
        emoji: publicAgentEmoji(agentNode),
        modelNodeId,
        executionMode: publicAgentExecutionMode(agentNode),
      });
    }
  }

  return agents;
}

function buildAdjacency(edges: WorkflowItem["edges"]): Record<string, string[]> {
  const adjacency: Record<string, string[]> = {};
  for (const edge of edges) {
    adjacency[edge.source] = [...(adjacency[edge.source] ?? []), edge.target];
  }
  return adjacency;
}

function collectReachable(startNodeId: string, adjacency: Record<string, string[]>): string[] {
  const queue = [...(adjacency[startNodeId] ?? [])];
  const seen = new Set<string>();

  while (queue.length) {
    const nodeId = queue.shift()!;
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);
    queue.push(...(adjacency[nodeId] ?? []));
  }

  return Array.from(seen);
}

function findConnectedModelNodeId(workflow: WorkflowItem, agentNodeId: string): string | null {
  const edge = workflow.edges.find((candidate) => {
    if (candidate.target !== agentNodeId) return false;
    return workflow.nodes[candidate.source]?.type === "ai-model";
  });
  return edge?.source ?? null;
}

function publicAgentName(node: WorkflowNode): string {
  const record = node as unknown as Record<string, unknown>;
  return stringValue(record.agentDisplayName) ?? stringValue(record.name) ?? "Agent";
}

function publicAgentEmoji(node: WorkflowNode): string {
  return stringValue((node as unknown as Record<string, unknown>).agentEmoji) ?? "\u{1F916}";
}

function publicAgentExecutionMode(node: WorkflowNode): "loop" | "plan" {
  return (node as unknown as Record<string, unknown>).executionMode === "plan" ? "plan" : "loop";
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
