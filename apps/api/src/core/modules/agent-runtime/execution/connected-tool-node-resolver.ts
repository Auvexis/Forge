import type {
  AiToolNode,
  WorkflowItem,
} from "../../../../shared/models/workflow-types.ts";
import { resolvePluginAgentTool } from "../plugin-tool-adapter.ts";
import type {
  AgentWorkflowToolResolver,
  AgentWorkflowToolTarget,
} from "./workflow-tool-scheduler.ts";

export class ConnectedToolNodeResolver implements AgentWorkflowToolResolver {
  constructor(
    private readonly workflow: WorkflowItem,
    private readonly agentNodeId: string,
  ) {}

  resolve(toolName: string): AgentWorkflowToolTarget {
    const matches = this.workflow.edges.flatMap((edge) => {
      if (edge.target !== this.agentNodeId || edge.targetHandle !== "tool") return [];
      const node = this.workflow.nodes[edge.source];
      if (!node || node.type !== "ai-tool" || node.disabled) return [];
      const definition = resolvePluginAgentTool(node.pluginId, node.methodId);
      return definition.name === toolName
        ? [{
            nodeId: edge.source,
            toolName,
            pluginId: node.pluginId,
            methodId: node.methodId,
            node,
            requiresApproval: node.requiresApproval || definition.requiresApproval,
            sideEffect: node.sideEffect ?? definition.sideEffect,
            inputSchema: definition.inputSchema,
          }]
        : [];
    });
    if (matches.length === 0) {
      throw new Error(`Connected agent tool was not found: ${toolName}`);
    }
    if (matches.length > 1) {
      throw new Error(`Connected agent tool name is ambiguous: ${toolName}`);
    }
    return matches[0]!;
  }
}

export function isAiToolTarget(
  target: AgentWorkflowToolTarget,
): target is AgentWorkflowToolTarget & { node: AiToolNode } {
  return target.node?.type === "ai-tool";
}
