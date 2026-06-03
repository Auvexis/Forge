import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AgentRuntimeError } from "../agent-errors.ts";
import { executeAgentPlan } from "./agent-plan-executor.ts";
import type { AgentPlan, AgentPlanTool } from "./agent-plan-types.ts";

describe("agent plan executor", () => {
  it("executes a generated plan deterministically without model calls between tools", async () => {
    const calls: Array<{ name: string; args: unknown }> = [];
    const events: string[] = [];
    const tools: AgentPlanTool[] = [
      tool("google_drive_list_files", async (args) => {
        calls.push({ name: "google_drive_list_files", args });
        return [{ id: "file_1", name: "andresimoes-curriculo.pdf" }];
      }),
      tool("google_drive_download_file", async (args) => {
        calls.push({ name: "google_drive_download_file", args });
        return { download: { fileName: "andresimoes-curriculo.pdf", content: Buffer.from("pdf") } };
      }),
      tool("google_gmail_send_message", async (args) => {
        calls.push({ name: "google_gmail_send_message", args });
        return { id: "email_1" };
      }),
    ];
    const plan: AgentPlan = {
      steps: [
        { id: "search", toolName: "google_drive_list_files", params: { query: "andresimoes" } },
        { id: "download", toolName: "google_drive_download_file", params: { fileId: "$steps.search[0].id" } },
        {
          id: "send",
          toolName: "google_gmail_send_message",
          params: { to: "vaurvik@gmail.com", attachments: ["$steps.download.download"] },
        },
      ],
    };

    const result = await executeAgentPlan({
      plan,
      tools,
      emitEvent: (event) => events.push(`${event.type}:${event.payload?.status ?? ""}:${event.payload?.tool?.name ?? ""}`),
    });

    assert.equal(result.status, "success");
    assert.deepEqual(calls.map((call) => call.name), [
      "google_drive_list_files",
      "google_drive_download_file",
      "google_gmail_send_message",
    ]);
    assert.deepEqual(calls[1].args, { fileId: "file_1" });
    assert.deepEqual((calls[2].args as any).attachments[0], {
      fileName: "andresimoes-curriculo.pdf",
      content: Buffer.from("pdf"),
    });
    assert.deepEqual(events.filter((event) => event.includes("agent:tool-")), [
      "agent:tool-intent:planned:google_drive_list_files",
      "agent:tool-start:running:google_drive_list_files",
      "agent:tool-end:success:google_drive_list_files",
      "agent:tool-intent:planned:google_drive_download_file",
      "agent:tool-start:running:google_drive_download_file",
      "agent:tool-end:success:google_drive_download_file",
      "agent:tool-intent:planned:google_gmail_send_message",
      "agent:tool-start:running:google_gmail_send_message",
      "agent:tool-end:success:google_gmail_send_message",
    ]);
  });

  it("returns waiting-user when manifest selection metadata finds multiple options", async () => {
    const result = await executeAgentPlan({
      plan: {
        steps: [{ id: "search", toolName: "google_drive_list_files", params: { query: "andresimoes" } }],
      },
      tools: [
        tool("google_drive_list_files", async () => [
          { id: "file_1", name: "A.pdf" },
          { id: "file_2", name: "B.pdf" },
        ], {
          selection: { path: "$", labelFields: ["name"], valueField: "id", mode: "single" },
        }),
      ],
      emitEvent: () => undefined,
    });

    assert.equal(result.status, "waiting-user");
    assert.equal((result.output as any).reason, "ambiguous_result");
    assert.equal((result.output as any).options.length, 2);
  });

  it("repairs parameter errors once and continues with patched params", async () => {
    const calls: unknown[] = [];
    const result = await executeAgentPlan({
      plan: { steps: [{ id: "download", toolName: "download", params: { fileId: "" } }] },
      tools: [
        tool("download", async (args) => {
          calls.push(args);
          const fileId = (args as { fileId?: string }).fileId;
          if (!fileId) throw new AgentRuntimeError("fileId required", "AGENT_TOOL_ARGS_INVALID", "Invalid tool params", 400);
          return { ok: true };
        }),
      ],
      repairStep: async () => ({ params: { fileId: "file_1" } }),
      emitEvent: () => undefined,
    });

    assert.equal(result.status, "success");
    assert.deepEqual(calls, [{ fileId: "" }, { fileId: "file_1" }]);
  });
});

function tool(
  name: string,
  invoke: (args: unknown) => Promise<unknown>,
  overrides: Partial<AgentPlanTool> = {},
): AgentPlanTool {
  return {
    name,
    description: name,
    pluginId: "plugin",
    methodId: name,
    inputSchema: { type: "object" },
    requiresApproval: false,
    sideEffect: "read",
    timeoutMs: 30000,
    invoke,
    ...overrides,
  };
}
