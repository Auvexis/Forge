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

  it("removes invalid optional enum params before invoking tools", async () => {
    const calls: unknown[] = [];
    const result = await executeAgentPlan({
      plan: {
        steps: [{
          id: "search",
          toolName: "search",
          params: { query: "andresimoes", orderBy: "modified desc" },
        }],
      },
      tools: [
        tool("search", async (args) => {
          calls.push(args);
          return [{ id: "file_1" }];
        }, {
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              orderBy: { type: "string", enum: ["name", "modifiedTime desc"] },
            },
            required: ["query"],
          },
        }),
      ],
      emitEvent: () => undefined,
    });

    assert.equal(result.status, "success");
    assert.deepEqual(calls, [{ query: "andresimoes" }]);
  });

  it("resolves one-based indexed step refs before invoking tools", async () => {
    const calls: unknown[] = [];
    const result = await executeAgentPlan({
      plan: {
        steps: [
          {
            id: "search",
            toolName: "search",
            params: { query: "andresimoes" },
          },
          {
            id: "download",
            toolName: "download",
            params: { fileId: "$steps[1][0].id" },
          },
        ],
      },
      tools: [
        tool("search", async (args) => {
          calls.push(args);
          return [{ id: "file_1" }];
        }),
        tool("download", async (args) => {
          calls.push(args);
          return { ok: true };
        }),
      ],
      emitEvent: () => undefined,
    });

    assert.equal(result.status, "success");
    assert.deepEqual(calls[1], { fileId: "file_1" });
  });

  it("pauses approval tools before invoke and persists an approval card", async () => {
    let invoked = false;
    const events: string[] = [];
    const messages: unknown[] = [];

    const result = await executeAgentPlan({
      plan: { steps: [{ id: "send", toolName: "send_email", params: { to: "a@b.com", attachment: Buffer.from("pdf") } }] },
      tools: [
        tool("send_email", async () => {
          invoked = true;
          return { ok: true };
        }, { requiresApproval: true, sideEffect: "external-message" }),
      ],
      executionId: "exec_1",
      createApprovalRequest: async () => ({ approvalId: "approval_1" }),
      saveMessage: (message) => {
        messages.push(message);
      },
      emitEvent: (event) => events.push(event.type),
    });

    assert.equal(invoked, false);
    assert.equal(result.status, "waiting-approval");
    assert.equal(result.approvalId, "approval_1");
    assert.equal((result.output as any).executionId, "exec_1");
    assert.equal((result.output as any).toolName, "send_email");
    assert.deepEqual((result.output as any).args.attachment, { type: "buffer", bytes: 3 });
    assert.deepEqual(events, ["agent:tool-intent", "agent:approval-created"]);
    assert.equal((messages[0] as any).kind, "agentApproval");
  });

  it("continues approved approval tools from the same step without repeating previous steps", async () => {
    const calls: string[] = [];

    const result = await executeAgentPlan({
      plan: {
        steps: [
          { id: "search", toolName: "search", params: { query: "CV" } },
          { id: "send", toolName: "send_email", params: { fileId: "$steps.search[0].id" } },
        ],
      },
      tools: [
        tool("search", async () => {
          calls.push("search");
          return [{ id: "file_2" }];
        }),
        tool("send_email", async (args) => {
          calls.push(`send:${(args as any).fileId}`);
          return { id: "email_1" };
        }, { requiresApproval: true, sideEffect: "external-message" }),
      ],
      approval: {
        status: "approved",
        toolName: "send_email",
        stepId: "send",
        outputs: { search: [{ id: "file_1" }] },
      },
      emitEvent: () => undefined,
    });

    assert.equal(result.status, "success");
    assert.deepEqual(calls, ["send:file_1"]);
  });

  it("ends rejected approvals without invoking the tool", async () => {
    let invoked = false;
    const result = await executeAgentPlan({
      plan: { steps: [{ id: "send", toolName: "send_email", params: { to: "a@b.com" } }] },
      tools: [
        tool("send_email", async () => {
          invoked = true;
          return { ok: true };
        }, { requiresApproval: true, sideEffect: "external-message" }),
      ],
      approval: { status: "rejected", toolName: "send_email", stepId: "send" },
      emitEvent: () => undefined,
    });

    assert.equal(invoked, false);
    assert.equal(result.status, "cancelled");
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
