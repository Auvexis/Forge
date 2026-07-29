import { randomUUID } from "node:crypto";
import { AgentRuntimeError } from "../agent-errors.ts";
import { createAgentSideEffectKey } from "./agent-side-effect-key.ts";
import { AgentSideEffectRepository } from "./agent-side-effect-repository.ts";

export class AgentSideEffectService {
  constructor(private readonly repository: AgentSideEffectRepository) {}

  async execute<T>(input: {
    profileId: string;
    runId: string;
    actionId: string;
    toolName: string;
    arguments: Record<string, unknown>;
    leaseMs: number;
    now?: Date;
    invoke: () => Promise<T>;
  }): Promise<T> {
    const key = createAgentSideEffectKey(input);
    const ownerToken = `owner_${randomUUID()}`;
    const now = input.now ?? new Date();
    const reservation = this.repository.reserve({
      ...key,
      profileId: input.profileId,
      runId: input.runId,
      actionId: input.actionId,
      toolName: input.toolName,
      ownerToken,
      now,
      leaseMs: input.leaseMs,
    });

    if (reservation.status === "replay") return reservation.result as T;
    if (reservation.status === "busy") {
      throw new AgentRuntimeError(
        "Another worker owns the active side-effect lease",
        "AGENT_SIDE_EFFECT_TEMPORARY_BUSY",
        "The operation is already running",
        503,
      );
    }
    if (reservation.status === "outcome-unknown") {
      throw new AgentRuntimeError(
        "A previous side-effect attempt ended with an unknown outcome",
        "AGENT_SIDE_EFFECT_OUTCOME_UNKNOWN_POLICY",
        "The previous operation may have completed. Confirm its status before retrying",
        409,
      );
    }

    this.repository.markRunning({
      profileId: input.profileId,
      idempotencyKey: key.idempotencyKey,
      ownerToken,
      now,
      leaseMs: input.leaseMs,
    });
    try {
      const result = await input.invoke();
      this.repository.succeed({
        profileId: input.profileId,
        idempotencyKey: key.idempotencyKey,
        ownerToken,
        result,
        now: new Date(),
      });
      return result;
    } catch (error) {
      this.repository.fail({
        profileId: input.profileId,
        idempotencyKey: key.idempotencyKey,
        ownerToken,
        error: {
          code: error instanceof AgentRuntimeError ? error.code : "AGENT_SIDE_EFFECT_FAILED",
        },
        now: new Date(),
      });
      throw error;
    }
  }
}
