import type {
  PluginBlueprint,
  PluginBlueprintMethod,
  PluginBlueprintNode,
  PluginBlueprintCatchCase,
  PluginBlueprintSwitchCase,
} from "./plugin-blueprint-types.ts";
import type {
  PluginMethodPlan,
  PluginMethodPlanStep,
} from "./plugin-method-plan-types.ts";

export type {
  PluginMethodPlan,
  PluginMethodPlanStep,
} from "./plugin-method-plan-types.ts";

const branchHandles = new Set([
  "then",
  "else",
  "default",
  "try",
  "catch",
  "body",
]);

export function buildPluginMethodPlans(
  blueprint: PluginBlueprint,
): PluginMethodPlan[] {
  return blueprint.methods.map((method) => {
    const methodNode = Object.values(blueprint.canvas.nodes).find(
      (node) => node.type === "method" && node.data.methodId === method.id,
    );
    const steps = methodNode
      ? buildStepsFromNodeIds(
          blueprint,
          method,
          nextNodeIds(blueprint, methodNode.id),
          new Set(),
        )
      : [];

    return {
      methodId: method.id,
      handle: method.handle,
      name: method.name,
      steps: steps.length > 0 ? steps : fallbackSteps(method),
    };
  });
}

function buildStepsFromNodeIds(
  blueprint: PluginBlueprint,
  method: PluginBlueprintMethod,
  startNodeIds: string[],
  visited: Set<string>,
): PluginMethodPlanStep[] {
  const steps: PluginMethodPlanStep[] = [];
  const queue = [...startNodeIds];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = blueprint.canvas.nodes[nodeId];
    if (!node) continue;

    const step = nodeToPlanStep(blueprint, node, method, visited);
    if (step) {
      steps.push(step);
      if (step.kind === "return") break;
    }

    queue.unshift(...nextNodeIds(blueprint, nodeId));
  }

  return steps;
}

function nextNodeIds(blueprint: PluginBlueprint, nodeId: string): string[] {
  return blueprint.canvas.edges
    .filter(
      (edge) => edge.source === nodeId && isSequentialHandle(edge.sourceHandle),
    )
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((edge) => edge.target);
}

function branchNodeIds(
  blueprint: PluginBlueprint,
  nodeId: string,
  handle: string,
): string[] {
  return blueprint.canvas.edges
    .filter((edge) => edge.source === nodeId && edge.sourceHandle === handle)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((edge) => edge.target);
}

function isSequentialHandle(handle: string | undefined): boolean {
  return !handle || handle === "next" || !branchHandles.has(handle);
}

function nodeToPlanStep(
  blueprint: PluginBlueprint,
  node: PluginBlueprintNode,
  method: PluginBlueprintMethod,
  visited: Set<string>,
): PluginMethodPlanStep | null {
  const methodId = String(node.data.methodId ?? method.id);
  if (methodId !== method.id) return null;

  switch (node.type) {
    case "request":
      return { kind: "httpRequest", nodeId: node.id, methodId };
    case "responseMapper":
    case "output":
      return { kind: "responseMapper", nodeId: node.id, methodId };
    case "errorMapper":
      return { kind: "errorMapper", nodeId: node.id, methodId };
    case "codeBlock":
      return {
        kind: "codeBlock",
        nodeId: node.id,
        methodId,
        codeBlockId: String(node.data.codeBlockId ?? node.id),
      };
    case "if":
      return {
        kind: "if",
        nodeId: node.id,
        methodId,
        condition: stringData(node, "condition", "false"),
        thenSteps: buildStepsFromNodeIds(
          blueprint,
          method,
          branchNodeIds(blueprint, node.id, "then"),
          cloneVisited(visited),
        ),
        elseSteps: buildStepsFromNodeIds(
          blueprint,
          method,
          branchNodeIds(blueprint, node.id, "else"),
          cloneVisited(visited),
        ),
      };
    case "switch": {
      const cases = arrayData<PluginBlueprintSwitchCase>(node, "cases").map(
        (candidate, index) => {
          const handle = String(
            candidate.handle ?? candidate.id ?? `case_${index}`,
          );
          return {
            id: String(candidate.id ?? handle),
            label: String(candidate.label ?? handle),
            value: candidate.value,
            handle,
            steps: buildStepsFromNodeIds(
              blueprint,
              method,
              branchNodeIds(blueprint, node.id, handle),
              cloneVisited(visited),
            ),
          };
        },
      );

      return {
        kind: "switch",
        nodeId: node.id,
        methodId,
        expression: stringData(node, "expression", "undefined"),
        cases,
        defaultSteps: buildStepsFromNodeIds(
          blueprint,
          method,
          branchNodeIds(blueprint, node.id, "default"),
          cloneVisited(visited),
        ),
      };
    }
    case "tryCatch":
      const catchCases = arrayData<PluginBlueprintCatchCase>(
        node,
        "catchCases",
      ).map((candidate, index) => {
        const handle = String(
          candidate.handle ?? candidate.id ?? `catch_${index}`,
        );
        return {
          id: String(candidate.id ?? handle),
          label: String(candidate.label ?? handle),
          errorCode: optionalString(candidate.errorCode),
          handle,
          steps: buildStepsFromNodeIds(
            blueprint,
            method,
            branchNodeIds(blueprint, node.id, handle),
            cloneVisited(visited),
          ),
        };
      });

      return {
        kind: "tryCatch",
        nodeId: node.id,
        methodId,
        errorVariable: stringData(node, "errorVariable", "error"),
        catchCases,
        trySteps: buildStepsFromNodeIds(
          blueprint,
          method,
          branchNodeIds(blueprint, node.id, "try"),
          cloneVisited(visited),
        ),
        catchSteps: buildStepsFromNodeIds(
          blueprint,
          method,
          branchNodeIds(blueprint, node.id, "catch"),
          cloneVisited(visited),
        ),
      };
    case "jsonTransform":
      return {
        kind: "jsonTransform",
        nodeId: node.id,
        methodId,
        expression: stringData(node, "expression", "previous"),
        outputName: optionalStringData(node, "outputName"),
      };
    case "return":
      return {
        kind: "return",
        nodeId: node.id,
        methodId,
        valueExpression: stringData(node, "valueExpression", "previous"),
      };
    case "for":
      return {
        kind: "for",
        nodeId: node.id,
        methodId,
        itemVariable: stringData(node, "itemVariable", "item"),
        fromExpression: optionalStringData(node, "fromExpression"),
        toExpression: optionalStringData(node, "toExpression"),
        iterableExpression: optionalStringData(node, "iterableExpression"),
        bodySteps: buildStepsFromNodeIds(
          blueprint,
          method,
          branchNodeIds(blueprint, node.id, "body"),
          cloneVisited(visited),
        ),
      };
    case "forEach":
      return {
        kind: "forEach",
        nodeId: node.id,
        methodId,
        arrayExpression: stringData(node, "arrayExpression", "[]"),
        itemVariable: stringData(node, "itemVariable", "item"),
        bodySteps: buildStepsFromNodeIds(
          blueprint,
          method,
          branchNodeIds(blueprint, node.id, "body"),
          cloneVisited(visited),
        ),
      };
    default:
      return null;
  }
}

function fallbackSteps(method: PluginBlueprintMethod): PluginMethodPlanStep[] {
  return [
    {
      kind: "httpRequest",
      nodeId: `${method.id}_request`,
      methodId: method.id,
    },
    {
      kind: "responseMapper",
      nodeId: `${method.id}_response`,
      methodId: method.id,
    },
    { kind: "errorMapper", nodeId: `${method.id}_error`, methodId: method.id },
  ];
}

function cloneVisited(visited: Set<string>): Set<string> {
  return new Set(visited);
}

function stringData(
  node: PluginBlueprintNode,
  key: string,
  fallback: string,
): string {
  const value = node.data[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function optionalStringData(
  node: PluginBlueprintNode,
  key: string,
): string | undefined {
  const value = node.data[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function arrayData<T>(node: PluginBlueprintNode, key: string): T[] {
  const value = node.data[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
