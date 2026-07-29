import type { InternalMcpToolCall } from "./internal-mcp-types.ts";
import { InternalMcpServer } from "./internal-mcp-server.ts";
import { InternalMcpArgumentValidator } from "./internal-mcp-argument-validator.ts";

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

  async callTool(call: InternalMcpToolCall) {
    this.argumentValidator.validate(call.name, this.getToolSchema(call.name), call.arguments);
    return await this.server.callTool(call);
  }
}
