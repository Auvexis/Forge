import type { WorkflowNode } from "../../../shared/models/workflow-types.ts";
import { getUtilityNodeCatalogItem } from "../../utility-nodes/utility-node-catalog.ts";
import type { UtilityNodeCatalogItem, UtilityNodeHandleDefinition } from "../../utility-nodes/utility-node-pack.types.ts";
import type { NodeHandlerInput } from "../types.ts";
import { CapabilityAdapterRegistry } from "./capability-adapter-registry.ts";
import type { ResolvedConfigDependencies } from "./dependency-types.ts";

type DefinitionLookup = (type: string) => UtilityNodeCatalogItem | null;

export class ConfigDependencyResolver {
  private readonly adapters: CapabilityAdapterRegistry;
  private readonly definitionLookup: DefinitionLookup;

  constructor(
    adapters: CapabilityAdapterRegistry,
    definitionLookup: DefinitionLookup = (type) => getUtilityNodeCatalogItem(type as any),
  ) {
    this.adapters = adapters;
    this.definitionLookup = definitionLookup;
  }

  resolveForNode(execution: NodeHandlerInput, nodeId: string): Promise<ResolvedConfigDependencies> {
    return this.resolve(execution, nodeId, [nodeId]);
  }

  private async resolve(execution: NodeHandlerInput, nodeId: string, path: string[]): Promise<ResolvedConfigDependencies> {
    const node = execution.workflow.nodes[nodeId];
    if (!node) throw new Error(`Configuration dependency node "${nodeId}" was not found.`);
    const definition = this.definitionLookup(node.type);
    if (!definition) throw new Error(`Configuration dependency definition for node type "${node.type}" was not found.`);
    const values = new Map<string, unknown[]>();

    for (const handle of definition.handles.filter((candidate) => candidate.type === "target" && candidate.accepts?.length)) {
      const edges = execution.workflow.edges.filter((edge) => {
        if (edge.target !== nodeId) return false;
        if (edge.targetHandle) return edge.targetHandle === handle.id;
        const source = execution.workflow.nodes[edge.source];
        const sourceCapabilities = source ? this.definitionLookup(source.type)?.capabilities ?? [] : [];
        const compatibleHandles = definition.handles.filter((candidate) => candidate.type === "target" && candidate.accepts?.some((selector) => sourceCapabilities.includes(selector.capability)));
        return compatibleHandles.length === 1 && compatibleHandles[0].id === handle.id;
      });
      this.validateCount(nodeId, handle, edges.length);
      const resolved: unknown[] = [];
      for (const edge of edges) {
        const source = execution.workflow.nodes[edge.source];
        if (!source) throw new Error(`Node "${nodeId}" handle "${handle.id}" references missing node "${edge.source}".`);
        const sourceDefinition = this.definitionLookup(source.type);
        const selector = handle.accepts!.find((candidate) =>
          sourceDefinition?.capabilities.includes(candidate.capability) &&
          (!candidate.providerId || candidate.providerId === (source as any).pluginId) &&
          (!candidate.methodId || candidate.methodId === (source as any).methodId),
        );
        if (!selector || !this.allowed(handle, source, sourceDefinition)) {
          throw new Error(`Node "${nodeId}" handle "${handle.id}" requires capability "${handle.accepts![0].capability}" but node "${edge.source}" provides [${sourceDefinition?.capabilities.join(", ") ?? ""}].`);
        }
        if (path.includes(edge.source)) throw new Error(`Configuration dependency cycle: ${[...path, edge.source].join(" -> ")}`);
        const adapter = this.adapters.get(selector.capability, source);
        resolved.push(await adapter.resolve({
          execution,
          consumerNodeId: nodeId,
          path: [...path, edge.source],
          resolveDependencies: (nestedId) => this.resolve(execution, nestedId, [...path, nestedId]),
        }, edge.source));
      }
      values.set(handle.id, resolved);
    }

    return {
      getOne: <T>(handleId: string) => {
        const value = values.get(handleId)?.[0];
        if (value === undefined) throw new Error(`Resolved dependency "${handleId}" was not found for node "${nodeId}".`);
        return value as T;
      },
      getOptional: <T>(handleId: string) => values.get(handleId)?.[0] as T | undefined,
      getMany: <T>(handleId: string) => (values.get(handleId) ?? []) as T[],
    };
  }

  private validateCount(nodeId: string, handle: UtilityNodeHandleDefinition, count: number): void {
    if (handle.required && count === 0) {
      throw new Error(`Node "${nodeId}" handle "${handle.id}" requires capability "${handle.accepts?.[0]?.capability}".`);
    }
    if ((handle.cardinality ?? "one") === "one" && count > 1) {
      throw new Error(`Node "${nodeId}" handle "${handle.id}" accepts one connection but received ${count}.`);
    }
  }

  private allowed(handle: UtilityNodeHandleDefinition, node: WorkflowNode, definition: UtilityNodeCatalogItem | null): boolean {
    if (!handle.allowedNodes || handle.allowedNodes === "*") return true;
    return handle.allowedNodes.includes(`node:${node.type}`) ||
      ("pluginId" in node && handle.allowedNodes.includes(`plugin:${String(node.pluginId)}`)) ||
      Boolean(definition?.capabilities.some((capability) => handle.allowedNodes!.includes(`capability:${capability}`)));
  }
}
