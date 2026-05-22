import type {
  PluginBlueprint,
  PluginBlueprintMethod,
  PluginBlueprintNode,
} from "./plugin-blueprint-types.ts";

export type PluginMethodPlanStep =
  | { kind: "httpRequest"; nodeId: string; methodId: string }
  | { kind: "responseMapper"; nodeId: string; methodId: string }
  | { kind: "errorMapper"; nodeId: string; methodId: string }
  | { kind: "codeBlock"; nodeId: string; methodId: string; codeBlockId: string };

export interface PluginMethodPlan {
  methodId: string;
  handle: string;
  name: string;
  steps: PluginMethodPlanStep[];
}

export function buildPluginMethodPlans(blueprint: PluginBlueprint): PluginMethodPlan[] {
  return blueprint.methods.map((method) => {
    const methodNode = Object.values(blueprint.canvas.nodes).find(
      (node) => node.type === "method" && node.data.methodId === method.id,
    );
    const orderedNodes = methodNode ? walkGraphFromNode(blueprint, methodNode.id) : [];
    const steps = orderedNodes.flatMap((node) => nodeToPlanStep(node, method));

    return {
      methodId: method.id,
      handle: method.handle,
      name: method.name,
      steps: steps.length > 0 ? steps : fallbackSteps(method),
    };
  });
}

function walkGraphFromNode(blueprint: PluginBlueprint, startNodeId: string): PluginBlueprintNode[] {
  const visited = new Set<string>([startNodeId]);
  const ordered: PluginBlueprintNode[] = [];
  const queue = [...nextNodeIds(blueprint, startNodeId)];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = blueprint.canvas.nodes[nodeId];
    if (!node) continue;
    ordered.push(node);
    queue.push(...nextNodeIds(blueprint, nodeId));
  }

  return ordered;
}

function nextNodeIds(blueprint: PluginBlueprint, nodeId: string): string[] {
  return blueprint.canvas.edges
    .filter((edge) => edge.source === nodeId)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((edge) => edge.target);
}

function nodeToPlanStep(
  node: PluginBlueprintNode,
  method: PluginBlueprintMethod,
): PluginMethodPlanStep[] {
  const methodId = String(node.data.methodId ?? method.id);
  if (methodId !== method.id) return [];

  switch (node.type) {
    case "request":
      return [{ kind: "httpRequest", nodeId: node.id, methodId }];
    case "responseMapper":
    case "output":
      return [{ kind: "responseMapper", nodeId: node.id, methodId }];
    case "errorMapper":
      return [{ kind: "errorMapper", nodeId: node.id, methodId }];
    case "codeBlock":
      return [
        {
          kind: "codeBlock",
          nodeId: node.id,
          methodId,
          codeBlockId: String(node.data.codeBlockId ?? node.id),
        },
      ];
    default:
      return [];
  }
}

function fallbackSteps(method: PluginBlueprintMethod): PluginMethodPlanStep[] {
  return [
    { kind: "httpRequest", nodeId: `${method.id}_request`, methodId: method.id },
    { kind: "responseMapper", nodeId: `${method.id}_response`, methodId: method.id },
    { kind: "errorMapper", nodeId: `${method.id}_error`, methodId: method.id },
  ];
}
