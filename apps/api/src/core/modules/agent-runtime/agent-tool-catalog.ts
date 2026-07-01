import type { AgentToolSideEffect } from "./agent-types.ts";
import type { AgentToolRef } from "../ai-services/ai-service-types.ts";

export interface AgentToolCatalogInput {
  name: string;
  description?: string;
  instructions?: string;
  sideEffect?: AgentToolSideEffect;
  pluginName?: string;
  pluginId?: string;
  methodId?: string;
  inputSchema?: Record<string, any>;
  configuredDefaults?: Record<string, any>;
}

export interface AgentToolCatalogEntry {
  name: string;
  pluginName?: string;
  description: string;
  instructions?: string;
  sideEffect: AgentToolSideEffect;
}

export function buildAgentToolCatalog(tools: Array<AgentToolCatalogInput | AgentToolRef>): AgentToolCatalogEntry[] {
  return tools.map((tool) => {
    const pluginName = "pluginName" in tool ? tool.pluginName : undefined;
    const description = "description" in tool
      ? tool.description
      : "descriptionOverride" in tool ? tool.descriptionOverride : undefined;
    const instructions = "instructions" in tool ? tool.instructions : undefined;
    return {
      name: tool.name,
      ...(pluginName ? { pluginName } : {}),
      description: description?.trim() || tool.name,
      ...(instructions?.trim() ? { instructions: instructions.trim() } : {}),
      sideEffect: tool.sideEffect ?? "read",
    };
  });
}
