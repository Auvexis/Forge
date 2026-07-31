import type { AgentEngineRequestRepository } from "../engine-protocol/agent-engine-request-repository.ts";
import type { AgentEngineResponseRepository } from "../engine-protocol/agent-engine-response-repository.ts";
import { sanitizeAgentEventPayload } from "../agent-event-sanitizer.ts";

export interface AgentRunReplayDiagnostics {
  runId: string;
  generatedAt: string;
  entries: Array<{
    iteration: number;
    request: unknown;
    response: unknown | null;
  }>;
}

export class AgentRunReplayDiagnosticsService {
  constructor(
    private readonly requests: AgentEngineRequestRepository,
    private readonly responses: AgentEngineResponseRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  build(runId: string): AgentRunReplayDiagnostics {
    const responses = new Map(
      this.responses.listByRun(runId).map((response) => [response.requestId, response]),
    );
    return {
      runId,
      generatedAt: this.now(),
      entries: this.requests.listByRun(runId).map((request) => ({
        iteration: request.iteration,
        request: sanitizeAgentEventPayload(request),
        response: sanitizeAgentEventPayload(responses.get(request.id) ?? null),
      })),
    };
  }
}
