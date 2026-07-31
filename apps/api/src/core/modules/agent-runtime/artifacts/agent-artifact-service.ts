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
    const binary = await toBinaryResult(input.value, input.toolName);
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

    const record = value as Record<string, unknown>;
    const entries = await Promise.all(
      Object.entries(record).map(async ([key, item]) => [
        key,
        await this.resolveReferences(profileId, item, now),
      ] as const),
    );
    return Object.fromEntries(entries);
  }

  resolveReference(profileId: string, ref: string, now = new Date()): Promise<Buffer> {
    return this.resolveOne(profileId, ref, now);
  }

  listRunReferences(
    profileId: string,
    runId: string,
  ): Array<Pick<AgentArtifactRef, "ref" | "name" | "mimeType" | "size">> {
    return this.repository.listByRun(profileId, runId).map(toReference);
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

async function toBinaryResult(
  value: unknown,
  toolName: string,
): Promise<{ content: Buffer; name: string; mimeType: string } | null> {
  if (Buffer.isBuffer(value)) {
    return {
      content: value,
      name: `${toolName}.bin`,
      mimeType: "application/octet-stream",
    };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const download = isRecord(record.download) ? record.download : null;
  const contentValue = download?.content ?? record.data ?? record.content;
  const content = await toBuffer(contentValue);
  if (!content) return null;
  return {
    content,
    name: typeof (download?.fileName ?? record.name) === "string" &&
        String(download?.fileName ?? record.name).trim()
      ? String(download?.fileName ?? record.name)
      : `${toolName}.bin`,
    mimeType: typeof (download?.mimeType ?? record.mimeType) === "string" &&
        String(download?.mimeType ?? record.mimeType).trim()
      ? String(download?.mimeType ?? record.mimeType)
      : "application/octet-stream",
  };
}

async function toBuffer(value: unknown): Promise<Buffer | null> {
  if (Buffer.isBuffer(value)) return value;
  if (!isReadableLike(value)) return null;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of value as AsyncIterable<unknown>) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any);
    size += buffer.byteLength;
    if (size > AGENT_LIMITS.maxArtifactBytes) {
      throw new AgentRuntimeError(
        "Plugin download exceeded the artifact size limit",
        "AGENT_ARTIFACT_TOO_LARGE",
        "Downloaded file is too large for the agent",
        413,
      );
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function isReadableLike(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && (
    Symbol.asyncIterator in value ||
    typeof (value as { pipe?: unknown }).pipe === "function"
  ));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
