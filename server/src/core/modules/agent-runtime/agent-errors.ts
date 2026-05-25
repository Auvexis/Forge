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

export function serializeAgentError(error: unknown): { code: string; message: string } {
  if (error instanceof AgentRuntimeError) {
    return { code: error.code, message: error.publicMessage };
  }

  return { code: "AGENT_RUNTIME_ERROR", message: "Agent execution failed" };
}
