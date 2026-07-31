import { AgentRuntimeError } from "../agent-errors.ts";
import { AGENT_LIMITS } from "../agent-limits.ts";
import type { InternalMcpTool, InternalMcpToolCard } from "./internal-mcp-types.ts";
import { createHash } from "node:crypto";
import type { AgentToolCatalogSnapshot } from "../contracts/agent-domain-contracts.ts";

/**
 * Run-scoped catalog. Only tools connected to the executing AI Agent node are
 * projected into this catalog; it never discovers or exposes external servers.
 */
export class InternalMcpToolCatalog {
  private readonly tools: Map<string, InternalMcpTool>;

  constructor(tools: InternalMcpTool[]) {
    if (tools.length > AGENT_LIMITS.maxConnectedTools) {
      throw invalidCatalog(`Agent has more than ${AGENT_LIMITS.maxConnectedTools} connected tools`);
    }
    this.tools = new Map();
    for (const tool of tools) {
      validateTool(tool);
      if (this.tools.has(tool.name)) {
        throw new AgentRuntimeError(
          `Duplicate connected agent tool: ${tool.name}`,
          "AGENT_TOOL_DUPLICATE",
          "Two connected tools expose the same name",
          400,
        );
      }
      this.tools.set(tool.name, sanitizeTool(tool));
    }
  }

  listCards(): InternalMcpToolCard[] {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      summary: compactSummary(tool.summary),
      aliases: toolAliases(tool),
      sideEffect: tool.sideEffect ?? "read",
    }));
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  get(name: string): InternalMcpTool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new AgentRuntimeError(
        `Unknown connected agent tool: ${name}`,
        "AGENT_TOOL_UNKNOWN",
        "Agent requested an unavailable tool",
        400,
      );
    }
    return tool;
  }

  snapshot(scope: {
    profileId: string;
    workflowId: string;
    nodeId: string;
  }): AgentToolCatalogSnapshot {
    return {
      ...scope,
      tools: [...this.tools.values()].map((tool) => ({
        name: tool.name,
        ...(tool.pluginId ? { pluginId: tool.pluginId } : {}),
        ...(tool.methodId ? { methodId: tool.methodId } : {}),
        sideEffect: tool.sideEffect ?? "read",
        schemaHash: createHash("sha256")
          .update(stableJson(tool.inputSchema))
          .digest("hex"),
      })),
    };
  }
}

function toolAliases(tool: InternalMcpTool): string[] {
  const values = [
    tool.methodId,
    tool.pluginName && tool.methodId ? `${tool.pluginName} ${tool.methodId}` : undefined,
    ...tool.name.split(/[_.:-]+/g),
  ];
  return [...new Set(values
    .filter((value): value is string => Boolean(value))
    .map((value) => sanitizeMetadataText(value).toLowerCase())
    .filter((value) => value && value !== tool.name.toLowerCase()))]
    .slice(0, 8);
}

function compactSummary(value: string): string {
  const normalized = sanitizeMetadataText(value);
  return normalized.length <= AGENT_LIMITS.maxToolSummaryChars
    ? normalized
    : `${normalized.slice(0, AGENT_LIMITS.maxToolSummaryChars - 3)}...`;
}

function validateTool(tool: InternalMcpTool): void {
  if (
    !/^[a-zA-Z0-9_.:-]+$/.test(tool.name) ||
    tool.name.length > AGENT_LIMITS.maxToolNameChars
  ) {
    throw invalidCatalog("Connected tool has an invalid name");
  }
  if (tool.summary.length > AGENT_LIMITS.maxToolSummaryChars * 4) {
    throw invalidCatalog(`Connected tool ${tool.name} has an oversized summary`);
  }
  if ((tool.instructions?.length ?? 0) > AGENT_LIMITS.maxToolInstructionsChars) {
    throw invalidCatalog(`Connected tool ${tool.name} has oversized instructions`);
  }

  validateSchema(tool.name, "input", tool.inputSchema);
  if (tool.outputSchema) validateSchema(tool.name, "output", tool.outputSchema);
}

function validateSchema(
  toolName: string,
  kind: "input" | "output",
  schema: Record<string, unknown>,
): void {
  let encoded: string;
  try {
    encoded = JSON.stringify(schema);
  } catch {
    throw invalidCatalog(`Connected tool ${toolName} has a non-serializable ${kind} schema`);
  }
  if (Buffer.byteLength(encoded, "utf8") > AGENT_LIMITS.maxToolSchemaBytes) {
    throw invalidCatalog(`Connected tool ${toolName} has an oversized schema (${kind})`);
  }
  const stats = inspectSchema(schema);
  if (stats.depth > AGENT_LIMITS.maxToolSchemaDepth || stats.keys > AGENT_LIMITS.maxToolSchemaKeys) {
    throw invalidCatalog(`Connected tool ${toolName} has an overly complex ${kind} schema`);
  }
  if (stats.hasExternalRef) {
    throw invalidCatalog(`Connected tool ${toolName} has an external schema reference (${kind})`);
  }
}

function sanitizeTool(tool: InternalMcpTool): InternalMcpTool {
  return Object.freeze({
    ...tool,
    summary: compactSummary(tool.summary),
    ...(tool.instructions
      ? { instructions: sanitizeMetadataText(tool.instructions) }
      : {}),
    inputSchema: sanitizeSchemaMetadata(tool.inputSchema),
    ...(tool.outputSchema
      ? { outputSchema: sanitizeSchemaMetadata(tool.outputSchema) }
      : {}),
  });
}

function sanitizeSchemaMetadata(value: unknown, key?: string): any {
  if (typeof value === "string") {
    return key === "title" || key === "description" || key === "$comment"
      ? sanitizeMetadataText(value)
      : value;
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeSchemaMetadata(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([childKey, child]) => [childKey, sanitizeSchemaMetadata(child, childKey)]),
  );
}

function sanitizeMetadataText(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function inspectSchema(
  value: unknown,
  depth = 0,
): { depth: number; keys: number; hasExternalRef: boolean } {
  if (!value || typeof value !== "object") {
    return { depth, keys: 0, hasExternalRef: false };
  }
  const entries: Array<readonly [string, unknown]> = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value as Record<string, unknown>);
  return entries.reduce<{ depth: number; keys: number; hasExternalRef: boolean }>(
    (total, [key, item]) => {
      const child = inspectSchema(item, depth + 1);
      const externalRef = key === "$ref" && typeof item === "string" && !item.startsWith("#");
      return {
        depth: Math.max(total.depth, child.depth),
        keys: total.keys + child.keys + 1,
        hasExternalRef: total.hasExternalRef || child.hasExternalRef || externalRef,
      };
    },
    { depth, keys: 0, hasExternalRef: false },
  );
}

function invalidCatalog(detail: string): AgentRuntimeError {
  return new AgentRuntimeError(
    `Invalid internal MCP tool catalog: ${detail}`,
    "AGENT_TOOL_CATALOG_INVALID",
    "Connected tool catalog is invalid",
    400,
  );
}
