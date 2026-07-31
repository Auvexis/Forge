import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as createArtifacts } from "../../../database/migrations/workflows/009_agent_artifacts.ts";
import { AgentRunRepository } from "../persistence/agent-run-repository.ts";
import { AgentArtifactRepository } from "./agent-artifact-repository.ts";
import { AgentArtifactService } from "./agent-artifact-service.ts";
import { AgentArtifactStorage } from "./agent-artifact-storage.ts";
import { AgentArtifactArgumentResolver } from "./agent-artifact-argument-resolver.ts";

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

  it("captures nested Drive download streams for downstream email attachments", async () => {
    const { service } = await fixture();
    const reference = await service.captureResult({
      profileId: "profile_1",
      runId: "run_1",
      toolName: "google_drive_download_file",
      value: {
        download: {
          fileName: "andresimoes-jr-backend.pdf",
          mimeType: "application/pdf",
          content: Readable.from([Buffer.from("pdf-content")]),
        },
      },
    }) as { ref: string };

    expect(reference).toMatchObject({
      name: "andresimoes-jr-backend.pdf",
      mimeType: "application/pdf",
      size: 11,
    });
    await expect(service.resolveReferences("profile_1", {
      attachments: [{ filename: "andresimoes-jr-backend.pdf", content: reference.ref }],
    })).resolves.toEqual({
      attachments: [{
        filename: "andresimoes-jr-backend.pdf",
        content: Buffer.from("pdf-content"),
      }],
    });
  });

  it("maps artifact objects to the receiving tool schema without plugin-specific code", async () => {
    const { service } = await fixture();
    const reference = await service.captureResult({
      profileId: "profile_1",
      runId: "run_1",
      toolName: "external_download",
      value: {
        data: Buffer.from("pdf-content"),
        name: "andresimoes-jr-backend.pdf",
        mimeType: "application/pdf",
      },
    }) as { ref: string; name: string; mimeType: string };
    const resolver = new AgentArtifactArgumentResolver(service);

    await expect(resolver.resolve("profile_1", {
      attachments: [{
        filename: reference.name,
        mimeType: reference.mimeType,
        ref: reference.ref,
      }],
    }, {
      type: "object",
      properties: {
        attachments: {
          type: "array",
          items: { type: "object" },
        },
      },
    })).resolves.toEqual({
      attachments: [{
        filename: "andresimoes-jr-backend.pdf",
        mimeType: "application/pdf",
        content: Buffer.from("pdf-content"),
      }],
    });
  });

  it("supports an external plugin's custom artifact field and encoding", async () => {
    const { service } = await fixture();
    const reference = await service.captureResult({
      profileId: "profile_1",
      runId: "run_1",
      toolName: "external_download",
      value: Buffer.from("binary"),
    }) as { ref: string };
    const resolver = new AgentArtifactArgumentResolver(service);

    await expect(resolver.resolve("profile_1", { upload: { ref: reference.ref } }, {
      type: "object",
      properties: {
        upload: {
          type: "object",
          "x-fabric-artifact-content-field": "filePayload",
          "x-fabric-artifact-encoding": "base64",
        },
      },
    })).resolves.toEqual({
      upload: { filePayload: Buffer.from("binary").toString("base64") },
    });
  });

  it("binds a run artifact to a schema-declared file input by filename", async () => {
    const { service } = await fixture();
    await service.captureResult({
      profileId: "profile_1",
      runId: "run_1",
      toolName: "external_download",
      value: {
        data: Buffer.from("pdf-content"),
        name: "andresimoes-jr-backend.pdf",
        mimeType: "application/pdf",
      },
    });
    const resolver = new AgentArtifactArgumentResolver(service);

    await expect(resolver.resolve("profile_1", {
      attachments: [{
        fileId: "provider-file-id",
        fileName: "andresimoes-jr-backend.pdf",
      }],
    }, {
      type: "object",
      properties: {
        attachments: {
          type: "array",
          "x-input-type": "files",
          "x-fabric-artifact-content-field": "contentBase64",
          "x-fabric-artifact-encoding": "base64",
          items: { type: ["string", "object"] },
        },
      },
    }, "run_1")).resolves.toEqual({
      attachments: [{
        fileId: "provider-file-id",
        fileName: "andresimoes-jr-backend.pdf",
        mimeType: "application/pdf",
        contentBase64: Buffer.from("pdf-content").toString("base64"),
      }],
    });
  });

  it("does not guess between ambiguous run artifacts", async () => {
    const { service } = await fixture();
    for (const name of ["first.pdf", "second.pdf"]) {
      await service.captureResult({
        profileId: "profile_1",
        runId: "run_1",
        toolName: "external_download",
        value: { data: Buffer.from(name), name, mimeType: "application/pdf" },
      });
    }
    const resolver = new AgentArtifactArgumentResolver(service);
    const input = { files: [{ fileName: "unknown.pdf" }] };

    await expect(resolver.resolve("profile_1", input, {
      type: "object",
      properties: {
        files: { type: "array", "x-fabric-artifact-input": true },
      },
    }, "run_1")).resolves.toEqual(input);
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
