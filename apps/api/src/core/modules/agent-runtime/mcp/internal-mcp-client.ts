import type { InternalMcpToolCall } from "./internal-mcp-types.ts";
import { InternalMcpServer } from "./internal-mcp-server.ts";
import { InternalMcpArgumentValidator } from "./internal-mcp-argument-validator.ts";
import { validateInternalMcpResult } from "./internal-mcp-result-validator.ts";

/**
 * MCP-shaped in-process boundary. The transport is deliberately internal:
 * connected Fabric tools are projected as MCP tools and retain their existing
 * secure invocation adapters.
 */
export class InternalMcpClient {
  private readonly argumentValidator = new InternalMcpArgumentValidator();

  constructor(private readonly server: InternalMcpServer) {}

  listTools() {
    return this.server.listTools();
  }

  getToolSchema(name: string): Record<string, any> {
    return this.server.getToolSchema(name);
  }

  describeTool(name: string) {
    return this.server.describeTool(name);
  }

  snapshot(scope: {
    profileId: string;
    workflowId: string;
    nodeId: string;
  }) {
    return this.server.snapshot(scope);
  }

  validateToolArguments(name: string, arguments_: Record<string, unknown>): void {
    this.argumentValidator.validate(name, this.getToolSchema(name), arguments_);
  }

  async callTool(call: InternalMcpToolCall) {
    this.validateToolArguments(call.name, call.arguments);
    const result: unknown = await this.server.callTool(call);
    validateInternalMcpResult(call, result);
    return result;
  }
}
