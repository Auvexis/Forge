import { describe, expect, it, vi } from "vitest";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";
import { ConnectedToolNodeResolver } from "./connected-tool-node-resolver.ts";

vi.mock("../plugin-tool-adapter.ts", () => ({
  resolvePluginAgentTool: (pluginId: string, methodId: string) => ({
    name: `${pluginId}_${methodId}`,
  }),
}));

describe("ConnectedToolNodeResolver", () => {
  it("resolves only enabled tool nodes connected to the selected agent handle", () => {
    const resolver = new ConnectedToolNodeResolver(workflow(), "agent_1");

    expect(resolver.resolve("drive_list")).toMatchObject({
      nodeId: "drive_tool",
      pluginId: "drive",
      methodId: "list",
    });
    expect(() => resolver.resolve("mail_send")).toThrow(/not found/);
  });
});

function workflow(): WorkflowItem {
  return {
    metadata: {
      id: "workflow_1",
      name: "Agent",
      description: "",
      icon: "",
      isActive: true,
      version: "1",
      createdAt: "",
      updatedAt: "",
    },
    nodes: {
      agent_1: {
        type: "ai-agent",
        name: "Agent",
        prompt: "",
        maxToolCalls: 4,
        timeoutMs: 60_000,
        requireApprovalForSideEffects: [],
        outputMode: "text",
      },
      drive_tool: {
        type: "ai-tool",
        name: "Drive",
        pluginId: "drive",
        methodId: "list",
        timeoutMs: 30_000,
        requiresApproval: false,
        sideEffect: "read",
      },
      unrelated_tool: {
        type: "ai-tool",
        name: "Mail",
        pluginId: "mail",
        methodId: "send",
        timeoutMs: 30_000,
        requiresApproval: true,
        sideEffect: "external-message",
      },
    },
    edges: [
      {
        id: "drive-agent",
        source: "drive_tool",
        target: "agent_1",
        targetHandle: "tool",
      },
    ],
    triggers: [],
    variables: [],
    settings: {},
  } as unknown as WorkflowItem;
}
