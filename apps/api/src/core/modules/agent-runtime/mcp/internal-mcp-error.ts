import { AgentRuntimeError, AgentToolApprovalRequiredError } from "../agent-errors.ts";
import type { AgentMcpError, AgentMcpErrorCategory } from "../contracts/agent-domain-contracts.ts";

export class InternalMcpCallError extends AgentRuntimeError {
  constructor(public readonly mcpError: AgentMcpError) {
    super(
      `Internal MCP call failed: ${mcpError.code} (${mcpError.category})`,
      mcpError.code,
      mcpError.message,
      statusForCategory(mcpError.category),
    );
  }
}

export function normalizeInternalMcpError(error: unknown, toolName: string): AgentMcpError {
  if (error instanceof InternalMcpCallError) return error.mcpError;
  if (error instanceof AgentToolApprovalRequiredError) {
    return mcpError({
      code: error.code,
      category: "policy",
      message: error.publicMessage,
      retryable: false,
      userActionRequired: true,
    });
  }
  if (error instanceof AgentRuntimeError) {
    const category = categoryFor(error.code, error.statusCode);
    return mcpError({
      code: error.code,
      category,
      message: error.publicMessage,
      retryable: isRetryable(category),
      userActionRequired: needsUser(category),
    });
  }

  return mcpError({
    code: "AGENT_TOOL_EXECUTION_FAILED",
    category: "internal",
    message: `Tool ${toolName} failed`,
    retryable: false,
    userActionRequired: false,
  });
}

function categoryFor(code: string, statusCode: number): AgentMcpErrorCategory {
  const normalized = code.toUpperCase();
  if (/AMBIG|MULTIPLE_MATCH/.test(normalized)) return "ambiguous";
  if (/NOT_FOUND|NOTFOUND/.test(normalized) || statusCode === 404) return "not-found";
  if (/AUTH|UNAUTHORIZED|CREDENTIAL/.test(normalized) || statusCode === 401) return "authentication";
  if (/PERMISSION|FORBIDDEN/.test(normalized) || statusCode === 403) return "permission";
  if (/RATE_LIMIT|THROTTL/.test(normalized) || statusCode === 429) return "rate-limit";
  if (/TIMEOUT|TEMPORARY|UNAVAILABLE/.test(normalized) || statusCode === 408 || statusCode === 504) {
    return "temporary";
  }
  if (/APPROVAL|POLICY/.test(normalized)) return "policy";
  if (/VALID|ARG|PAYLOAD|SCHEMA|CATALOG/.test(normalized) || statusCode === 400 || statusCode === 422) {
    return "validation";
  }
  if (statusCode >= 500) return "temporary";
  return "internal";
}

function isRetryable(category: AgentMcpErrorCategory): boolean {
  return category === "temporary" || category === "rate-limit";
}

function needsUser(category: AgentMcpErrorCategory): boolean {
  return category === "not-found" ||
    category === "ambiguous" ||
    category === "authentication" ||
    category === "permission" ||
    category === "policy";
}

function statusForCategory(category: AgentMcpErrorCategory): number {
  if (category === "authentication") return 401;
  if (category === "permission") return 403;
  if (category === "not-found") return 404;
  if (category === "ambiguous" || category === "policy") return 409;
  if (category === "rate-limit") return 429;
  if (category === "validation") return 400;
  return 502;
}

function mcpError(error: AgentMcpError): AgentMcpError {
  return error;
}
