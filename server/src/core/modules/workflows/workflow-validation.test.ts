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
    assert.equal(VALID_NODE_TYPES.has("text-dataset"), true);
    assert.equal(VALID_NODE_TYPES.has("file-dataset"), true);
    assert.equal(VALID_NODE_TYPES.has("database-dataset"), true);
    assert.equal(VALID_NODE_TYPES.has("embeddings"), true);
    assert.equal(VALID_NODE_TYPES.has("vector-store"), true);
    assert.equal(VALID_NODE_TYPES.has("retriever"), true);
    assert.equal(VALID_NODE_TYPES.has("basic-llm-chain"), true);
    assert.equal(VALID_NODE_TYPES.has("structured-json-parser"), true);
    assert.equal(VALID_NODE_TYPES.has("vector-store-retriever"), true);
    assert.equal(VALID_NODE_TYPES.has("question-answer-chain"), true);
    assert.equal(VALID_NODE_TYPES.has("vector-store-tool"), true);
  });

  it("accepts a normal call workflow step without agent tool metadata", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        call: {
          type: "call-workflow",
          name: "Call Child",
          targetWorkflowId: "wf-child",
          targetTriggerId: "manual",
        } as any,
      },
      edges: [
        { id: "trigger-call", source: "trigger", target: "call" },
      ],
    }));

    assert.equal(error, null);
  });

  it("requires toolName only when call workflow is connected as an AI Agent tool", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        agent: {
          type: "ai-agent",
          name: "Agent",
          prompt: "Help users.",
          maxIterations: 8,
          maxToolCalls: 12,
          timeoutMs: 180000,
          requireApprovalForSideEffects: [],
          outputMode: "text",
        } as any,
        call: {
          type: "call-workflow",
          name: "Call Child",
          targetWorkflowId: "wf-child",
          targetTriggerId: "manual",
        } as any,
      },
      edges: [
        { id: "call-agent", source: "call", target: "agent", targetHandle: "tool" },
      ],
    }));

    assert.match(error ?? "", /toolName/);
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

  it("rejects missing required configuration handles on active flow nodes", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        agent: { type: "ai-agent", name: "Agent", prompt: "Help", maxIterations: 3, maxToolCalls: 3, timeoutMs: 30000, requireApprovalForSideEffects: [], outputMode: "text" },
      },
      edges: [{ id: "trigger-agent", source: "trigger", target: "agent" }],
    }));
    assert.match(error ?? "", /Node "agent" handle "chatModel" requires capability "chat-model"/);
  });

  it("rejects incompatible and excess configuration connections", () => {
    const nodes = {
      agent: { type: "ai-agent", name: "Agent", prompt: "Help", maxIterations: 3, maxToolCalls: 3, timeoutMs: 30000, requireApprovalForSideEffects: [], outputMode: "text" },
      model: { type: "ai-model", name: "Model", pluginId: "openai", adapter: "openai-compatible", model: "gpt", temperature: 0 },
      model2: { type: "ai-model", name: "Model 2", pluginId: "openai", adapter: "openai-compatible", model: "gpt", temperature: 0 },
      embedding: { type: "embeddings", name: "Embedding", pluginId: "openai", methodId: "embed", model: "embed", input: "" },
    } as any;
    const incompatible = validateWorkflowDefinition(baseWorkflow({ nodes, edges: [
      { id: "trigger-agent", source: "trigger", target: "agent" },
      { id: "embedding-agent", source: "embedding", target: "agent", targetHandle: "chatModel" },
    ] }));
    assert.match(incompatible ?? "", /requires capability "chat-model".*provides \[embedding-model\]/);

    const excess = validateWorkflowDefinition(baseWorkflow({ nodes, edges: [
      { id: "trigger-agent", source: "trigger", target: "agent" },
      { id: "model-agent", source: "model", target: "agent", targetHandle: "chatModel" },
      { id: "model2-agent", source: "model2", target: "agent", targetHandle: "chatModel" },
    ] }));
    assert.match(excess ?? "", /handle "chatModel" accepts one connection but received 2/);
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

  it("accepts generic text dataset nodes for non-AI data workflows", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        dataset: {
          type: "text-dataset",
          name: "Dataset",
          text: "one\ntwo\nthree",
          format: "plain-text",
          chunking: {
            enabled: true,
            chunkSize: 800,
            chunkOverlap: 120,
            contextualOverlapEnabled: true,
            maxPreviousContextChars: 240,
          },
        },
      },
    }));

    assert.equal(error, null);
  });

  it("accepts generic vector store and retriever nodes without provider-specific validation", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        store: {
          type: "vector-store",
          name: "Vector Store",
          pluginId: "vector-provider",
          ensureCollectionMethodId: "ensureCollection",
          upsertMethodId: "upsertDocuments",
          queryMethodId: "querySimilar",
          collectionName: "docs",
          dimension: 1536,
          metric: "cosine",
          config: { mode: "cloud" },
        },
        retriever: {
          type: "retriever",
          name: "Retriever",
          query: "{{ trigger.query }}",
          topK: 5,
          outputMode: "context",
          maxContextChars: 4000,
        },
      },
    }));

    assert.equal(error, null);
  });

  it("accepts uploaded file datasets and embedding config nodes with empty direct input", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        files: {
          type: "file-dataset",
          name: "Files",
          files: [{ filename: "guide.md", content: "U2FpbG9y" }],
          format: "auto",
          chunking: {
            enabled: false,
            chunkSize: 800,
            chunkOverlap: 120,
            contextualOverlapEnabled: false,
            maxPreviousContextChars: 0,
          },
        },
        embeddings: {
          type: "embeddings",
          name: "Embeddings",
          pluginId: "embedding-provider",
          methodId: "createEmbeddings",
          model: "default",
          input: "",
        },
      },
    }));

    assert.equal(error, null);
  });

  it("rejects File Dataset connected directly to Vector Store documents", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        files: {
          type: "file-dataset",
          name: "Extract From File",
          files: [{ filename: "guide.md", content: "U2FpbG9y" }],
          format: "auto",
          chunking: {
            enabled: false,
            chunkSize: 800,
            chunkOverlap: 120,
            contextualOverlapEnabled: false,
            maxPreviousContextChars: 0,
          },
        },
        store: {
          type: "vector-store",
          name: "Vector Store",
          pluginId: "vector-provider",
          ensureCollectionMethodId: "ensureCollection",
          upsertMethodId: "upsertDocuments",
          queryMethodId: "querySimilar",
          collectionName: "docs",
          dimension: 1536,
          metric: "cosine",
          config: {},
        },
      },
      edges: [{ id: "files-store", source: "files", target: "store", targetHandle: "document" }],
    }));

    assert.match(error ?? "", /handle "document" requires capability "document-source".*provides \[file-data-source\]/);
  });

  it("accepts vector store retrieval settings while preserving legacy retriever workflows", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        store: {
          type: "vector-store",
          name: "Vector Store",
          pluginId: "vector-provider",
          ensureCollectionMethodId: "ensureCollection",
          upsertMethodId: "upsertDocuments",
          queryMethodId: "querySimilar",
          collectionName: "docs",
          dimension: 1536,
          metric: "cosine",
          config: {},
          retrievalMode: "query",
          query: "{{ trigger.query }}",
          topK: 5,
          outputMode: "context",
          maxContextChars: 4000,
          filter: { tenantId: "demo" },
        },
        legacy: {
          type: "retriever",
          name: "Legacy Retriever",
          query: "{{ trigger.query }}",
          topK: 5,
          outputMode: "context",
        },
      },
    }));

    assert.equal(error, null);
  });

  it("rejects invalid retrieval node config", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        store: {
          type: "vector-store",
          name: "Broken Store",
          pluginId: "vector-provider",
          ensureCollectionMethodId: "ensureCollection",
          upsertMethodId: "upsertDocuments",
          queryMethodId: "querySimilar",
          collectionName: "docs",
          dimension: 0,
          metric: "cosine",
          config: {},
        },
      },
    }));

    assert.match(error ?? "", /dimension/);
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

  it("accepts valid reusable advanced AI node fields", () => {
    const error = validateWorkflowDefinition(baseWorkflow({
      nodes: {
        chain: { type: "basic-llm-chain", name: "Chain", prompt: "Answer", input: "trigger.body" },
        parser: { type: "structured-json-parser", name: "Parser", schema: { type: "object" }, strict: true, failurePolicy: "error" },
        retriever: { type: "vector-store-retriever", name: "Retriever", topK: 5, maxContextChars: 8000 },
        qa: { type: "question-answer-chain", name: "Q&A", question: "trigger.body.question" },
        tool: { type: "vector-store-tool", name: "Search", toolName: "search_docs", description: "Search documents", topK: 5 },
      } as any,
    }));

    assert.equal(error, null);
  });

  it("rejects invalid reusable advanced AI node fields", () => {
    const invalidNodes = [
      { type: "basic-llm-chain", name: "Chain", prompt: "", input: "" },
      { type: "structured-json-parser", name: "Parser", schema: [], strict: true, failurePolicy: "repair" },
      { type: "vector-store-retriever", name: "Retriever", topK: 0, maxContextChars: 0 },
      { type: "question-answer-chain", name: "Q&A", question: "" },
      { type: "vector-store-tool", name: "Search", toolName: "", description: "", topK: 0 },
    ];

    for (const [index, node] of invalidNodes.entries()) {
      const error = validateWorkflowDefinition(baseWorkflow({ nodes: { [`node-${index}`]: node } as any }));
      assert.notEqual(error, null, `expected ${node.type} to be rejected`);
    }
  });
});
