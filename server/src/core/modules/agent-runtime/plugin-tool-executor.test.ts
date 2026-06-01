import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { afterEach, describe, it } from "node:test";
import type { SailorPlugin } from "@auvexis/sailor-sdk";
import Database from "better-sqlite3";
import {
  resetAppDatabaseProvider,
  setAppDatabaseProvider,
} from "../app/app-repository.ts";
import {
  resetCredentialsDatabaseProvider,
  setCredentialsDatabaseProvider,
} from "../plugins/credential-store.ts";
import { PluginManager } from "../plugins/manager.ts";
import { clearValidatorCache } from "../plugins/validator.ts";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "./agent-errors.ts";
import { AGENT_LIMITS } from "./agent-limits.ts";
import { executePluginAgentTool } from "./plugin-tool-executor.ts";
import type { SailorAgentToolDefinition } from "./plugin-tool-adapter.ts";

describe("plugin tool executor", () => {
  afterEach(() => {
    PluginManager.clearPlugins();
    clearValidatorCache();
    resetCredentialsDatabaseProvider();
    resetAppDatabaseProvider();
  });

  it("executes selected tool through PluginExecutor and merges defaults", async () => {
    let received: Record<string, any> | null = null;
    PluginManager.registerPlugin(createPlugin(async (params) => {
      received = params;
      return { ok: true };
    }));

    const result = await executePluginAgentTool({
      definition: definition(),
      configuredTool: configuredTool({ inputDefaults: { owner: "acme" } }),
      args: { title: "Bug" },
      approvalToken: "approved",
      executionId: "exec_1",
      workflowId: "workflow_1",
      nodeId: "agent_1",
    });

    assert.deepEqual(received, { owner: "acme", title: "Bug" });
    assert.deepEqual(result, { ok: true });
  });

  it("keeps configured input defaults when model args include the same field", async () => {
    let received: Record<string, any> | null = null;
    PluginManager.registerPlugin(createPlugin(async (params) => {
      received = params;
      return { ok: true };
    }));

    await executePluginAgentTool({
      definition: definition(),
      configuredTool: configuredTool({ inputDefaults: { owner: "configured-owner" } }),
      args: { owner: "model-owner", title: "Bug" },
      approvalToken: "approved",
      executionId: "exec_1",
      workflowId: "workflow_1",
      nodeId: "agent_1",
    });

    assert.deepEqual(received, { owner: "configured-owner", title: "Bug" });
  });

  it("rejects unsafe payload shape before executing", async () => {
    PluginManager.registerPlugin(createPlugin(async () => ({ ok: true })));

    await assert.rejects(
      executePluginAgentTool({
        definition: definition(),
        configuredTool: configuredTool(),
        args: deepObject(12),
        approvalToken: "approved",
        executionId: "exec_1",
        workflowId: "workflow_1",
        nodeId: "agent_1",
      }),
      /payload/i,
    );
  });

  it("allows large Buffer values for file parameters without counting raw bytes as JSON payload", async () => {
    const file = Buffer.alloc(AGENT_LIMITS.maxToolPayloadBytes + 1, "a");
    const received: Array<{ upload?: Buffer }> = [];
    PluginManager.registerPlugin(createPlugin(async (params) => {
      received.push(params);
      return { ok: true };
    }, {
      upload: { "x-input-type": "file" },
    }));

    const result = await executePluginAgentTool({
      definition: definition({
        inputSchema: {
          type: "object",
          properties: {
            upload: { "x-input-type": "file" } as any,
          },
          required: ["upload"],
        },
        requiresApproval: false,
        sideEffect: "read",
      }),
      configuredTool: configuredTool({ requiresApproval: false, sideEffect: "read" }),
      args: { upload: file },
      executionId: "exec_1",
      workflowId: "workflow_1",
      nodeId: "agent_1",
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(received[0]?.upload, file);
  });

  it("rejects side-effect tools without approval", async () => {
    PluginManager.registerPlugin(createPlugin(async () => ({ ok: true })));

    await assert.rejects(
      executePluginAgentTool({
        definition: definition({ requiresApproval: true }),
        configuredTool: configuredTool({ requiresApproval: true }),
        args: { owner: "acme", title: "Bug" },
        executionId: "exec_1",
        workflowId: "workflow_1",
        nodeId: "agent_1",
      }),
      /approval/i,
    );
  });

  it("does not include raw binary values in approval requests", async () => {
    PluginManager.registerPlugin(createPlugin(async () => ({ ok: true })));
    const stream = Readable.from(Buffer.alloc(1024, "a"));

    await assert.rejects(
      executePluginAgentTool({
        definition: definition({ requiresApproval: true }),
        configuredTool: configuredTool({ requiresApproval: true }),
        args: {
          owner: "acme",
          title: "Bug",
          attachment: {
            content: stream,
            buffer: Buffer.alloc(2048, "b"),
          },
        },
        executionId: "exec_1",
        workflowId: "workflow_1",
        nodeId: "agent_1",
      }),
      (error) => {
        assert.ok(error instanceof AgentToolApprovalRequiredError);
        assert.deepEqual(error.approvalRequest.args.attachment, {
          content: { type: "Readable" },
          buffer: { type: "Buffer", size: 2048 },
        });
        return true;
      },
    );
  });

  it("honors configured tool approval when the plugin manifest default requires approval", async () => {
    let executed = false;
    PluginManager.registerPlugin(createPlugin(async () => {
      executed = true;
      return { ok: true };
    }));

    const result = await executePluginAgentTool({
      definition: definition({ requiresApproval: true }),
      configuredTool: configuredTool({ requiresApproval: false }),
      args: { owner: "acme", title: "Bug" },
      executionId: "exec_1",
      workflowId: "workflow_1",
      nodeId: "agent_1",
    });

    assert.equal(executed, true);
    assert.deepEqual(result, { ok: true });
  });

  it("enforces tool timeout", async () => {
    PluginManager.registerPlugin(createPlugin(() => new Promise((resolve) => {
      setTimeout(() => resolve({ ok: true }), 30);
    })));

    await assert.rejects(
      executePluginAgentTool({
        definition: definition({ timeoutMs: 1, requiresApproval: false, sideEffect: "read" }),
        configuredTool: configuredTool({ timeoutMs: 1, requiresApproval: false, sideEffect: "read" }),
        args: { owner: "acme", title: "Bug" },
        executionId: "exec_1",
        workflowId: "workflow_1",
        nodeId: "agent_1",
      }),
      /timed out/i,
    );
  });

  it("wraps plugin failures in a structured agent error", async () => {
    PluginManager.registerPlugin(createPlugin(async () => {
      throw new Error("provider exploded");
    }));

    await assert.rejects(
      executePluginAgentTool({
        definition: definition({ requiresApproval: false, sideEffect: "read" }),
        configuredTool: configuredTool({ requiresApproval: false, sideEffect: "read" }),
        args: { owner: "acme", title: "Bug" },
        executionId: "exec_1",
        workflowId: "workflow_1",
        nodeId: "agent_1",
      }),
      (error) =>
        error instanceof AgentRuntimeError &&
        error.code === "AGENT_TOOL_EXECUTION_FAILED" &&
        /provider exploded/.test(error.publicMessage),
    );
  });
});

function setupCredentialsDb(): void {
  const credentialsDb = new Database(":memory:");
  credentialsDb.prepare(`
    CREATE TABLE plugin_credentials (
      plugin_id TEXT PRIMARY KEY,
      fields TEXT NOT NULL,
      updated_at TEXT
    )
  `).run();
  credentialsDb.prepare(`
    CREATE TABLE plugin_tokens (
      plugin_id TEXT PRIMARY KEY,
      tokens TEXT NOT NULL,
      expires_at INTEGER,
      updated_at TEXT
    )
  `).run();
  setCredentialsDatabaseProvider(() => credentialsDb);

  const appDb = new Database(":memory:");
  appDb.prepare(`
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT
    )
  `).run();
  appDb.prepare(`
    CREATE TABLE global_variables (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT,
      updated_at TEXT
    )
  `).run();
  setAppDatabaseProvider(() => appDb);
}

function definition(overrides: Partial<SailorAgentToolDefinition> = {}): SailorAgentToolDefinition {
  return {
    name: "github_create_issue",
    description: "Create a GitHub issue.",
    pluginId: "github",
    methodId: "createIssue",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        title: { type: "string" },
      },
      required: ["owner", "title"],
    },
    sideEffect: "write",
    requiresApproval: true,
    timeoutMs: 30000,
    ...overrides,
  };
}

function configuredTool(overrides: Record<string, any> = {}) {
  return {
    type: "ai-tool",
    name: "Create issue",
    pluginId: "github",
    methodId: "createIssue",
    timeoutMs: 30000,
    requiresApproval: true,
    sideEffect: "write",
    ...overrides,
  } as any;
}

function createPlugin(
  method: (params: Record<string, any>) => Promise<unknown>,
  properties: Record<string, any> = {
    owner: { type: "string" },
    title: { type: "string" },
  },
): SailorPlugin {
  setupCredentialsDb();
  return {
    id: "github",
    auth: { type: "none" } as any,
    methods: {
      createIssue: method,
    },
    manifest: {
      metadata: {
        id: "github",
        name: "GitHub",
        description: "GitHub integration",
        icon: "icon.svg",
        category: "Development",
        author: "Sailor",
        version: "1.0.0",
      },
      methods: {
        createIssue: {
          metadata: { label: "Create issue", description: "Create issue." },
          parameters: {
            type: "object",
            properties,
            required: Object.keys(properties),
          },
          responseSchema: { type: "object" },
        },
      },
    } as any,
  };
}

function deepObject(depth: number): Record<string, any> {
  let value: Record<string, any> = { leaf: true };
  for (let index = 0; index < depth; index++) {
    value = { child: value };
  }
  return value;
}
