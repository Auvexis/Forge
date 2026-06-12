import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  VALID_NODE_TYPES,
  validateWorkflowDefinition,
} from "./workflow-validation.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

function baseWorkflow(overrides: Partial<WorkflowItem> = {}): WorkflowItem {
  return {
    metadata: {
      id: "wf-1",
      name: "Workflow",
      version: "1.0.0",
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: "2026-05-09T00:00:00.000Z",
    },
    trigger: { type: "manual" },
    nodes: {},
    edges: [],
    variables: [],
    ...overrides,
  };
}

describe("workflow validation", () => {
  it("exports the first-party node type set used by routes and schemas", () => {
    assert.equal(VALID_NODE_TYPES.has("plugin"), true);
    assert.equal(VALID_NODE_TYPES.has("respond-webhook"), true);
    assert.equal(VALID_NODE_TYPES.has("wait-form"), true);
  });

  it("accepts a minimal valid workflow definition", () => {
    assert.equal(validateWorkflowDefinition(baseWorkflow()), null);
  });

  it("rejects edges that reference missing nodes", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      edges: [{ id: "edge-1", source: "trigger", target: "missing" }],
    }));

    assert.match(error ?? "", /unknown target node "missing"/);
  });

  it("rejects invalid form trigger fields", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      trigger: {
        type: "form",
        formFields: [{ name: "bad name", label: "Bad", type: "text" }],
      },
    }));

    assert.match(error ?? "", /invalid name/);
  });

  it("rejects invalid wait-form node fields", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        "wait-form-1": {
          type: "wait-form",
          name: "Wait Form",
          title: "Apply",
          fields: [{ name: "bad name", label: "Bad", type: "text" }],
        },
      },
    }));

    assert.match(error ?? "", /invalid name/);
  });

  it("rejects invalid form fields on real trigger nodes", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        form_trigger: {
          type: "trigger",
          name: "Form Trigger",
          trigger: {
            type: "form",
            formFields: [{ name: "bad name", label: "Bad", type: "text" }],
          },
        },
      },
    }));

    assert.match(error ?? "", /invalid name/);
  });

  it("accepts generic AI model nodes with pluginId and adapter", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        model: {
          type: "ai-model",
          name: "Generic Model",
          pluginId: "generic-ai",
          adapter: "openai-compatible",
          model: "gpt-test",
          temperature: 0,
        },
      },
    }));

    assert.equal(error, null);
  });

  it("accepts native Ollama AI model nodes with pluginId and adapter", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        model: {
          type: "ai-model",
          name: "Ollama Model",
          pluginId: "sailor-ollama",
          adapter: "ollama",
          model: "llama3.2",
          temperature: 0,
        },
      },
    }));

    assert.equal(error, null);
  });

  it("accepts legacy OpenAI provider AI model nodes during migration", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        model: {
          type: "ai-model",
          name: "Legacy OpenAI Model",
          provider: "openai",
          model: "gpt-test",
          temperature: 0,
        } as any,
      },
    }));

    assert.equal(error, null);
  });

  it("rejects AI agent retry limits above one hundred", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        agent: {
          type: "ai-agent",
          name: "Agent",
          prompt: "Help users.",
          maxIterations: 8,
          maxToolCalls: 12,
          maxRetriesPerTool: 101,
          timeoutMs: 180000,
          requireApprovalForSideEffects: ["write"],
          outputMode: "text",
        },
      },
    }));

    assert.match(error ?? "", /maxRetriesPerTool/);
  });

  it("rejects unsupported legacy AI model providers with migration guidance", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        model: {
          type: "ai-model",
          name: "Bad Legacy Model",
          provider: "random",
          model: "gpt-test",
          temperature: 0,
        } as any,
      },
    }));

    assert.match(error ?? "", /legacy provider/i);
    assert.match(error ?? "", /openai\/openrouter|openai.*openrouter/i);
    assert.match(error ?? "", /pluginId.*adapter/i);
  });

  it("rejects new AI model configs without pluginId", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        model: {
          type: "ai-model",
          name: "Missing Plugin",
          adapter: "openai-compatible",
          model: "gpt-test",
          temperature: 0,
        } as any,
      },
    }));

    assert.match(error ?? "", /pluginId/);
  });

  it("rejects unsupported AI model adapters", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        model: {
          type: "ai-model",
          name: "Bad Adapter",
          pluginId: "generic-ai",
          adapter: "custom-adapter",
          model: "gpt-test",
          temperature: 0,
        } as any,
      },
    }));

    assert.match(error ?? "", /supported adapter/i);
    assert.match(error ?? "", /openai-compatible/);
    assert.match(error ?? "", /ollama/);
  });

  it("accepts plugin-backed AI memory nodes with plugin method ids", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        memory: {
          type: "ai-memory",
          name: "PostgreSQL Memory",
          scope: "profile",
          readEnabled: true,
          writeEnabled: true,
          maxRetrievedMemories: 4,
          maxMemoryChars: 4000,
          adapter: "plugin-memory-store",
          pluginId: "sailor-postgresql",
          searchMethodId: "searchAgentMemory",
          putMethodId: "putAgentMemory",
        },
      },
    }));

    assert.equal(error, null);
  });

  it("rejects plugin-backed AI memory nodes without plugin method ids", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        memory: {
          type: "ai-memory",
          name: "Broken Plugin Memory",
          scope: "profile",
          readEnabled: true,
          writeEnabled: true,
          maxRetrievedMemories: 4,
          maxMemoryChars: 4000,
          adapter: "plugin-memory-store",
          pluginId: "sailor-postgresql",
        } as any,
      },
    }));

    assert.match(error ?? "", /pluginId.*searchMethodId.*putMethodId|searchMethodId.*putMethodId/i);
  });
});
