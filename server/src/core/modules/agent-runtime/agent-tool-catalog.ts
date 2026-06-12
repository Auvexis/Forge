import type { AgentToolSideEffect } from "./agent-types.ts";

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

export function buildAgentToolCatalog(tools: AgentToolCatalogInput[]): AgentToolCatalogEntry[] {
  return tools.map((tool) => ({
    name: tool.name,
    ...(tool.pluginName ? { pluginName: tool.pluginName } : {}),
    description: tool.description?.trim() || tool.name,
    ...(tool.instructions?.trim() ? { instructions: tool.instructions.trim() } : {}),
    sideEffect: tool.sideEffect ?? "read",
  }));
}
