import { PluginManager } from "../plugins/manager.ts";
import type { AgentToolSideEffect } from "./agent-types.ts";

export interface AgentToolSelection {
  path: string;
  labelFields: string[];
  valueField: string;
  mode: "single" | "multiple";
}

export interface FabricAgentToolDefinition {
  name: string;
  description: string;
  instructions?: string;
  pluginId: string;
  pluginName?: string;
  methodId: string;
  inputSchema: Record<string, any>;
  outputSchema?: Record<string, any>;
  sideEffect: AgentToolSideEffect;
  requiresApproval: boolean;
  timeoutMs: number;
  selection?: AgentToolSelection;
}

interface AgentToolManifestMetadata {
  enabled?: boolean;
  name?: string;
  description?: string;
  instructions?: string;
  sideEffect?: AgentToolSideEffect;
  requiresApproval?: boolean;
  timeoutMs?: number;
  selection?: AgentToolSelection;
}

export function listPluginAgentTools(): FabricAgentToolDefinition[] {
  const tools: FabricAgentToolDefinition[] = [];

  for (const plugin of PluginManager.getPlugins()) {
    for (const methodId of Object.keys(plugin.manifest.methods ?? {})) {
      const methodManifest = (plugin.manifest.methods as Record<string, any>)[methodId];
      if (!methodManifest?.agentTool?.enabled) continue;
      if (typeof plugin.methods?.[methodId] !== "function") continue;
      tools.push(toToolDefinition(plugin.id, pluginDisplayName(plugin), methodId, methodManifest));
    }
  }

  return tools.sort((left, right) => left.name.localeCompare(right.name));
}

export function resolvePluginAgentTool(
  pluginId: string,
  methodId: string,
): FabricAgentToolDefinition {
  const plugin = PluginManager.getPlugin(pluginId);
  const methodManifest = (plugin.manifest.methods as Record<string, any>)?.[methodId];

  if (!methodManifest?.agentTool?.enabled) {
    throw new Error(`Plugin method is not enabled as an agent tool: ${pluginId}.${methodId}`);
  }
  if (typeof plugin.methods?.[methodId] !== "function") {
    throw new Error(`Agent tool is missing a runtime method: ${pluginId}.${methodId}`);
  }

  return toToolDefinition(plugin.id, pluginDisplayName(plugin), methodId, methodManifest);
}

function pluginDisplayName(plugin: { id: string; manifest: Record<string, any> }): string {
  return plugin.manifest.metadata?.name ?? plugin.manifest.name ?? plugin.id;
}

function toToolDefinition(
  pluginId: string,
  pluginName: string | undefined,
  methodId: string,
  methodManifest: Record<string, any>,
): FabricAgentToolDefinition {
  const metadata = methodManifest.agentTool as AgentToolManifestMetadata;
  return {
    name: normalizeToolName(metadata.name ?? `${pluginId}_${methodId}`),
    description: metadata.description ?? methodManifest.metadata?.description ?? methodId,
    ...(metadata.instructions?.trim() ? { instructions: metadata.instructions.trim() } : {}),
    pluginId,
    pluginName,
    methodId,
    inputSchema: methodManifest.parameters ?? { type: "object", properties: {} },
    ...(methodManifest.responseSchema ? { outputSchema: methodManifest.responseSchema } : {}),
    sideEffect: metadata.sideEffect ?? "read",
    requiresApproval: metadata.requiresApproval ?? metadata.sideEffect !== "read",
    timeoutMs: metadata.timeoutMs ?? 30000,
    ...(metadata.selection ? { selection: metadata.selection } : {}),
  };
}

function normalizeToolName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return /^[a-z]/.test(normalized) ? normalized : `tool_${normalized}`;
}
