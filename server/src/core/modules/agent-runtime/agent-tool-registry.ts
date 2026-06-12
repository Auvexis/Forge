import type { AiToolNodeConfig, AgentToolSideEffect } from "./agent-types.ts";
import {
  listPluginAgentTools,
  resolvePluginAgentTool,
  type SailorAgentToolDefinition,
} from "./plugin-tool-adapter.ts";

export interface AgentToolRegistryOptions {
  requireApprovalForSideEffects?: AgentToolSideEffect[];
}

export class AgentToolRegistry {
  private readonly requireApprovalForSideEffects: Set<AgentToolSideEffect>;

  constructor(options: AgentToolRegistryOptions = {}) {
    this.requireApprovalForSideEffects = new Set(options.requireApprovalForSideEffects ?? []);
  }

  listAvailableTools(): SailorAgentToolDefinition[] {
    return listPluginAgentTools();
  }

  resolveConfiguredTools(configs: AiToolNodeConfig[]): SailorAgentToolDefinition[] {
    return configs.map((config) => {
      const definition = resolvePluginAgentTool(config.pluginId, config.methodId);
      const sideEffect = config.sideEffect ?? definition.sideEffect;

      if (
        this.requireApprovalForSideEffects.has(sideEffect) &&
        !config.requiresApproval &&
        !definition.requiresApproval
      ) {
        throw new Error(`Agent tool ${definition.name} requires approval for ${sideEffect}`);
      }

      return {
        ...definition,
        description: config.descriptionOverride ?? definition.description,
        sideEffect,
        requiresApproval: config.requiresApproval,
        timeoutMs: config.timeoutMs ?? definition.timeoutMs,
      };
    });
  }
}
