import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AgentRuntimeError } from "../agent-errors.ts";
import { AGENT_LIMITS } from "../agent-limits.ts";

export class AgentArtifactStorage {
  constructor(private readonly rootDir: string) {}

  async write(input: {
    profileId: string;
    artifactId: string;
    content: Buffer;
  }): Promise<{ storageKey: string; sha256: string; size: number }> {
    if (input.content.byteLength > AGENT_LIMITS.maxArtifactBytes) {
      throw artifactError("Artifact exceeds the maximum size", 413);
    }
    assertSafeId(input.artifactId);
    const profileKey = profileStorageKey(input.profileId);
    const storageKey = path.posix.join(
      profileKey,
      "objects",
      input.artifactId.slice(0, 2),
      `${input.artifactId}.bin`,
    );
    const target = this.resolveStorageKey(storageKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, input.content, { flag: "wx" });
      await fs.rename(temporary, target);
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
    return {
      storageKey,
      sha256: createHash("sha256").update(input.content).digest("hex"),
      size: input.content.byteLength,
    };
  }

  async read(profileId: string, storageKey: string): Promise<Buffer> {
    this.assertProfileOwnership(profileId, storageKey);
    return fs.readFile(this.resolveStorageKey(storageKey));
  }

  async delete(profileId: string, storageKey: string): Promise<void> {
    this.assertProfileOwnership(profileId, storageKey);
    await fs.rm(this.resolveStorageKey(storageKey), { force: true });
  }

  private assertProfileOwnership(profileId: string, storageKey: string): void {
    if (!storageKey.startsWith(`${profileStorageKey(profileId)}/`)) {
      throw artifactError("Artifact does not belong to the active profile", 403);
    }
  }

  private resolveStorageKey(storageKey: string): string {
    if (
      path.isAbsolute(storageKey) ||
      storageKey.includes("\\") ||
      storageKey.split("/").some((part) => part === ".." || part === "")
    ) {
      throw artifactError("Artifact storage key is invalid", 400);
    }
    const root = path.resolve(this.rootDir);
    const resolved = path.resolve(root, ...storageKey.split("/"));
    if (!resolved.startsWith(`${root}${path.sep}`)) {
      throw artifactError("Artifact storage path escaped its root", 400);
    }
    return resolved;
  }
}

function profileStorageKey(profileId: string): string {
  return createHash("sha256").update(profileId).digest("hex");
}

function assertSafeId(id: string): void {
  if (!/^[a-zA-Z0-9_-]{8,160}$/.test(id)) {
    throw artifactError("Artifact id is invalid", 400);
  }
}

function artifactError(message: string, statusCode: number): AgentRuntimeError {
  return new AgentRuntimeError(
    message,
    "AGENT_ARTIFACT_STORAGE_INVALID",
    "Artifact storage operation failed",
    statusCode,
  );
}
