import { describe, expect, it } from "vitest";
import { AgentRunner } from "./agent-runner.ts";
import type { AgentRunInput } from "./agent-types.ts";
import { AgentToolApprovalRequiredError } from "./agent-errors.ts";
import { InternalMcpClient } from "./mcp/internal-mcp-client.ts";
import { InternalMcpServer } from "./mcp/internal-mcp-server.ts";
import { runMcpAgentLoop } from "./loop/mcp-agent-loop.ts";

describe("Agent MCP runtime end-to-end", () => {
  it("answers chat-only conversation without entering the tool loop", async () => {
    let modelCalls = 0;
    const runner = new AgentRunner({
      modelRegistry: {
        createChatModel: async () => ({
          invokeJson: async () => {
            modelCalls += 1;
            return { mode: "chat", response: "Olá! Como posso ajudar?" };
          },
          generateFinalResponse: async () => {
            throw new Error("tool final response must not run");
          },
        }),
      },
      emitEvent: () => undefined,
    });

    const result = await runner.run(runInput("Olá, tudo bem?"));

    expect(result).toMatchObject({
      status: "success",
      output: "Olá! Como posso ajudar?",
      toolCallCount: 0,
    });
    expect(modelCalls).toBe(1);
  });

  it("executes repeated uses of the same tool as distinct required actions", async () => {
    const recipients: string[] = [];
    const decisions = [
      { action: "call", arguments: { to: "ana@example.com" } },
      { action: "call", arguments: { to: "bruno@example.com" } },
    ];
    const result = await runMcpAgentLoop({
      model: {
        invokeJson: async () => decisions.shift() as any,
        generateFinalResponse: async () => "Os dois emails foram enviados.",
      },
      client: emailClient(async ({ to }) => {
        recipients.push(String(to));
        return { messageId: `mail_${recipients.length}` };
      }),
      systemPrompt: "",
      userMessage: "Envie para Ana e depois para Bruno.",
      contextMessages: [],
      actions: [
        { id: "email_ana", toolName: "email_send", objective: "Enviar para Ana", dependsOn: [] },
        { id: "email_bruno", toolName: "email_send", objective: "Enviar para Bruno", dependsOn: ["email_ana"] },
      ],
      maxToolCalls: 2,
      emitEvent: () => undefined,
    });

    expect(result.status).toBe("success");
    expect(result.toolCallCount).toBe(2);
    expect(recipients).toEqual(["ana@example.com", "bruno@example.com"]);
  });

  it("resumes an approved side effect without replanning completed actions", async () => {
    let approved = false;
    let executions = 0;
    const client = emailClient(async (arguments_) => {
      if (!approved) {
        throw new AgentToolApprovalRequiredError({
          toolName: "email_send",
          sideEffect: "external-message",
          args: arguments_,
        });
      }
      executions += 1;
      return { messageId: "mail_approved" };
    }, true);
    const actions = [{
      id: "email",
      toolName: "email_send",
      objective: "Enviar email",
      dependsOn: [],
    }];
    let approval: AgentToolApprovalRequiredError | undefined;
    try {
      await runMcpAgentLoop({
        model: {
          invokeJson: async <T extends object>() =>
            ({ action: "call", arguments: { to: "ana@example.com" } }) as T,
          generateFinalResponse: async () => "",
        },
        client,
        systemPrompt: "",
        userMessage: "Envie para Ana.",
        contextMessages: [],
        actions,
        maxToolCalls: 1,
        emitEvent: () => undefined,
      });
    } catch (error) {
      approval = error as AgentToolApprovalRequiredError;
    }

    expect(approval).toBeInstanceOf(AgentToolApprovalRequiredError);
    approved = true;
    const resumed = await runMcpAgentLoop({
      model: {
        invokeJson: async () => {
          throw new Error("approved arguments must be reused");
        },
        generateFinalResponse: async () => "Email enviado.",
      },
      client,
      systemPrompt: "",
      userMessage: "Aprovar",
      contextMessages: [],
      actions: [],
      approvedTool: {
        toolName: "email_send",
        arguments: approval!.approvalRequest.args,
        resumeState: approval!.approvalRequest.resumeState,
      },
      maxToolCalls: 1,
      emitEvent: () => undefined,
    });

    expect(resumed).toMatchObject({ status: "success", toolCallCount: 1 });
    expect(executions).toBe(1);
  });
});

function emailClient(
  invoke: (arguments_: Record<string, unknown>) => Promise<unknown>,
  requiresApproval = false,
): InternalMcpClient {
  return new InternalMcpClient(new InternalMcpServer([{
    name: "email_send",
    summary: "Send email",
    sideEffect: "external-message",
    requiresApproval,
    timeoutMs: 5_000,
    inputSchema: {
      type: "object",
      required: ["to"],
      additionalProperties: false,
      properties: { to: { type: "string" } },
    },
    invoke,
  }]));
}

function runInput(userMessage: string): AgentRunInput {
  return {
    profileId: "profile_1",
    workflowId: "workflow_1",
    executionId: "execution_1",
    nodeId: "agent_1",
    userMessage,
    triggerPayload: {},
    agent: {
      type: "ai-agent",
      name: "Agent",
      prompt: "Help",
      executionMode: "loop",
      maxToolCalls: 4,
      maxRetriesPerTool: 1,
      timeoutMs: 30_000,
      requireApprovalForSideEffects: [],
      outputMode: "text",
    },
    model: {
      type: "ai-model",
      name: "Model",
      pluginId: "model",
      adapter: "openai-compatible",
      model: "test",
      temperature: 0,
    },
    tools: [],
  };
}
