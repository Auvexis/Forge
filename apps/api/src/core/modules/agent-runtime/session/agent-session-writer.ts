import { randomUUID } from "node:crypto";
import type { AgentMcpError } from "../contracts/agent-domain-contracts.ts";
import type {
  AgentMessage,
  AgentCommitmentPart,
  AgentErrorPart,
  AgentTextPart,
  AgentInteractionPart,
  AgentToolPart,
  AgentToolPartState,
  AgentTurn,
  AgentTurnState,
} from "./agent-session-contracts.ts";
import { AgentSessionRepository } from "./agent-session-repository.ts";

export class AgentSessionWriter {
  private revision: number;

  constructor(
    private readonly repository: AgentSessionRepository,
    private readonly profileId: string,
    private readonly sessionId: string,
    revision: number,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {
    this.revision = revision;
  }

  get currentRevision(): number {
    return this.revision;
  }

  createTurn(input: { runId?: string; state?: AgentTurnState } = {}): AgentTurn {
    const turn = this.repository.createTurn({
      id: `turn_${randomUUID()}`,
      profileId: this.profileId,
      sessionId: this.sessionId,
      runId: input.runId,
      state: input.state ?? "running",
      expectedRevision: this.revision,
    });
    this.revision += 1;
    return turn;
  }

  updateTurn(turnId: string, state: AgentTurnState): AgentTurn {
    const turn = this.repository.updateTurn({
      profileId: this.profileId,
      sessionId: this.sessionId,
      turnId,
      state,
      expectedRevision: this.revision,
    });
    this.revision += 1;
    return turn;
  }

  appendMessage(turnId: string, role: "user" | "assistant" | "system"): AgentMessage {
    const message = this.repository.appendMessage({
      id: `message_${randomUUID()}`,
      profileId: this.profileId,
      sessionId: this.sessionId,
      turnId,
      role,
      expectedRevision: this.revision,
    });
    this.revision += 1;
    return message;
  }

  appendText(input: {
    turnId: string;
    messageId: string;
    text: string;
    state?: AgentTextPart["state"];
  }): AgentTextPart {
    const now = this.now();
    const part: AgentTextPart = {
      id: `part_${randomUUID()}`,
      sessionId: this.sessionId,
      turnId: input.turnId,
      messageId: input.messageId,
      type: "text",
      sequence: this.nextPartSequence(input.messageId),
      text: input.text,
      state: input.state ?? "completed",
      createdAt: now,
      updatedAt: now,
    };
    const saved = this.repository.appendPart({
      profileId: this.profileId,
      expectedRevision: this.revision,
      part,
    }) as AgentTextPart;
    this.revision += 1;
    return saved;
  }

  appendError(input: {
    turnId: string;
    messageId: string;
    error: AgentMcpError;
  }): AgentErrorPart {
    const now = this.now();
    const part: AgentErrorPart = {
      id: `part_${randomUUID()}`,
      sessionId: this.sessionId,
      turnId: input.turnId,
      messageId: input.messageId,
      type: "error",
      sequence: this.nextPartSequence(input.messageId),
      error: structuredClone(input.error),
      createdAt: now,
      updatedAt: now,
    };
    const saved = this.repository.appendPart({
      profileId: this.profileId,
      expectedRevision: this.revision,
      part,
    }) as AgentErrorPart;
    this.revision += 1;
    return saved;
  }

  appendFinalTextOnce(input: {
    turnId: string;
    text: string;
  }): AgentTextPart {
    const normalized = input.text.trim();
    const snapshot = this.repository.getSnapshot({
      profileId: this.profileId,
      sessionId: this.sessionId,
      messageLimit: 200,
    });
    const existing = snapshot.messages
      .filter((entry) =>
        entry.message.turnId === input.turnId &&
        entry.message.role === "assistant"
      )
      .flatMap((entry) => entry.parts)
      .find((part) =>
        part.type === "text" &&
        part.state === "completed" &&
        part.text.trim() === normalized
      );
    if (existing?.type === "text") return existing;
    const message = this.appendMessage(input.turnId, "assistant");
    return this.appendText({
      turnId: input.turnId,
      messageId: message.id,
      text: normalized,
      state: "completed",
    });
  }

  appendCommitments(input: {
    turnId: string;
    messageId: string;
    request: string;
    items: AgentCommitmentPart["items"];
  }): AgentCommitmentPart {
    const now = this.now();
    const part: AgentCommitmentPart = {
      id: `part_${randomUUID()}`,
      sessionId: this.sessionId,
      turnId: input.turnId,
      messageId: input.messageId,
      type: "commitment",
      sequence: this.nextPartSequence(input.messageId),
      request: input.request,
      items: structuredClone(input.items),
      createdAt: now,
      updatedAt: now,
    };
    const saved = this.repository.appendPart({
      profileId: this.profileId,
      expectedRevision: this.revision,
      part,
    }) as AgentCommitmentPart;
    this.revision += 1;
    return saved;
  }

  updateCommitments(
    part: AgentCommitmentPart,
    items: AgentCommitmentPart["items"],
  ): AgentCommitmentPart {
    const saved = this.repository.replacePart({
      profileId: this.profileId,
      expectedRevision: this.revision,
      part: {
        ...part,
        items: structuredClone(items),
        updatedAt: this.now(),
      },
    }) as AgentCommitmentPart;
    this.revision += 1;
    return saved;
  }

  appendInteraction(input: {
    turnId: string;
    messageId: string;
    interactionId?: string;
    kind: AgentInteractionPart["kind"];
    question: string;
  }): AgentInteractionPart {
    const now = this.now();
    const part: AgentInteractionPart = {
      id: `part_${randomUUID()}`,
      sessionId: this.sessionId,
      turnId: input.turnId,
      messageId: input.messageId,
      type: "interaction",
      sequence: this.nextPartSequence(input.messageId),
      interactionId: input.interactionId ?? `interaction_${randomUUID()}`,
      kind: input.kind,
      question: input.question,
      state: "pending",
      createdAt: now,
      updatedAt: now,
    };
    const saved = this.repository.appendPart({
      profileId: this.profileId,
      expectedRevision: this.revision,
      part,
    }) as AgentInteractionPart;
    this.revision += 1;
    return saved;
  }

  resolveInteraction(
    part: AgentInteractionPart,
    response: unknown,
  ): AgentInteractionPart {
    const saved = this.repository.replacePart({
      profileId: this.profileId,
      expectedRevision: this.revision,
      part: {
        ...part,
        state: "resolved",
        response,
        updatedAt: this.now(),
      },
    }) as AgentInteractionPart;
    this.revision += 1;
    return saved;
  }

  cancelInteraction(part: AgentInteractionPart): AgentInteractionPart {
    const saved = this.repository.replacePart({
      profileId: this.profileId,
      expectedRevision: this.revision,
      part: {
        ...part,
        state: "cancelled",
        updatedAt: this.now(),
      },
    }) as AgentInteractionPart;
    this.revision += 1;
    return saved;
  }

  appendTool(input: {
    turnId: string;
    messageId: string;
    callId: string;
    toolName: string;
    arguments?: Record<string, unknown>;
    actionId?: string;
  }): AgentToolPart {
    const now = this.now();
    const part: AgentToolPart = {
      id: `part_${randomUUID()}`,
      sessionId: this.sessionId,
      turnId: input.turnId,
      messageId: input.messageId,
      type: "tool",
      sequence: this.nextPartSequence(input.messageId),
      callId: input.callId,
      toolName: input.toolName,
      ...(input.actionId ? { actionId: input.actionId } : {}),
      state: {
        status: "pending",
        ...(input.arguments ? { input: input.arguments } : {}),
      },
      createdAt: now,
      updatedAt: now,
    };
    const saved = this.repository.appendPart({
      profileId: this.profileId,
      expectedRevision: this.revision,
      part,
    }) as AgentToolPart;
    this.revision += 1;
    return saved;
  }

  updateTool(part: AgentToolPart, state: AgentToolPartState): AgentToolPart {
    const saved = this.repository.replacePart({
      profileId: this.profileId,
      expectedRevision: this.revision,
      part: {
        ...part,
        state,
        updatedAt: this.now(),
      },
    }) as AgentToolPart;
    this.revision += 1;
    return saved;
  }

  startTool(part: AgentToolPart, input: Record<string, unknown>, attempt = 1): AgentToolPart {
    return this.updateTool(part, {
      status: "running",
      input,
      startedAt: this.now(),
      attempt,
    });
  }

  completeTool(part: AgentToolPart, output: unknown): AgentToolPart {
    if (part.state.status !== "running") throw new Error("Only running agent tools can complete");
    return this.updateTool(part, {
      status: "completed",
      input: part.state.input,
      output,
      startedAt: part.state.startedAt,
      completedAt: this.now(),
      attempt: part.state.attempt,
    });
  }

  waitToolApproval(part: AgentToolPart): AgentToolPart {
    if (part.state.status !== "running") {
      throw new Error("Only running agent tools can wait for approval");
    }
    return this.updateTool(part, {
      status: "waiting-approval",
      input: part.state.input,
      startedAt: part.state.startedAt,
      requestedAt: this.now(),
      attempt: part.state.attempt,
    });
  }

  failTool(part: AgentToolPart, error: AgentMcpError): AgentToolPart {
    const input = part.state.status === "pending"
      ? (isRecord(part.state.input) ? part.state.input : {})
      : part.state.input;
    const startedAt = part.state.status === "running" || part.state.status === "waiting-approval"
      ? part.state.startedAt
      : undefined;
    const attempt = part.state.status === "running" || part.state.status === "waiting-approval" || part.state.status === "completed" ||
        part.state.status === "error"
      ? part.state.attempt
      : 1;
    return this.updateTool(part, {
      status: "error",
      input,
      error,
      ...(startedAt ? { startedAt } : {}),
      completedAt: this.now(),
      attempt,
    });
  }

  private nextPartSequence(messageId: string): number {
    const snapshot = this.repository.getSnapshot({
      profileId: this.profileId,
      sessionId: this.sessionId,
      messageLimit: 200,
    });
    const message = snapshot.messages.find((candidate) => candidate.message.id === messageId);
    if (!message) throw new Error(`Agent message not found: ${messageId}`);
    return message.parts.length + 1;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
