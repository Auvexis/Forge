export class AgentRuntimeError extends Error {
  public readonly code: string;
  public readonly publicMessage: string;
  public readonly statusCode: number;

  constructor(
    message: string,
    code: string,
    publicMessage = message,
    statusCode = 400,
  ) {
    super(message);
    this.code = code;
    this.publicMessage = publicMessage;
    this.statusCode = statusCode;
  }
}

export interface AgentToolApprovalRequest {
  toolName: string;
  sideEffect: string;
  args: Record<string, unknown>;
  resumeState?: unknown;
}

export class AgentToolApprovalRequiredError extends AgentRuntimeError {
  public readonly approvalRequest: AgentToolApprovalRequest;

  constructor(request: AgentToolApprovalRequest) {
    super(
      `Agent tool ${request.toolName} requires approval`,
      "AGENT_TOOL_APPROVAL_REQUIRED",
      "Agent tool requires approval",
      409,
    );
    this.approvalRequest = request;
  }
}

export function serializeAgentError(error: unknown): { code: string; message: string } {
  if (error instanceof AgentRuntimeError) {
    return { code: error.code, message: error.publicMessage };
  }

  return { code: "AGENT_RUNTIME_ERROR", message: "Agent execution failed" };
}
