import type { AgentMcpError } from "../contracts/agent-domain-contracts.ts";
import { AgentSessionRepository } from "./agent-session-repository.ts";
import { AgentSessionWriter } from "./agent-session-writer.ts";

const INTERRUPTED_TOOL_ERROR: AgentMcpError = {
  code: "AGENT_TOOL_INTERRUPTED",
  category: "temporary",
  message: "Tool execution was interrupted before a durable result was recorded",
  retryable: true,
  userActionRequired: false,
};

export class AgentSessionRecovery {
  constructor(
    private readonly repository: AgentSessionRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  reconcileInterrupted(input: {
    profileId: string;
    sessionId: string;
  }): { recoveredToolParts: number; revision: number } {
    const snapshot = this.repository.getSnapshot(input);
    const writer = new AgentSessionWriter(
      this.repository,
      input.profileId,
      input.sessionId,
      snapshot.revision,
      this.now,
    );
    let recoveredToolParts = 0;
    for (const entry of snapshot.messages) {
      for (const part of entry.parts) {
        if (part.type !== "tool") continue;
        if (part.state.status !== "pending" && part.state.status !== "running") continue;
        writer.failTool(part, INTERRUPTED_TOOL_ERROR);
        recoveredToolParts += 1;
      }
    }
    if (
      recoveredToolParts > 0 &&
      snapshot.activeTurn &&
      snapshot.activeTurn.state !== "waiting-user" &&
      snapshot.activeTurn.state !== "waiting-approval"
    ) {
      writer.updateTurn(snapshot.activeTurn.id, "failed");
    }
    return {
      recoveredToolParts,
      revision: writer.currentRevision,
    };
  }
}
