import { InternalMcpToolCatalog } from "./internal-mcp-tool-catalog.ts";
import type {
  InternalMcpTool,
  InternalMcpToolCall,
  InternalMcpToolResult,
} from "./internal-mcp-types.ts";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "../agent-errors.ts";
import { InternalMcpCallError, normalizeInternalMcpError } from "./internal-mcp-error.ts";
import type { AgentToolCatalogSnapshot } from "../contracts/agent-domain-contracts.ts";

/**
 * Run-scoped MCP server assembled by the Fabric Host from the Agent node's
 * connected tools. It is not discoverable outside the run and has no remote
 * transport.
 */
export class InternalMcpServer {
  private readonly catalog: InternalMcpToolCatalog;

  constructor(
    tools: InternalMcpTool[],
    private readonly artifactBoundary?: InternalMcpArtifactBoundary,
    private readonly executionGuard?: InternalMcpExecutionGuard,
  ) {
    this.catalog = new InternalMcpToolCatalog(tools);
  }

  listTools() {
    return this.catalog.listCards();
  }

  describeTool(name: string): Omit<InternalMcpTool, "invoke"> {
    const { invoke: _invoke, ...descriptor } = this.catalog.get(name);
    return descriptor;
  }

  getToolSchema(name: string): Record<string, any> {
    return this.catalog.get(name).inputSchema;
  }

  snapshot(scope: {
    profileId: string;
    workflowId: string;
    nodeId: string;
  }): AgentToolCatalogSnapshot {
    return this.catalog.snapshot(scope);
  }

  async callTool(call: InternalMcpToolCall): Promise<InternalMcpToolResult> {
    const tool = this.catalog.get(call.name);
    let content: unknown;
    try {
      const invoke = async () => {
        const arguments_ = this.artifactBoundary
          ? await this.artifactBoundary.resolveArguments(call.arguments)
          : call.arguments;
        const rawContent = await withToolTimeout(
          tool.invoke(arguments_),
          tool.timeoutMs,
          tool.name,
        );
        return this.artifactBoundary
          ? await this.artifactBoundary.captureResult(call, rawContent)
          : rawContent;
      };
      content = this.executionGuard && tool.sideEffect !== "read" && call.actionId
        ? await this.executionGuard.execute({
            call,
            timeoutMs: tool.timeoutMs,
            invoke,
          })
        : await invoke();
    } catch (error) {
      if (error instanceof AgentToolApprovalRequiredError) throw error;
      throw new InternalMcpCallError(normalizeInternalMcpError(error, tool.name));
    }
    return {
      call,
      content,
      toolCall: {
        toolCallId: call.id,
        name: tool.name,
        ...(tool.pluginId ? { pluginId: tool.pluginId } : {}),
        ...(tool.pluginName ? { pluginName: tool.pluginName } : {}),
        status: "success",
      },
    };
  }
}

export interface InternalMcpArtifactBoundary {
  resolveArguments(arguments_: Record<string, unknown>): Promise<Record<string, unknown>>;
  captureResult(call: InternalMcpToolCall, content: unknown): Promise<unknown>;
}

export interface InternalMcpExecutionGuard {
  execute(input: {
    call: InternalMcpToolCall;
    timeoutMs: number;
    invoke: () => Promise<unknown>;
  }): Promise<unknown>;
}

async function withToolTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  toolName: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new AgentRuntimeError(
          `Internal MCP tool ${toolName} timed out after ${timeoutMs}ms`,
          "AGENT_TOOL_TIMEOUT",
          `Tool ${toolName} timed out`,
          504,
        )), timeoutMs);
        timeout.unref?.();
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    promise.catch(() => undefined);
  }
}
