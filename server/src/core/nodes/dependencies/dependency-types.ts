import type { WorkflowNode } from "../../../shared/models/workflow-types.ts";
import type { NodeHandlerInput } from "../types.ts";

export interface ResolvedConfigDependencies {
  getOne<T>(handleId: string): T;
  getOptional<T>(handleId: string): T | undefined;
  getMany<T>(handleId: string): T[];
}

export interface DependencyResolutionContext {
  execution: NodeHandlerInput;
  consumerNodeId: string;
  path: string[];
  resolveDependencies(nodeId: string): Promise<ResolvedConfigDependencies>;
}

export interface CapabilityAdapter<T = unknown> {
  capability: string;
  supports(node: WorkflowNode): boolean;
  resolve(context: DependencyResolutionContext, nodeId: string): Promise<T>;
}
