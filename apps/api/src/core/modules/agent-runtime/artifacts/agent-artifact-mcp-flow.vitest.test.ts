import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { up as createRuns } from "../../../database/migrations/workflows/007_agent_mcp_runs.ts";
import { up as createArtifacts } from "../../../database/migrations/workflows/009_agent_artifacts.ts";
import { InternalMcpClient } from "../mcp/internal-mcp-client.ts";
import { InternalMcpServer } from "../mcp/internal-mcp-server.ts";
import { runMcpAgentLoop } from "../loop/mcp-agent-loop.ts";
import { AgentRunRepository } from "../persistence/agent-run-repository.ts";
import { AgentActionRepository } from "../persistence/agent-action-repository.ts";
import { AgentArtifactRepository } from "./agent-artifact-repository.ts";
import { AgentArtifactService } from "./agent-artifact-service.ts";
import { AgentArtifactStorage } from "./agent-artifact-storage.ts";

describe("artifact MCP flow", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true })
    ));
  });

  it("passes a Drive binary to Email and YouTube through an artifact reference", async () => {
    const service = await artifactService();
    const received: Buffer[] = [];
    const server = new InternalMcpServer([
      tool("drive_download", {}, async () => ({
        data: Buffer.from("video-content"),
        name: "X.mp4",
        mimeType: "video/mp4",
      })),
      tool("email_send", { file: { type: "string" } }, async (arguments_) => {
        expect(Buffer.isBuffer(arguments_.file)).toBe(true);
        received.push(arguments_.file as Buffer);
        return { messageId: "mail_1" };
      }),
      tool("youtube_upload", { video: { type: "string" } }, async (arguments_) => {
        expect(Buffer.isBuffer(arguments_.video)).toBe(true);
        received.push(arguments_.video as Buffer);
        return { videoId: "youtube_1" };
      }),
    ], {
      resolveArguments: async (arguments_) =>
        await service.resolveReferences("profile_1", arguments_) as Record<string, unknown>,
      captureResult: async (call, content) =>
        await service.captureResult({
          profileId: "profile_1",
          runId: "run_1",
          actionId: call.actionId,
          toolName: call.name,
          value: content,
        }),
    });
    let decisionIndex = 0;
    const result = await runMcpAgentLoop({
      model: {
        invokeJson: async <T extends object>(request: { messages: unknown[] }) => {
          decisionIndex += 1;
          if (decisionIndex === 1) return { action: "call", arguments: {} } as T;
          const ref = JSON.stringify(request.messages).match(/artifact:\/\/artifact_[a-z0-9]+/)?.[0];
          expect(ref).toBeTruthy();
          return {
            action: "call",
            arguments: decisionIndex === 2 ? { file: ref } : { video: ref },
          } as T;
        },
        generateFinalResponse: async () => "Concluído.",
      },
      client: new InternalMcpClient(server),
      systemPrompt: "",
      userMessage: "Baixe X.mp4, envie por email e publique no YouTube",
      contextMessages: [],
      actions: [
        { id: "download", toolName: "drive_download", objective: "Download", dependsOn: [] },
        { id: "email", toolName: "email_send", objective: "Email", dependsOn: ["download"] },
        { id: "youtube", toolName: "youtube_upload", objective: "Upload", dependsOn: ["download"] },
      ],
      maxToolCalls: 3,
      emitEvent: () => undefined,
    });

    expect(result).toMatchObject({ status: "success", toolCallCount: 3 });
    expect(received).toEqual([Buffer.from("video-content"), Buffer.from("video-content")]);
  });

  async function artifactService(): Promise<AgentArtifactService> {
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
    const actions = new AgentActionRepository(db);
    actions.create({
      id: "download",
      runId: "run_1",
      position: 0,
      toolName: "drive_download",
      objective: "Download",
    });
    actions.create({
      id: "email",
      runId: "run_1",
      position: 1,
      toolName: "email_send",
      objective: "Email",
      dependsOn: ["download"],
    });
    actions.create({
      id: "youtube",
      runId: "run_1",
      position: 2,
      toolName: "youtube_upload",
      objective: "Upload",
      dependsOn: ["download"],
    });
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "fabric-artifact-flow-"));
    directories.push(directory);
    return new AgentArtifactService(
      new AgentArtifactRepository(db),
      new AgentArtifactStorage(directory),
    );
  }
});

function tool(
  name: string,
  properties: Record<string, unknown>,
  invoke: (arguments_: Record<string, unknown>) => Promise<unknown>,
) {
  return {
    name,
    summary: name,
    sideEffect: "read" as const,
    requiresApproval: false,
    timeoutMs: 30_000,
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties,
    },
    invoke,
  };
}
