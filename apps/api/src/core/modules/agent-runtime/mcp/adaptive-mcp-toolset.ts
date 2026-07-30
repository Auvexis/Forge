import { createHash } from "node:crypto";
import type { AgentProcessorTool } from "../processor/agent-response-stream.ts";
import { InternalMcpClient } from "./internal-mcp-client.ts";
import type { InternalMcpToolCall, InternalMcpToolResult } from "./internal-mcp-types.ts";

const SEARCH_TOOL = "fabric_search_tools";
const DESCRIBE_TOOL = "fabric_describe_tools";
const DEFAULT_DIRECT_SCHEMA_LIMIT = 12;
const DEFAULT_ACTIVATION_LIMIT = 12;

export class AdaptiveMcpToolset {
  private static readonly schemaCache = new Map<string, Readonly<Record<string, unknown>>>();
  private static readonly maxCachedSchemas = 512;
  private readonly activated = new Set<string>();
  private readonly cards;
  private readonly directSchemaLimit: number;
  private readonly activationLimit: number;

  constructor(
    private readonly client: InternalMcpClient,
    options: {
      directSchemaLimit?: number;
      activationLimit?: number;
    } = {},
  ) {
    this.directSchemaLimit = options.directSchemaLimit ?? DEFAULT_DIRECT_SCHEMA_LIMIT;
    this.activationLimit = options.activationLimit ?? DEFAULT_ACTIVATION_LIMIT;
    this.cards = this.client.listTools();
  }

  listForModel(): AgentProcessorTool[] {
    const cards = this.cards;
    if (cards.length <= this.directSchemaLimit) {
      return cards.map((card) => this.modelTool(card.name, card.summary));
    }
    return [
      searchToolDefinition(),
      describeToolDefinition(cards.map((card) => card.name)),
      ...cards
        .filter((card) => this.activated.has(card.name))
        .map((card) => this.modelTool(card.name, card.summary)),
    ];
  }

  describe(name: string) {
    if (name === SEARCH_TOOL || name === DESCRIBE_TOOL) {
      return { sideEffect: "read" as const, requiresApproval: false };
    }
    return this.client.describeTool(name);
  }

  async call(call: InternalMcpToolCall): Promise<InternalMcpToolResult> {
    if (call.name === SEARCH_TOOL) return this.search(call);
    if (call.name === DESCRIBE_TOOL) return this.activate(call);
    if (this.cards.length > this.directSchemaLimit && !this.activated.has(call.name)) {
      throw new Error(`Tool schema must be activated before calling ${call.name}`);
    }
    return this.client.callTool(call);
  }

  private search(call: InternalMcpToolCall): InternalMcpToolResult {
    const query = String(call.arguments.query ?? "").trim();
    const limit = clampInteger(call.arguments.limit, 1, 10, 6);
    const tokens = tokenize(query);
    const matches = this.cards
      .map((card) => ({
        ...card,
        score: searchScore(tokens, `${card.name} ${card.summary}`),
      }))
      .filter((card) => tokens.length === 0 || card.score > 0)
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
      .slice(0, limit)
      .map(({ score: _score, ...card }) => card);
    return localResult(call, { tools: matches });
  }

  private activate(call: InternalMcpToolCall): InternalMcpToolResult {
    const names = Array.isArray(call.arguments.names)
      ? [...new Set(call.arguments.names.filter((name): name is string => typeof name === "string"))]
      : [];
    if (names.length === 0 || names.length > this.activationLimit) {
      throw new Error(`Describe between 1 and ${this.activationLimit} tools`);
    }
    const tools = names.map((name) => {
      const card = this.client.describeTool(name);
      this.activated.add(name);
      return {
        name,
        description: card.summary,
        inputSchema: this.cachedSchema(name),
      };
    });
    return localResult(call, { tools });
  }

  private modelTool(name: string, description: string): AgentProcessorTool {
    return {
      name,
      description,
      inputSchema: this.cachedSchema(name),
    };
  }

  private cachedSchema(name: string): Record<string, unknown> {
    const schema = this.client.getToolSchema(name);
    const hash = createHash("sha256").update(stableJson(schema)).digest("hex");
    const cached = AdaptiveMcpToolset.schemaCache.get(hash);
    if (cached) {
      AdaptiveMcpToolset.schemaCache.delete(hash);
      AdaptiveMcpToolset.schemaCache.set(hash, cached);
      return cached;
    }
    const frozen = deepFreeze(structuredClone(schema));
    AdaptiveMcpToolset.schemaCache.set(hash, frozen);
    while (AdaptiveMcpToolset.schemaCache.size > AdaptiveMcpToolset.maxCachedSchemas) {
      const oldest = AdaptiveMcpToolset.schemaCache.keys().next().value;
      if (typeof oldest !== "string") break;
      AdaptiveMcpToolset.schemaCache.delete(oldest);
    }
    return frozen;
  }
}

function searchToolDefinition(): AgentProcessorTool {
  return {
    name: SEARCH_TOOL,
    description: "Search the connected Fabric tools by capability before choosing a tool.",
    inputSchema: {
      type: "object",
      required: ["query"],
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 10 },
      },
    },
  };
}

function describeToolDefinition(names: string[]): AgentProcessorTool {
  return {
    name: DESCRIBE_TOOL,
    description: "Load the input schemas for selected connected tools.",
    inputSchema: {
      type: "object",
      required: ["names"],
      additionalProperties: false,
      properties: {
        names: {
          type: "array",
          minItems: 1,
          maxItems: DEFAULT_ACTIVATION_LIMIT,
          uniqueItems: true,
          items: { type: "string", enum: names },
        },
      },
    },
  };
}

function localResult(call: InternalMcpToolCall, content: unknown): InternalMcpToolResult {
  return {
    call,
    content,
    toolCall: {
      toolCallId: call.id,
      name: call.name,
      status: "success",
    },
  };
}

function tokenize(value: string): string[] {
  return value.toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^a-z0-9_.:-]+/)
    .filter((token) => token.length > 1);
}

function searchScore(tokens: string[], value: string): number {
  const normalized = tokenize(value).join(" ");
  return tokens.reduce((score, token) => score + (normalized.includes(token) ? 1 : 0), 0);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  return Number.isSafeInteger(value) ? Math.min(max, Math.max(min, Number(value))) : fallback;
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

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}
