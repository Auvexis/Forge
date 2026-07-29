import { AgentRuntimeError } from "../agent-errors.ts";
import { AGENT_LIMITS } from "../agent-limits.ts";
import type { InternalMcpTool, InternalMcpToolCard } from "./internal-mcp-types.ts";

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
      this.tools.set(tool.name, tool);
    }
  }

  listCards(): InternalMcpToolCard[] {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      summary: compactSummary(tool.summary),
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
}

function compactSummary(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= AGENT_LIMITS.maxToolSummaryChars
    ? normalized
    : `${normalized.slice(0, AGENT_LIMITS.maxToolSummaryChars - 3)}...`;
}

function validateTool(tool: InternalMcpTool): void {
  if (!tool.name.trim() || tool.name.length > AGENT_LIMITS.maxToolNameChars) {
    throw invalidCatalog("Connected tool has an invalid name");
  }
  if (tool.summary.length > AGENT_LIMITS.maxToolSummaryChars * 4) {
    throw invalidCatalog(`Connected tool ${tool.name} has an oversized summary`);
  }
  if ((tool.instructions?.length ?? 0) > AGENT_LIMITS.maxToolInstructionsChars) {
    throw invalidCatalog(`Connected tool ${tool.name} has oversized instructions`);
  }

  let encoded: string;
  try {
    encoded = JSON.stringify(tool.inputSchema);
  } catch {
    throw invalidCatalog(`Connected tool ${tool.name} has a non-serializable schema`);
  }
  if (Buffer.byteLength(encoded, "utf8") > AGENT_LIMITS.maxToolSchemaBytes) {
    throw invalidCatalog(`Connected tool ${tool.name} has an oversized schema`);
  }
  const stats = inspectSchema(tool.inputSchema);
  if (stats.depth > AGENT_LIMITS.maxToolSchemaDepth || stats.keys > AGENT_LIMITS.maxToolSchemaKeys) {
    throw invalidCatalog(`Connected tool ${tool.name} has an overly complex schema`);
  }
  if (stats.hasExternalRef) {
    throw invalidCatalog(`Connected tool ${tool.name} has an external schema reference`);
  }
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
