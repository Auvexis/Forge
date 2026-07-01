import type { WorkflowNode } from "../../../shared/models/workflow-types.ts";
import type { CapabilityAdapter } from "./dependency-types.ts";

export class CapabilityAdapterRegistry {
  private readonly adapters = new Map<string, CapabilityAdapter[]>();

  register(adapter: CapabilityAdapter, options: { replace?: boolean } = {}): void {
    if (options.replace) {
      this.adapters.set(adapter.capability, [adapter]);
      return;
    }
    const current = this.adapters.get(adapter.capability) ?? [];
    if (current.includes(adapter)) throw new Error(`Capability adapter "${adapter.capability}" is already registered.`);
    this.adapters.set(adapter.capability, [...current, adapter]);
  }

  get(capability: string, node: WorkflowNode): CapabilityAdapter {
    const adapter = this.adapters.get(capability)?.find((candidate) => candidate.supports(node));
    if (!adapter) throw new Error(`No adapter for capability "${capability}" supports node type "${node.type}".`);
    return adapter;
  }
}
