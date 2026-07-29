import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as createArtifacts } from "../../../database/migrations/workflows/009_agent_artifacts.ts";
import { AgentRunRepository } from "../persistence/agent-run-repository.ts";
import { AgentArtifactRepository } from "./agent-artifact-repository.ts";
import { AgentArtifactService } from "./agent-artifact-service.ts";
import { AgentArtifactStorage } from "./agent-artifact-storage.ts";

describe("AgentArtifactService", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true })
    ));
  });

  it("captures binary results and resolves their references for the owning profile", async () => {
    const { service } = await fixture();
    const reference = await service.captureResult({
      profileId: "profile_1",
      runId: "run_1",
      toolName: "drive_download",
      value: {
        data: Buffer.from("video"),
        name: "X.mp4",
        mimeType: "video/mp4",
      },
    }) as { ref: string };

    expect(reference).toMatchObject({ name: "X.mp4", size: 5 });
    expect(reference.ref).toMatch(/^artifact:\/\//);
    await expect(service.resolveReferences("profile_1", { file: reference.ref }))
      .resolves.toEqual({ file: Buffer.from("video") });
    await expect(service.resolveReferences("profile_2", reference.ref))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it("rejects expired references and cleans their storage", async () => {
    const { service } = await fixture();
    const now = new Date("2026-01-01T00:00:00.000Z");
    const reference = await service.captureResult({
      profileId: "profile_1",
      runId: "run_1",
      toolName: "drive_download",
      value: Buffer.from("video"),
      now,
      ttlMs: 1,
    }) as { ref: string };

    await expect(service.resolveReferences(
      "profile_1",
      reference.ref,
      new Date("2026-01-01T00:00:01.000Z"),
    )).rejects.toMatchObject({ statusCode: 410 });
    await expect(service.cleanupExpired(
      "profile_1",
      new Date("2026-01-01T00:00:01.000Z"),
    )).resolves.toBe(1);
  });

  async function fixture() {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    await createRuns(db);
    await createArtifacts(db);
    new AgentRunRepository(db).create({
      id: "run_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      executionId: "execution_1",
      nodeId: "agent_1",
      userMessage: "download",
    });
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "fabric-artifact-service-"));
    directories.push(directory);
    return {
      service: new AgentArtifactService(
        new AgentArtifactRepository(db),
        new AgentArtifactStorage(directory),
      ),
    };
  }
});
