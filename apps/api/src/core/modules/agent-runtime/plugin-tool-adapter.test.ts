import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { FabricPlugin } from "@auvexis/fabric-sdk";
import { PluginManager } from "../plugins/manager.ts";
import { AgentToolRegistry } from "./agent-tool-registry.ts";
import {
  listPluginAgentTools,
  resolvePluginAgentTool,
} from "./plugin-tool-adapter.ts";

describe("plugin tool adapter", () => {
  afterEach(() => {
    PluginManager.clearPlugins();
  });

  it("lists only enabled plugin agent tools with stable names and schemas", () => {
    PluginManager.registerPlugin(createPlugin());

    const tools = listPluginAgentTools();

    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "github_create_issue");
    assert.equal(tools[0].pluginId, "github");
    assert.equal(tools[0].methodId, "createIssue");
    assert.equal(tools[0].inputSchema.properties.title.type, "string");
    assert.equal(tools[0].instructions, "Use after confirming the repository owner and name.");
    assert.equal(tools[0].sideEffect, "write");
    assert.equal(tools[0].requiresApproval, true);
  });

  it("rejects enabled agent tools without a matching runtime method", () => {
    PluginManager.registerPlugin(createPlugin({ methods: {} }));

    assert.throws(
      () => resolvePluginAgentTool("github", "createIssue"),
      /runtime method/i,
    );
  });

  it("preserves plugin id and method id when resolving configured tools", () => {
    PluginManager.registerPlugin(createPlugin());

    const registry = new AgentToolRegistry();
    const [tool] = registry.resolveConfiguredTools([
      {
        type: "ai-tool",
        name: "Create issue",
        pluginId: "github",
        methodId: "createIssue",
        timeoutMs: 30000,
        requiresApproval: true,
        sideEffect: "write",
      },
    ]);

    assert.equal(tool.pluginId, "github");
    assert.equal(tool.methodId, "createIssue");
  });

  it("supports legacy manifests with top-level plugin name and no metadata", () => {
    const legacyManifest = createManifest();
    legacyManifest.name = "Legacy GitHub";
    delete legacyManifest.metadata;
    PluginManager.registerPlugin(createPlugin({
      manifest: legacyManifest,
    } as Partial<FabricPlugin>));

    const [listed] = listPluginAgentTools();
    const resolved = resolvePluginAgentTool("github", "createIssue");

    assert.equal(listed.pluginName, "Legacy GitHub");
    assert.equal(resolved.pluginName, "Legacy GitHub");
  });

  it("uses configured tool descriptions as agent-facing instructions", () => {
    PluginManager.registerPlugin(createPlugin());

    const registry = new AgentToolRegistry();
    const [tool] = registry.resolveConfiguredTools([
      {
        type: "ai-tool",
        name: "Create issue",
        pluginId: "github",
        methodId: "createIssue",
        descriptionOverride: "Use this only when the user explicitly asks to create a tracked GitHub issue.",
        timeoutMs: 30000,
        requiresApproval: true,
        sideEffect: "write",
      },
    ]);

    assert.equal(
      tool.description,
      "Use this only when the user explicitly asks to create a tracked GitHub issue.",
    );
  });

  it("propagates manifest selection metadata through adapter and registry", () => {
    PluginManager.registerPlugin(createPlugin({
      manifest: createManifest({
        selection: {
          path: "$",
          labelFields: ["name"],
          valueField: "id",
          mode: "single",
        },
      }),
    } as Partial<FabricPlugin>));

    const [listed] = listPluginAgentTools();
    const registry = new AgentToolRegistry();
    const [resolved] = registry.resolveConfiguredTools([
      {
        type: "ai-tool",
        name: "Create issue",
        pluginId: "github",
        methodId: "createIssue",
        timeoutMs: 30000,
        requiresApproval: true,
        sideEffect: "write",
      },
    ]);

    assert.deepEqual(listed.selection, {
      path: "$",
      labelFields: ["name"],
      valueField: "id",
      mode: "single",
    });
    assert.deepEqual(resolved.selection, listed.selection);
  });

  it("rejects write/delete configured tools when policy requires approval", () => {
    PluginManager.registerPlugin(createPlugin({
      manifest: createManifest({
        requiresApproval: false,
      }),
    } as Partial<FabricPlugin>));

    const registry = new AgentToolRegistry({
      requireApprovalForSideEffects: ["write", "delete"],
    });

    assert.throws(
      () =>
        registry.resolveConfiguredTools([
          {
            type: "ai-tool",
            name: "Create issue",
            pluginId: "github",
            methodId: "createIssue",
            timeoutMs: 30000,
            requiresApproval: false,
            sideEffect: "write",
          },
        ]),
      /requires approval/i,
    );
  });
});

function createPlugin(overrides: Partial<FabricPlugin> = {}): FabricPlugin {
  return {
    id: "github",
    auth: { type: "none" } as any,
    methods: {
      createIssue: async () => ({ number: 1 }),
      listIssues: async () => [],
    },
    manifest: createManifest(),
    ...overrides,
  };
}

function createManifest(agentToolOverrides: Record<string, unknown> = {}) {
  return {
      metadata: {
        id: "github",
        name: "GitHub",
        description: "GitHub integration",
        icon: "icon.svg",
        categories: ["Developer"],
        author: "Fabric",
        version: "1.0.0",
      },
      methods: {
        createIssue: {
          metadata: {
            label: "Create issue",
            description: "Create a repository issue.",
          },
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
            },
            required: ["title"],
          },
          responseSchema: { type: "object" },
          agentTool: {
            enabled: true,
            name: "github_create_issue",
            description: "Create a GitHub issue in an allowed repository.",
            instructions: "Use after confirming the repository owner and name.",
            sideEffect: "write",
            requiresApproval: true,
            timeoutMs: 30000,
            ...agentToolOverrides,
          },
        },
        listIssues: {
          metadata: {
            label: "List issues",
            description: "List repository issues.",
          },
          parameters: { type: "object", properties: {} },
          responseSchema: { type: "array", items: { type: "object" } },
          agentTool: {
            enabled: false,
            name: "github_list_issues",
            description: "List GitHub issues from an allowed repository.",
            sideEffect: "read",
            requiresApproval: false,
            timeoutMs: 30000,
          },
        },
      },
    } as any;
}
