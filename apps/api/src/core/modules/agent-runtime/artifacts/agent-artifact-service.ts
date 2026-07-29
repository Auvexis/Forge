import { randomUUID } from "node:crypto";
import { AgentRuntimeError } from "../agent-errors.ts";
import { AGENT_LIMITS } from "../agent-limits.ts";
import type { AgentArtifactRef } from "../contracts/agent-domain-contracts.ts";
import { AgentArtifactRepository } from "./agent-artifact-repository.ts";
import { AgentArtifactStorage } from "./agent-artifact-storage.ts";

export class AgentArtifactService {
  constructor(
    private readonly repository: AgentArtifactRepository,
    private readonly storage: AgentArtifactStorage,
  ) {}

  async captureResult(input: {
    profileId: string;
    runId: string;
    actionId?: string;
    toolName: string;
    value: unknown;
    now?: Date;
    ttlMs?: number;
  }): Promise<unknown> {
    const binary = toBinaryResult(input.value, input.toolName);
    if (!binary) return input.value;

    const artifactId = `artifact_${randomUUID().replaceAll("-", "")}`;
    const stored = await this.storage.write({
      profileId: input.profileId,
      artifactId,
      content: binary.content,
    });
    const now = input.now ?? new Date();
    const ttlMs = Math.min(
      Math.max(1, input.ttlMs ?? AGENT_LIMITS.defaultArtifactTtlMs),
      AGENT_LIMITS.maxArtifactTtlMs,
    );
    try {
      const artifact = this.repository.create({
        id: artifactId,
        profileId: input.profileId,
        runId: input.runId,
        actionId: input.actionId,
        name: binary.name,
        mimeType: binary.mimeType,
        size: stored.size,
        storageKey: stored.storageKey,
        sha256: stored.sha256,
        expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      });
      return toReference(artifact);
    } catch (error) {
      await this.storage.delete(input.profileId, stored.storageKey).catch(() => undefined);
      throw error;
    }
  }

  async resolveReferences(
    profileId: string,
    value: unknown,
    now = new Date(),
  ): Promise<unknown> {
    if (typeof value === "string" && value.startsWith("artifact://")) {
      return this.resolveOne(profileId, value, now);
    }
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => this.resolveReferences(profileId, item, now)));
    }
    if (!value || typeof value !== "object" || Buffer.isBuffer(value)) return value;

    const entries = await Promise.all(
      Object.entries(value as Record<string, unknown>).map(async ([key, item]) => [
        key,
        await this.resolveReferences(profileId, item, now),
      ] as const),
    );
    return Object.fromEntries(entries);
  }

  async cleanupExpired(profileId: string, now = new Date()): Promise<number> {
    const expired = this.repository.listExpired(profileId, now.toISOString());
    let removed = 0;
    for (const artifact of expired) {
      await this.storage.delete(profileId, artifact.storageKey);
      if (this.repository.deleteById(profileId, artifact.id)) removed += 1;
    }
    return removed;
  }

  private async resolveOne(profileId: string, ref: string, now: Date): Promise<Buffer> {
    const id = ref.slice("artifact://".length);
    const artifact = this.repository.getById(profileId, id);
    if (!artifact) throw artifactUnavailable("Artifact was not found for the active profile", 404);
    if (artifact.expiresAt <= now.toISOString()) {
      throw artifactUnavailable("Artifact has expired", 410);
    }
    return this.storage.read(profileId, artifact.storageKey);
  }
}

function toBinaryResult(
  value: unknown,
  toolName: string,
): { content: Buffer; name: string; mimeType: string } | null {
  if (Buffer.isBuffer(value)) {
    return {
      content: value,
      name: `${toolName}.bin`,
      mimeType: "application/octet-stream",
    };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!Buffer.isBuffer(record.data)) return null;
  return {
    content: record.data,
    name: typeof record.name === "string" && record.name.trim()
      ? record.name
      : `${toolName}.bin`,
    mimeType: typeof record.mimeType === "string" && record.mimeType.trim()
      ? record.mimeType
      : "application/octet-stream",
  };
}

function toReference(input: {
  ref: AgentArtifactRef["ref"];
  name: string;
  mimeType?: string;
  size: number;
}): Pick<AgentArtifactRef, "ref" | "name" | "mimeType" | "size"> {
  return {
    ref: input.ref,
    name: input.name,
    mimeType: input.mimeType,
    size: input.size,
  };
}

function artifactUnavailable(message: string, statusCode: number): AgentRuntimeError {
  return new AgentRuntimeError(
    message,
    "AGENT_ARTIFACT_UNAVAILABLE",
    "Artifact is unavailable",
    statusCode,
  );
}
