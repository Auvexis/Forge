import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateManifest } from "../plugins/loader.ts";

describe("plugin agent tool metadata", () => {
  it("accepts agent tool metadata on plugin methods", () => {
    assert.deepEqual(validateManifest(manifestWithAgentTool()), []);
  });

  it("requires a useful description for enabled agent tools", () => {
    const manifest = manifestWithAgentTool({
      description: "too short",
    });

    assert.match(validateManifest(manifest).join("\n"), /agentTool.description/);
  });

  it("rejects invalid side effect values", () => {
    const manifest = manifestWithAgentTool({
      sideEffect: "format-disk",
    });

    assert.match(validateManifest(manifest).join("\n"), /agentTool.sideEffect/);
  });

  it("allows methods without agent tool metadata", () => {
    const manifest = manifestWithAgentTool();
    delete (manifest.methods.createIssue as { agentTool?: unknown }).agentTool;

    assert.deepEqual(validateManifest(manifest), []);
  });
});

function manifestWithAgentTool(agentToolOverrides: Record<string, unknown> = {}) {
  return {
    metadata: {
      id: "github",
      name: "GitHub",
      description: "GitHub integration.",
      icon: "icon.svg",
      category: "Development",
      author: "Sailor",
      version: "1.0.0",
    },
    methods: {
      createIssue: {
        metadata: {
          label: "Create issue",
          description: "Create a GitHub issue.",
        },
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
          },
          required: ["title"],
        },
        responseSchema: {
          type: "object",
          properties: {
            number: { type: "number" },
          },
        },
        agentTool: {
          enabled: true,
          name: "github_create_issue",
          description: "Create a GitHub issue in an allowed repository.",
          sideEffect: "write",
          requiresApproval: true,
          timeoutMs: 30000,
          ...agentToolOverrides,
        },
      },
    },
  };
}
