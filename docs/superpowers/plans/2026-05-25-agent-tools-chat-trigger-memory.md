# Agent Tools, Chat Trigger, and Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade Sailor AI Agent system with Chat Trigger, model/provider nodes, memory nodes, plugin-backed tools, execution tracing, and safety controls that can surpass n8n Agent Tools while respecting Sailor plugin boundaries.

**Architecture:** Add a new `agent-runtime` core module that owns LangGraph/LangChain integration, tool adaptation, model adapters, memory, chat sessions, approvals, and audit events. Workflow nodes stay thin and call the runtime through node handlers. Plugins remain generic and never import core/engines; core adapts plugin manifests and methods into agent tools through `PluginExecutor`.

**Tech Stack:** TypeScript, Fastify, better-sqlite3, Node test runner, Zod, AJV, LangGraph JS, LangChain Core, LangChain OpenAI-compatible chat models, existing Sailor workflow engine, plugin manager, profile databases, Vue 3, Pinia, Vue Flow.

---

## Hard Rules From `DEFAULT_PROMPT.md`

- Use branch `dev`; do not create a new branch.
- Create and maintain a `.md` task map under `feats-map/` before implementation.
- Use TDD before implementation except tiny corrections.
- Analyze current backend and frontend architecture before each task batch.
- Keep plugin isolation: plugins do not import core, engines, or other plugins.
- Core/engine modules can communicate with plugins through engines/adapters.
- Keep code clean, SRP, clean architecture, and scalable boundaries.
- Commit after each completed task.

## External References To Recheck Before Implementation

- LangGraph JS overview: `https://docs.langchain.com/oss/javascript/langgraph`
- LangGraph persistence: `https://docs.langchain.com/oss/javascript/langgraph/persistence`
- LangGraph memory: `https://docs.langchain.com/oss/javascript/langgraph/add-memory`
- LangChain JS tools: `https://docs.langchain.com/oss/javascript/langchain/tools`
- n8n LangChain concepts: `https://docs.n8n.io/advanced-ai/langchain/langchain-n8n/`
- n8n AI Agent node: `https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/`
- Security advisories must be checked again before dependency install. As of 2026-05-25, plan assumes no vulnerable LangChain/LangGraph versions are allowed.

## Scope Boundary

Included:
- Chat Trigger node and public/private chat session API.
- AI Agent node.
- AI Model provider node.
- Agent Memory node.
- Agent Tool node backed by plugin methods.
- Agent runtime using LangGraph persistence and LangChain-compatible tools.
- Session-scoped short-term memory.
- Profile/workflow/user long-term memory store.
- Tool registry, permissions, side-effect policy, timeouts, payload limits, and confirmation gates.
- Execution timeline events for agent thought boundaries, tool calls, model calls, memory reads/writes, approvals, and errors.
- UI for configuring agent/model/memory/tool nodes.
- UI for chat sessions and tool-call inspection.
- Tests for contracts, runtime behavior, persistence, safety, and integration.

Excluded from the first implementation:
- Multi-agent orchestration with multiple collaborating agents.
- Full vector RAG ingestion UI.
- LangSmith hosted tracing as a required dependency.
- Automatic memory write for every message.
- Allowing every plugin method as a tool without explicit metadata and safety classification.
- Letting plugins call agent runtime directly.
- Browser-based end-to-end tests for every drag/drop editor edge case.

## Architecture Decisions

### Agent Runtime Boundary

Create `server/src/core/modules/agent-runtime/` as the only backend module allowed to know about LangGraph/LangChain. Workflow nodes call this module through node handlers. Routes call this module through services. Plugins are only reached through `PluginExecutor` or existing plugin manager APIs.

### LangGraph Over Plain LangChain Agent

Use LangGraph as the durable orchestration layer because this feature needs persistence, resume, human approval, state inspection, and stable memory. Use LangChain Core pieces for tools, model abstractions, and message types where useful. Do not hide Sailor behavior inside a giant prebuilt agent function if it blocks auditability.

### Memory Model

Use four separate concepts:

1. Chat message log: user-visible and audit-friendly.
2. Checkpointer: LangGraph short-term thread state.
3. Long-term memory store: profile/workflow/user/agent facts.
4. Knowledge/RAG store: future document retrieval, not part of this initial feature except interfaces.

### Tool Safety

Plugin methods become agent tools only if metadata marks them as agent-eligible. Every tool has schema, description, side-effect class, timeout, max payload, credential requirements, and confirmation policy.

### Clean Architecture Layering

Recommended backend layering:

```txt
routes -> services -> use cases -> repositories/adapters -> external libs/plugins
nodes  -> node handlers -> agent runtime use cases
```

No Vue component should directly understand LangGraph concepts. Frontend speaks Sailor contracts: agent nodes, chat sessions, tool calls, memory scopes, and execution events.

## File Structure

### Backend Create

- `server/src/core/modules/agent-runtime/agent-types.ts`
  - Pure shared backend domain types for agent runs, events, tools, providers, memory, approvals, and errors.
- `server/src/core/modules/agent-runtime/agent-errors.ts`
  - Error classes and safe public error serialization.
- `server/src/core/modules/agent-runtime/agent-limits.ts`
  - Central limits for messages, payload depth, tool calls, iterations, timeouts, memory size, and event body size.
- `server/src/core/modules/agent-runtime/agent-validation.ts`
  - Zod/AJV validation for node configs, chat payloads, memory writes, and tool definitions.
- `server/src/core/modules/agent-runtime/agent-event-sanitizer.ts`
  - Redacts credentials/secrets and truncates large model/tool payloads.
- `server/src/core/modules/agent-runtime/agent-event-bus.ts`
  - Emits agent events into workflow execution events.
- `server/src/core/modules/agent-runtime/agent-tool-registry.ts`
  - Lists and validates tools available to an agent.
- `server/src/core/modules/agent-runtime/plugin-tool-adapter.ts`
  - Converts plugin manifest methods into Sailor agent tools.
- `server/src/core/modules/agent-runtime/plugin-tool-executor.ts`
  - Executes an approved plugin tool through `PluginExecutor`.
- `server/src/core/modules/agent-runtime/model-provider-registry.ts`
  - Registers model providers and resolves model node config.
- `server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts`
  - OpenAI-compatible LangChain chat model adapter for OpenAI/OpenRouter-style APIs.
- `server/src/core/modules/agent-runtime/memory/agent-checkpointer.ts`
  - Creates the LangGraph checkpointer for a profile database.
- `server/src/core/modules/agent-runtime/memory/agent-memory-store.ts`
  - Long-term memory repository and retrieval service.
- `server/src/core/modules/agent-runtime/memory/agent-memory-policy.ts`
  - Controls what can be written to long-term memory.
- `server/src/core/modules/agent-runtime/chat/chat-session-repository.ts`
  - Persists chat sessions.
- `server/src/core/modules/agent-runtime/chat/chat-message-repository.ts`
  - Persists chat messages and tool-call transcript entries.
- `server/src/core/modules/agent-runtime/chat/chat-trigger-service.ts`
  - Starts/continues sessions and triggers workflows.
- `server/src/core/modules/agent-runtime/agent-graph-builder.ts`
  - Builds LangGraph graph from Sailor agent config.
- `server/src/core/modules/agent-runtime/agent-runner.ts`
  - Runs agent graph with model, tools, memory, events, approvals, and limits.
- `server/src/core/modules/agent-runtime/agent-approval-service.ts`
  - Creates/resumes approval requests for sensitive tools.
- `server/src/core/modules/agent-runtime/agent-runtime-service.ts`
  - Public facade used by workflow handlers/routes.
- `server/src/core/nodes/handlers/ai-agent.ts`
  - Workflow node handler for AI Agent.
- `server/src/core/nodes/handlers/ai-model.ts`
  - Configuration-only handler metadata for model node.
- `server/src/core/nodes/handlers/ai-memory.ts`
  - Configuration-only handler metadata for memory node.
- `server/src/core/nodes/handlers/ai-tool.ts`
  - Configuration-only handler metadata for tool node.
- `server/src/core/routes/agent-chat.routes.ts`
  - Chat sessions, send message, history, approvals, memory admin endpoints.
- `server/src/core/database/migrations/workflows/004_agent_nodes.ts`
  - Adds agent/chat trigger node support if workflow schema migrations need a marker.
- `server/src/core/database/migrations/workflows/005_agent_runtime_tables.ts`
  - Creates chat, memory, approval, and audit tables in profile workflow DB.
- `server/src/core/modules/agent-runtime/**/*.test.ts`
  - Focused backend tests.
- `server/src/core/routes/agent-chat.routes.test.ts`
  - Route tests.
- `server/src/core/routes/agent-chat-workflow.integration.test.ts`
  - End-to-end backend chat trigger integration.

### Backend Modify

- `server/package.json`
  - Add audited LangChain/LangGraph dependencies.
- `server/src/shared/models/workflow-types.ts`
  - Add `ai-agent`, `ai-model`, `ai-memory`, `ai-tool`, and chat trigger types.
- `server/src/core/nodes/registry.ts`
  - Register new AI node handlers as utility nodes, not plugin nodes.
- `server/src/core/modules/workflows/executor.ts`
  - Allow configuration-node discovery around an AI Agent without executing model/memory/tool nodes as normal steps.
- `server/src/core/modules/workflows/graph.ts`
  - Add tests only if graph traversal must support AI cluster side-connections.
- `server/src/core/modules/workflows/workflow-triggers.ts`
  - Add chat trigger resolution.
- `server/src/core/nodes/handlers/trigger.ts`
  - Keep the existing trigger node handler and support chat trigger metadata.
- `server/src/core/server.ts`
  - Register `agentChatRoutes` following the current server route registration pattern.
- `server/src/core/database/manager.ts`
  - Ensure profile workflow DB migrations include agent runtime tables.
- `server/src/core/modules/plugins/loader.ts`
  - Validate optional agent tool metadata in plugin manifests.
- `server/src/plugins/_template/manifest.json`
  - Document agent tool metadata for plugin creators.

### Frontend Create

- `client-vue/src/features/agent-runtime/types/agent.types.ts`
  - Frontend contracts matching backend API.
- `client-vue/src/core/api/agent-chat.api.ts`
  - Chat and memory API client.
- `client-vue/src/core/api/agent-tools.api.ts`
  - Tool discovery API client.
- `client-vue/src/features/workflow-editor/components/nodes/AiAgentNode.vue`
  - Canvas node for AI Agent.
- `client-vue/src/features/workflow-editor/components/nodes/AiModelNode.vue`
  - Canvas node for model provider.
- `client-vue/src/features/workflow-editor/components/nodes/AiMemoryNode.vue`
  - Canvas node for memory.
- `client-vue/src/features/workflow-editor/components/nodes/AiToolNode.vue`
  - Canvas node for tool.
- `client-vue/src/features/workflow-editor/components/nodes/ChatTriggerNode.vue`
  - Canvas node for chat trigger.
- `client-vue/src/features/workflow-editor/components/settings/editors/AiAgentEditor.vue`
  - Agent config editor.
- `client-vue/src/features/workflow-editor/components/settings/editors/AiModelEditor.vue`
  - Model config editor.
- `client-vue/src/features/workflow-editor/components/settings/editors/AiMemoryEditor.vue`
  - Memory config editor.
- `client-vue/src/features/workflow-editor/components/settings/editors/AiToolEditor.vue`
  - Tool config editor.
- `client-vue/src/features/workflow-editor/components/settings/editors/ChatTriggerEditor.vue`
  - Chat trigger config editor.
- `client-vue/src/features/workflow-editor/components/agent/AgentToolPicker.vue`
  - Tool search, schema preview, side-effect badges, and approval policy.
- `client-vue/src/features/workflow-editor/components/agent/AgentMemoryScopePicker.vue`
  - Memory scope selector.
- `client-vue/src/features/workflow-editor/components/agent/AgentTracePanel.vue`
  - Model/tool/memory step inspector.
- `client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue`
  - Chat session testing UI.
- `client-vue/src/features/workflow-editor/components/agent/AgentApprovalPanel.vue`
  - Human approval UI for pending tool calls.
- `client-vue/src/features/workflow-editor/styles/agent.css`
  - Scoped AI feature styles using existing tokens.
- `client-vue/src/features/workflow-editor/components/agent/__tests__/*.test.ts`
  - Contract tests.

### Frontend Modify

- `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`
  - Register AI node components.
- `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
  - Add AI category and Chat Trigger.
- `client-vue/src/features/workflow-editor/components/settings/editors/index.ts`
  - Register AI editors.
- `client-vue/src/features/workflow-editor/components/settings/nodeInspectorPreview.ts`
  - Add previews for AI nodes.
- `client-vue/src/features/workflow-editor/stores/execution.store.ts`
  - Handle agent events in execution timeline.
- `client-vue/src/features/workflow-editor/components/execution/ExecutionLogsPanel.vue`
  - Render model/tool/memory events safely.
- `client-vue/src/features/workflow-editor/utils/workflowRunTrigger.ts`
  - Add chat trigger test/run behavior.
- `client-vue/src/core/api/endpoints.ts`
  - Add agent chat/tool endpoints.

---

## Data Contracts

Add these backend and frontend contracts through tests before implementation:

```ts
export type AgentMemoryScope = "none" | "session" | "workflow" | "profile" | "user";

export type AgentToolSideEffect =
  | "read"
  | "write"
  | "delete"
  | "external-message"
  | "external-payment"
  | "filesystem";

export interface AiAgentNodeConfig {
  type: "ai-agent";
  name: string;
  prompt: string;
  maxIterations: number;
  maxToolCalls: number;
  timeoutMs: number;
  requireApprovalForSideEffects: AgentToolSideEffect[];
  outputMode: "text" | "json";
  outputSchema?: Record<string, any>;
}

export interface AiModelNodeConfig {
  type: "ai-model";
  name: string;
  provider: "openai" | "openrouter";
  model: string;
  temperature: number;
  maxTokens?: number;
  credentialId?: string;
  baseUrl?: string;
}

export interface AiMemoryNodeConfig {
  type: "ai-memory";
  name: string;
  scope: AgentMemoryScope;
  readEnabled: boolean;
  writeEnabled: boolean;
  maxRetrievedMemories: number;
  maxMemoryChars: number;
}

export interface AiToolNodeConfig {
  type: "ai-tool";
  name: string;
  pluginId: string;
  methodId: string;
  descriptionOverride?: string;
  timeoutMs: number;
  requiresApproval: boolean;
  sideEffect: AgentToolSideEffect;
  inputDefaults?: Record<string, any>;
}

export interface ChatTriggerConfig {
  type: "chat";
  chatSlug: string;
  title: string;
  authMode: "public" | "signed" | "profile";
  sessionMode: "new-session-per-user" | "resume-by-session-id";
  allowedOrigins?: string[];
  rateLimitPerMinute: number;
}
```

---

## Implementation Tasks

### Task 1: Dependency Audit and Install

**Files:**
- Modify: `server/package.json`
- Modify: `server/package-lock.json` if present after install
- Create: `server/src/core/modules/agent-runtime/dependency-versions.test.ts`

- [x] **Step 1: Check current dependency tree**

Run:

```bash
cd server
npm ls @langchain/langgraph @langchain/core @langchain/openai @langchain/langgraph-checkpoint-sqlite
```

Expected: command exits non-zero or shows packages missing.

- [x] **Step 2: Check current security advisories**

Run:

```bash
cd server
npm view @langchain/core version
npm view @langchain/langgraph version
npm view @langchain/openai version
npm view @langchain/langgraph-checkpoint-sqlite version
```

Expected: versions are current as of implementation day. Do not proceed if public advisories show vulnerable versions.

- [x] **Step 3: Install dependencies**

Run:

```bash
cd server
npm install @langchain/core@latest @langchain/langgraph@latest @langchain/openai@latest @langchain/langgraph-checkpoint-sqlite@latest
```

Expected: install succeeds and package files update.

- [x] **Step 4: Write dependency floor test**

Create `server/src/core/modules/agent-runtime/dependency-versions.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packageJson from "../../../../package.json" with { type: "json" };

describe("agent runtime dependency policy", () => {
  it("pins LangChain and LangGraph packages through package.json", () => {
    const dependencies = packageJson.dependencies as Record<string, string>;
    assert.ok(dependencies["@langchain/core"]);
    assert.ok(dependencies["@langchain/langgraph"]);
    assert.ok(dependencies["@langchain/openai"]);
    assert.ok(dependencies["@langchain/langgraph-checkpoint-sqlite"]);
    assert.match(dependencies["@langchain/core"], /^\^?\d+\.\d+\.\d+|latest$/);
    assert.match(dependencies["@langchain/langgraph"], /^\^?\d+\.\d+\.\d+|latest$/);
  });
});
```

- [x] **Step 5: Run dependency test**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/dependency-versions.test.ts
npm audit --omit=dev
```

Expected: test passes; audit has no high/critical vulnerabilities affecting installed runtime packages.

- [x] **Step 6: Commit**

```bash
git add server/package.json server/package-lock.json server/src/core/modules/agent-runtime/dependency-versions.test.ts
git commit -m "chore: add audited agent runtime dependencies"
```

### Task 2: Agent Domain Types and Limits

**Files:**
- Create: `server/src/core/modules/agent-runtime/agent-types.ts`
- Create: `server/src/core/modules/agent-runtime/agent-limits.ts`
- Create: `server/src/core/modules/agent-runtime/agent-errors.ts`
- Create: `server/src/core/modules/agent-runtime/agent-validation.test.ts`
- Create: `server/src/core/modules/agent-runtime/agent-validation.ts`

- [x] **Step 1: Write failing validation tests**

Create tests that assert:
- valid agent, model, memory, tool, and chat trigger configs pass.
- prompt over `AGENT_LIMITS.maxPromptChars` fails.
- `maxIterations` above limit fails.
- `maxToolCalls` above limit fails.
- tool side-effect outside allowlist fails.
- chat slug outside `^[a-z0-9]+(?:-[a-z0-9]+)*$` fails.
- output schema over depth limit fails.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/agent-validation.test.ts
```

Expected: fail because files do not exist.

- [x] **Step 2: Implement limits**

Create `agent-limits.ts`:

```ts
export const AGENT_LIMITS = {
  maxPromptChars: 12000,
  maxUserMessageChars: 24000,
  maxSystemMessageChars: 12000,
  maxIterations: 12,
  maxToolCalls: 20,
  maxToolPayloadBytes: 256_000,
  maxToolResultBytes: 512_000,
  maxJsonDepth: 8,
  maxJsonKeys: 300,
  maxMemoryChars: 4000,
  maxRetrievedMemories: 12,
  maxEventBodyChars: 16000,
  defaultToolTimeoutMs: 30000,
  maxToolTimeoutMs: 120000,
  defaultAgentTimeoutMs: 180000,
  maxAgentTimeoutMs: 600000,
  chatRateLimitPerMinute: 30,
} as const;
```

- [x] **Step 3: Implement domain types**

Create `agent-types.ts` with the contracts from the Data Contracts section plus:

```ts
export type AgentRunStatus = "running" | "success" | "failed" | "cancelled" | "waiting-approval";
export type AgentEventType =
  | "agent:start"
  | "agent:model-start"
  | "agent:model-end"
  | "agent:tool-start"
  | "agent:tool-end"
  | "agent:memory-read"
  | "agent:memory-write"
  | "agent:approval-created"
  | "agent:approval-resumed"
  | "agent:error"
  | "agent:end";

export interface AgentRunInput {
  workflowId: string;
  executionId: string;
  nodeId: string;
  sessionId?: string;
  userMessage: string;
  triggerPayload: Record<string, any>;
  agent: AiAgentNodeConfig;
  model: AiModelNodeConfig;
  memory?: AiMemoryNodeConfig;
  tools: AiToolNodeConfig[];
}

export interface AgentRunResult {
  status: AgentRunStatus;
  output: string | Record<string, any>;
  toolCallCount: number;
  iterationCount: number;
  approvalId?: string;
}
```

- [x] **Step 4: Implement safe errors**

Create `agent-errors.ts`:

```ts
export class AgentRuntimeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly publicMessage = message,
    public readonly statusCode = 400,
  ) {
    super(message);
  }
}

export function serializeAgentError(error: unknown): { code: string; message: string } {
  if (error instanceof AgentRuntimeError) {
    return { code: error.code, message: error.publicMessage };
  }
  return { code: "AGENT_RUNTIME_ERROR", message: "Agent execution failed" };
}
```

- [x] **Step 5: Implement validation**

Use Zod for runtime validation and pure helper functions:

```ts
export function validateAiAgentConfig(input: unknown): AiAgentNodeConfig;
export function validateAiModelConfig(input: unknown): AiModelNodeConfig;
export function validateAiMemoryConfig(input: unknown): AiMemoryNodeConfig;
export function validateAiToolConfig(input: unknown): AiToolNodeConfig;
export function validateChatTriggerConfig(input: unknown): ChatTriggerConfig;
```

- [x] **Step 6: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/agent-validation.test.ts
npm run build
```

Expected: tests and TypeScript build pass.

- [x] **Step 7: Commit**

```bash
git add server/src/core/modules/agent-runtime/agent-types.ts server/src/core/modules/agent-runtime/agent-limits.ts server/src/core/modules/agent-runtime/agent-errors.ts server/src/core/modules/agent-runtime/agent-validation.ts server/src/core/modules/agent-runtime/agent-validation.test.ts
git commit -m "feat: add agent runtime contracts"
```

### Task 3: Workflow Node Types

**Files:**
- Modify: `server/src/shared/models/workflow-types.ts`
- Create: `server/src/shared/models/workflow-agent-types.test.ts`

- [x] **Step 1: Write failing type contract test**

Create a test that reads `workflow-types.ts` and asserts:
- `WorkflowNodeType` includes `ai-agent`, `ai-model`, `ai-memory`, `ai-tool`.
- `WorkflowTrigger.type` includes `chat`.
- `WorkflowNode` union includes each AI node interface.
- `ChatTriggerConfig` fields are represented under `WorkflowTrigger`.

Run:

```bash
cd server
node --test src/shared/models/workflow-agent-types.test.ts
```

Expected: fail.

- [x] **Step 2: Add node interfaces**

Add these interfaces to `workflow-types.ts`:

```ts
export interface AiAgentNode extends WorkflowNodeBase {
  type: "ai-agent";
  prompt: string;
  maxIterations: number;
  maxToolCalls: number;
  timeoutMs: number;
  requireApprovalForSideEffects: AgentToolSideEffect[];
  outputMode: "text" | "json";
  outputSchema?: Record<string, any>;
}

export interface AiModelNode extends WorkflowNodeBase {
  type: "ai-model";
  provider: "openai" | "openrouter";
  model: string;
  temperature: number;
  maxTokens?: number;
  credentialId?: string;
  baseUrl?: string;
}

export interface AiMemoryNode extends WorkflowNodeBase {
  type: "ai-memory";
  scope: AgentMemoryScope;
  readEnabled: boolean;
  writeEnabled: boolean;
  maxRetrievedMemories: number;
  maxMemoryChars: number;
}

export interface AiToolNode extends WorkflowNodeBase {
  type: "ai-tool";
  pluginId: string;
  methodId: string;
  descriptionOverride?: string;
  timeoutMs: number;
  requiresApproval: boolean;
  sideEffect: AgentToolSideEffect;
  inputDefaults?: Record<string, any>;
}
```

Add `chat` fields to `WorkflowTrigger`:

```ts
type: "manual" | "webhook" | "cron" | "plugin" | "form" | "chat";
chatSlug?: string;
chatTitle?: string;
chatAuthMode?: "public" | "signed" | "profile";
chatSessionMode?: "new-session-per-user" | "resume-by-session-id";
chatAllowedOrigins?: string[];
chatRateLimitPerMinute?: number;
```

- [x] **Step 3: Verify**

Run:

```bash
cd server
node --test src/shared/models/workflow-agent-types.test.ts
npm run build
```

Expected: pass.

- [x] **Step 4: Commit**

```bash
git add server/src/shared/models/workflow-types.ts server/src/shared/models/workflow-agent-types.test.ts
git commit -m "feat: add workflow ai node contracts"
```

### Task 4: Agent Runtime Tables and Repositories

**Files:**
- Create: `server/src/core/database/migrations/workflows/005_agent_runtime_tables.ts`
- Create: `server/src/core/modules/agent-runtime/chat/chat-session-repository.ts`
- Create: `server/src/core/modules/agent-runtime/chat/chat-message-repository.ts`
- Create: `server/src/core/modules/agent-runtime/memory/agent-memory-store.ts`
- Create: `server/src/core/modules/agent-runtime/agent-approval-service.ts`
- Create: `server/src/core/modules/agent-runtime/agent-runtime-repositories.test.ts`

- [x] **Step 1: Write failing repository tests**

Tests:
- creates chat session with profile/workflow/session ids.
- appends ordered user/assistant/tool messages.
- lists messages by session.
- writes long-term memory with namespace and key.
- retrieves memories by namespace.
- updates memory value without changing createdAt.
- creates approval with status `pending`.
- resolves approval with `approved` or `rejected`.
- cannot read a session from another profile id.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/agent-runtime-repositories.test.ts
```

Expected: fail.

- [x] **Step 2: Implement migration**

Create tables:

```sql
CREATE TABLE IF NOT EXISTS agent_chat_sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  trigger_node_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES agent_chat_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_memories (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  namespace TEXT NOT NULL,
  memory_key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(profile_id, namespace, memory_key)
);

CREATE TABLE IF NOT EXISTS agent_tool_approvals (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  session_id TEXT,
  tool_name TEXT NOT NULL,
  request_json TEXT NOT NULL,
  status TEXT NOT NULL,
  decision_json TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);
```

- [x] **Step 3: Implement repositories**

Repository APIs:

```ts
export class ChatSessionRepository {
  create(input: CreateChatSessionInput): AgentChatSession;
  getById(profileId: string, id: string): AgentChatSession | null;
  listByWorkflow(profileId: string, workflowId: string): AgentChatSession[];
  touch(profileId: string, id: string): void;
}

export class ChatMessageRepository {
  append(input: AppendChatMessageInput): AgentChatMessage;
  listBySession(profileId: string, sessionId: string): AgentChatMessage[];
}

export class AgentMemoryStore {
  put(input: PutAgentMemoryInput): AgentMemoryRecord;
  search(input: SearchAgentMemoryInput): AgentMemoryRecord[];
  delete(profileId: string, namespace: string, key: string): boolean;
}
```

- [x] **Step 4: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/agent-runtime-repositories.test.ts
npm run build
```

Expected: pass.

- [x] **Step 5: Commit**

```bash
git add server/src/core/database/migrations/workflows/005_agent_runtime_tables.ts server/src/core/modules/agent-runtime/chat server/src/core/modules/agent-runtime/memory/agent-memory-store.ts server/src/core/modules/agent-runtime/agent-approval-service.ts server/src/core/modules/agent-runtime/agent-runtime-repositories.test.ts
git commit -m "feat: add agent runtime persistence"
```

### Task 5: Event Sanitizer and Agent Event Bus

**Files:**
- Create: `server/src/core/modules/agent-runtime/agent-event-sanitizer.ts`
- Create: `server/src/core/modules/agent-runtime/agent-event-bus.ts`
- Create: `server/src/core/modules/agent-runtime/agent-event-sanitizer.test.ts`

- [x] **Step 1: Write failing event sanitizer tests**

Tests:
- redacts keys containing `api_key`, `token`, `authorization`, `password`, `secret`.
- truncates strings above `AGENT_LIMITS.maxEventBodyChars`.
- preserves useful shape for tool input/output.
- never mutates original object.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/agent-event-sanitizer.test.ts
```

Expected: fail.

- [x] **Step 2: Implement sanitizer**

Expose:

```ts
export function sanitizeAgentEventPayload(input: unknown): unknown;
export function truncateAgentText(value: string, maxChars?: number): string;
```

- [x] **Step 3: Implement event bus**

Expose:

```ts
export function emitAgentEvent(input: {
  workflowId: string;
  executionId: string;
  nodeId: string;
  type: AgentEventType;
  payload?: unknown;
}): void;
```

Internally call existing `workflowEventBus.emitWorkflowEvent` with a namespaced event payload.

- [x] **Step 4: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/agent-event-sanitizer.test.ts
npm run build
```

Expected: pass.

- [x] **Step 5: Commit**

```bash
git add server/src/core/modules/agent-runtime/agent-event-sanitizer.ts server/src/core/modules/agent-runtime/agent-event-bus.ts server/src/core/modules/agent-runtime/agent-event-sanitizer.test.ts
git commit -m "feat: add sanitized agent events"
```

### Task 6: Plugin Agent Tool Metadata

**Files:**
- Modify: `server/src/core/modules/plugins/loader.ts`
- Modify: `server/src/plugins/_template/manifest.json`
- Create: `server/src/core/modules/agent-runtime/plugin-tool-metadata.test.ts`

- [x] **Step 1: Write failing metadata tests**

Tests:
- manifest accepts `methods.createIssue.agentTool`.
- missing `description` fails for agent-enabled method.
- invalid `sideEffect` fails.
- `requiresApproval: true` is allowed.
- methods without `agentTool` remain valid.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/plugin-tool-metadata.test.ts
```

Expected: fail.

- [x] **Step 2: Extend manifest validation schema**

Add optional method metadata shape:

```json
"agentTool": {
  "enabled": true,
  "name": "github_create_issue",
  "description": "Create a GitHub issue in an allowed repository.",
  "sideEffect": "write",
  "requiresApproval": true,
  "timeoutMs": 30000
}
```

Rules:
- `name` must match `^[a-z][a-z0-9_]{2,63}$`.
- `description` must be 20 to 1000 chars.
- `sideEffect` must be one of the domain side effects.
- `timeoutMs` must be 1000 to `AGENT_LIMITS.maxToolTimeoutMs`.

- [x] **Step 3: Update template manifest**

Add one disabled example under `_template/manifest.json` that plugin authors can copy.

- [x] **Step 4: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/plugin-tool-metadata.test.ts
npm run build
```

Expected: pass.

- [x] **Step 5: Commit**

```bash
git add server/src/core/modules/plugins/loader.ts server/src/plugins/_template/manifest.json server/src/core/modules/agent-runtime/plugin-tool-metadata.test.ts
git commit -m "feat: validate plugin agent tool metadata"
```

### Task 7: Plugin Tool Adapter

**Files:**
- Create: `server/src/core/modules/agent-runtime/plugin-tool-adapter.ts`
- Create: `server/src/core/modules/agent-runtime/agent-tool-registry.ts`
- Create: `server/src/core/modules/agent-runtime/plugin-tool-adapter.test.ts`

- [x] **Step 1: Write failing adapter tests**

Tests:
- lists only plugin methods with `agentTool.enabled === true`.
- creates stable LangChain-safe tool names.
- maps manifest JSON schema into tool input schema.
- rejects method without matching runtime function.
- rejects write/delete tools without approval when agent policy requires it.
- preserves plugin id and method id for execution.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/plugin-tool-adapter.test.ts
```

Expected: fail.

- [x] **Step 2: Implement Sailor tool definition**

```ts
export interface SailorAgentToolDefinition {
  name: string;
  description: string;
  pluginId: string;
  methodId: string;
  inputSchema: Record<string, any>;
  sideEffect: AgentToolSideEffect;
  requiresApproval: boolean;
  timeoutMs: number;
}
```

- [x] **Step 3: Implement adapter**

Expose:

```ts
export function listPluginAgentTools(): SailorAgentToolDefinition[];
export function resolvePluginAgentTool(pluginId: string, methodId: string): SailorAgentToolDefinition;
```

- [x] **Step 4: Implement registry**

Expose:

```ts
export class AgentToolRegistry {
  listAvailableTools(): SailorAgentToolDefinition[];
  resolveConfiguredTools(configs: AiToolNodeConfig[]): SailorAgentToolDefinition[];
}
```

- [x] **Step 5: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/plugin-tool-adapter.test.ts
npm run build
```

Expected: pass.

- [x] **Step 6: Commit**

```bash
git add server/src/core/modules/agent-runtime/plugin-tool-adapter.ts server/src/core/modules/agent-runtime/agent-tool-registry.ts server/src/core/modules/agent-runtime/plugin-tool-adapter.test.ts
git commit -m "feat: adapt plugin methods into agent tools"
```

### Task 8: Plugin Tool Executor Safety

**Files:**
- Create: `server/src/core/modules/agent-runtime/plugin-tool-executor.ts`
- Create: `server/src/core/modules/agent-runtime/plugin-tool-executor.test.ts`

- [x] **Step 1: Write failing executor tests**

Tests:
- executes selected tool through `PluginExecutor.execute`.
- merges configured input defaults with model-provided input.
- validates payload depth/key count/byte size before executing.
- rejects tool if side-effect requires approval and approval is missing.
- enforces timeout.
- redacts tool result in emitted event.
- returns structured error on plugin failure.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/plugin-tool-executor.test.ts
```

Expected: fail.

- [x] **Step 2: Implement executor**

Expose:

```ts
export async function executePluginAgentTool(input: {
  definition: SailorAgentToolDefinition;
  configuredTool: AiToolNodeConfig;
  args: Record<string, any>;
  approvalToken?: string;
  executionId: string;
  workflowId: string;
  nodeId: string;
}): Promise<unknown>;
```

- [x] **Step 3: Add timeout helper**

Use `AbortController` only if downstream supports it; otherwise use a timeout race and record timeout as failed execution. Never leave unhandled promise rejection.

- [x] **Step 4: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/plugin-tool-executor.test.ts
npm run build
```

Expected: pass.

- [x] **Step 5: Commit**

```bash
git add server/src/core/modules/agent-runtime/plugin-tool-executor.ts server/src/core/modules/agent-runtime/plugin-tool-executor.test.ts
git commit -m "feat: execute agent tools safely"
```

### Task 9: Model Provider Registry

**Files:**
- Create: `server/src/core/modules/agent-runtime/model-provider-registry.ts`
- Create: `server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts`
- Create: `server/src/core/modules/agent-runtime/model-provider-registry.test.ts`

- [x] **Step 1: Write failing model provider tests**

Tests:
- resolves OpenAI provider with credential id.
- resolves OpenRouter provider with base URL.
- rejects unknown provider.
- rejects missing credential.
- clamps temperature to safe range.
- never logs API key.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/model-provider-registry.test.ts
```

Expected: fail.

- [x] **Step 2: Implement provider interface**

```ts
export interface AgentModelProvider {
  id: string;
  createChatModel(config: AiModelNodeConfig): Promise<unknown>;
}
```

- [x] **Step 3: Implement OpenAI-compatible provider**

Use `ChatOpenAI` from `@langchain/openai`. For OpenRouter, set compatible `configuration.baseURL`. Credentials come from existing credential store, not from raw node params.

- [x] **Step 4: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/model-provider-registry.test.ts
npm run build
```

Expected: pass.

- [x] **Step 5: Commit**

```bash
git add server/src/core/modules/agent-runtime/model-provider-registry.ts server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts server/src/core/modules/agent-runtime/model-provider-registry.test.ts
git commit -m "feat: add agent model provider registry"
```

### Task 10: Short-Term Memory Checkpointer

**Files:**
- Create: `server/src/core/modules/agent-runtime/memory/agent-checkpointer.ts`
- Create: `server/src/core/modules/agent-runtime/memory/agent-checkpointer.test.ts`

- [x] **Step 1: Write failing checkpointer tests**

Tests:
- creates a profile-scoped `SqliteSaver`.
- calls setup before use.
- uses `thread_id` equal to Sailor chat session id.
- rejects thread ids that do not match `chat_[a-zA-Z0-9_-]+`.
- can delete all checkpoints for a session.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/memory/agent-checkpointer.test.ts
```

Expected: fail.

- [x] **Step 2: Implement checkpointer factory**

```ts
export async function createAgentCheckpointer(input: {
  dbPath: string;
}): Promise<SqliteSaver>;

export function toLangGraphThreadConfig(sessionId: string): {
  configurable: { thread_id: string };
};
```

Use the existing profile database path conventions. Do not accept thread id directly from public request without session ownership validation.

- [x] **Step 3: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/memory/agent-checkpointer.test.ts
npm run build
```

Expected: pass.

- [x] **Step 4: Commit**

```bash
git add server/src/core/modules/agent-runtime/memory/agent-checkpointer.ts server/src/core/modules/agent-runtime/memory/agent-checkpointer.test.ts
git commit -m "feat: add persistent agent checkpointer"
```

### Task 11: Long-Term Memory Policy

**Files:**
- Create: `server/src/core/modules/agent-runtime/memory/agent-memory-policy.ts`
- Create: `server/src/core/modules/agent-runtime/memory/agent-memory-policy.test.ts`

- [x] **Step 1: Write failing policy tests**

Tests:
- session memory can read conversation but cannot write long-term memory.
- workflow memory namespace includes profile id and workflow id.
- profile memory namespace includes profile id.
- user memory requires a user id.
- memory write over max chars fails.
- memory write containing obvious secret key fails.
- memory write requires explicit `writeEnabled`.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/memory/agent-memory-policy.test.ts
```

Expected: fail.

- [x] **Step 2: Implement namespace builder**

```ts
export function buildMemoryNamespace(input: {
  scope: AgentMemoryScope;
  profileId: string;
  workflowId?: string;
  userId?: string;
  agentNodeId?: string;
}): string | null;
```

Return examples:
- `profile:<profileId>`
- `workflow:<profileId>:<workflowId>`
- `user:<profileId>:<userId>`

- [x] **Step 3: Implement write policy**

```ts
export function assertMemoryWriteAllowed(input: {
  memory: AiMemoryNodeConfig;
  value: unknown;
  namespace: string | null;
}): void;
```

- [x] **Step 4: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/memory/agent-memory-policy.test.ts
npm run build
```

Expected: pass.

- [x] **Step 5: Commit**

```bash
git add server/src/core/modules/agent-runtime/memory/agent-memory-policy.ts server/src/core/modules/agent-runtime/memory/agent-memory-policy.test.ts
git commit -m "feat: add agent memory policy"
```

### Task 12: Agent Graph Builder

**Files:**
- Create: `server/src/core/modules/agent-runtime/agent-graph-builder.ts`
- Create: `server/src/core/modules/agent-runtime/agent-graph-builder.test.ts`

- [x] **Step 1: Write failing graph builder tests**

Tests:
- builds graph with model and no tools.
- builds graph with tools.
- includes short-term memory checkpointer config.
- limits tool loop by `maxIterations`.
- returns final text output.
- returns final JSON output only when schema validates.
- emits model/tool events through injected callbacks.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/agent-graph-builder.test.ts
```

Expected: fail.

- [x] **Step 2: Implement graph builder interface**

```ts
export interface BuildAgentGraphInput {
  agent: AiAgentNodeConfig;
  model: unknown;
  tools: unknown[];
  memory?: AiMemoryNodeConfig;
  checkpointer?: unknown;
}

export function buildAgentGraph(input: BuildAgentGraphInput): unknown;
```

Implementation can use LangGraph `StateGraph` with messages state and explicit tool loop. Keep all LangGraph-specific code inside this file.

- [x] **Step 3: Verify with fake model**

Tests must use fake model/tool implementations. Do not call real providers.

- [x] **Step 4: Run tests**

```bash
cd server
node --test src/core/modules/agent-runtime/agent-graph-builder.test.ts
npm run build
```

Expected: pass.

- [x] **Step 5: Commit**

```bash
git add server/src/core/modules/agent-runtime/agent-graph-builder.ts server/src/core/modules/agent-runtime/agent-graph-builder.test.ts
git commit -m "feat: build agent graph runtime"
```

### Task 13: Agent Runner Facade

**Files:**
- Create: `server/src/core/modules/agent-runtime/agent-runner.ts`
- Create: `server/src/core/modules/agent-runtime/agent-runtime-service.ts`
- Create: `server/src/core/modules/agent-runtime/agent-runner.test.ts`

- [x] **Step 1: Write failing runner tests**

Tests:
- validates run input before execution.
- resolves model from model registry.
- resolves configured tools from tool registry.
- creates checkpointer only when session id exists.
- reads long-term memory before model call.
- writes long-term memory only through policy.
- returns `waiting-approval` when sensitive tool needs approval.
- emits `agent:start` and `agent:end`.
- converts thrown errors into `AgentRuntimeError`.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/agent-runner.test.ts
```

Expected: fail.

- [x] **Step 2: Implement runner**

```ts
export class AgentRunner {
  async run(input: AgentRunInput): Promise<AgentRunResult>;
}
```

- [x] **Step 3: Implement service facade**

```ts
export const AgentRuntimeService = {
  runAgent(input: AgentRunInput): Promise<AgentRunResult>,
  listTools(): SailorAgentToolDefinition[],
};
```

- [x] **Step 4: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/agent-runner.test.ts
npm run build
```

Expected: pass.

- [x] **Step 5: Commit**

```bash
git add server/src/core/modules/agent-runtime/agent-runner.ts server/src/core/modules/agent-runtime/agent-runtime-service.ts server/src/core/modules/agent-runtime/agent-runner.test.ts
git commit -m "feat: add agent runner service"
```

### Task 14: AI Workflow Node Handlers

**Files:**
- Create: `server/src/core/nodes/handlers/ai-agent.ts`
- Create: `server/src/core/nodes/handlers/ai-model.ts`
- Create: `server/src/core/nodes/handlers/ai-memory.ts`
- Create: `server/src/core/nodes/handlers/ai-tool.ts`
- Modify: `server/src/core/nodes/registry.ts`
- Create: `server/src/core/nodes/handlers/ai-agent.test.ts`

- [x] **Step 1: Write failing node handler tests**

Tests:
- registry contains `ai-agent`, `ai-model`, `ai-memory`, `ai-tool`.
- model/memory/tool handlers are configuration-only and return safe metadata when executed directly.
- AI Agent finds connected model/memory/tool nodes.
- AI Agent passes trigger payload and workflow context to `AgentRuntimeService.runAgent`.
- AI Agent fails with clear error if no model node is connected.

Run:

```bash
cd server
node --test src/core/nodes/handlers/ai-agent.test.ts
```

Expected: fail.

- [x] **Step 2: Implement configuration handlers**

Model, memory, and tool handlers should not call external services. They expose metadata and return node config if accidentally executed.

- [x] **Step 3: Implement AI Agent handler**

Find connected config nodes from workflow edges. Recommended rule:
- inbound edges from `ai-model`, `ai-memory`, `ai-tool` into `ai-agent` are config links.
- normal execution edge into `ai-agent` is workflow control flow.
- outgoing edge from `ai-agent` continues workflow.

- [x] **Step 4: Register handlers**

Add AI node types to `utilityNodeTypes` and `defaultUtilityHandlers`.

- [x] **Step 5: Verify**

Run:

```bash
cd server
node --test src/core/nodes/handlers/ai-agent.test.ts src/core/nodes/registry.test.ts
npm run build
```

Expected: pass.

- [x] **Step 6: Commit**

```bash
git add server/src/core/nodes/handlers/ai-agent.ts server/src/core/nodes/handlers/ai-model.ts server/src/core/nodes/handlers/ai-memory.ts server/src/core/nodes/handlers/ai-tool.ts server/src/core/nodes/registry.ts server/src/core/nodes/handlers/ai-agent.test.ts
git commit -m "feat: add ai workflow node handlers"
```

### Task 15: Executor Config-Node Traversal Safety

**Files:**
- Modify: `server/src/core/modules/workflows/executor.ts`
- Create: `server/src/core/modules/workflows/agent-config-node-execution.test.ts`

- [x] **Step 1: Write failing executor tests**

Tests:
- workflow with `trigger -> ai-agent -> set` executes agent and then set.
- `ai-model`, `ai-memory`, and `ai-tool` connected as config nodes are not executed as normal workflow steps.
- disconnected AI config nodes are ignored.
- AI config cycles fail validation before execution.

Run:

```bash
cd server
node --test src/core/modules/workflows/agent-config-node-execution.test.ts
```

Expected: fail if current graph tries to execute config nodes.

- [x] **Step 2: Implement traversal rule**

Add helper in executor or graph module:

```ts
function isAgentConfigNode(node: WorkflowNode | undefined): boolean {
  return node?.type === "ai-model" || node?.type === "ai-memory" || node?.type === "ai-tool";
}
```

Do not enqueue config nodes from regular control flow unless they are explicitly used as normal nodes in future design. For this feature, they are cluster sub-nodes only.

- [x] **Step 3: Verify**

Run:

```bash
cd server
node --test src/core/modules/workflows/agent-config-node-execution.test.ts
npm run build
```

Expected: pass.

- [x] **Step 4: Commit**

```bash
git add server/src/core/modules/workflows/executor.ts server/src/core/modules/workflows/agent-config-node-execution.test.ts
git commit -m "feat: support ai agent config nodes"
```

### Task 16: Chat Trigger Backend

**Files:**
- Modify: `server/src/core/nodes/handlers/trigger.ts`
- Modify: `server/src/core/modules/workflows/workflow-triggers.ts`
- Create: `server/src/core/modules/agent-runtime/chat/chat-trigger-service.ts`
- Create: `server/src/core/modules/agent-runtime/chat/chat-trigger-service.test.ts`

- [x] **Step 1: Write failing chat trigger tests**

Tests:
- resolves workflow by `chatSlug`.
- creates a new chat session on first message.
- resumes session only when profile/workflow/session match.
- creates trigger payload with message, session id, user id, and metadata.
- calls `WorkflowEngine.executeWorkflowFromTrigger`.
- rejects disabled workflow.
- rate limits public chat trigger.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/chat/chat-trigger-service.test.ts
```

Expected: fail.

- [x] **Step 2: Implement chat trigger metadata in existing trigger model**

Keep current Sailor shape: trigger nodes remain `type: "trigger"`, and Chat Trigger is represented by `node.trigger.type === "chat"` or workflow root `trigger.type === "chat"`. Do not add a separate backend `chat-trigger` node type.

- [x] **Step 3: Implement trigger service**

```ts
export class ChatTriggerService {
  sendMessage(input: SendChatMessageInput): Promise<SendChatMessageResult>;
  getSession(profileId: string, sessionId: string): AgentChatSession | null;
  listMessages(profileId: string, sessionId: string): AgentChatMessage[];
}
```

- [x] **Step 4: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/chat/chat-trigger-service.test.ts
npm run build
```

Expected: pass.

- [x] **Step 5: Commit**

```bash
git add server/src/core/nodes/handlers/trigger.ts server/src/core/modules/workflows/workflow-triggers.ts server/src/core/modules/agent-runtime/chat/chat-trigger-service.ts server/src/core/modules/agent-runtime/chat/chat-trigger-service.test.ts
git commit -m "feat: add chat trigger backend service"
```

### Task 17: Agent Chat Routes

**Files:**
- Create: `server/src/core/routes/agent-chat.routes.ts`
- Create: `server/src/core/routes/agent-chat.routes.test.ts`
- Modify: route registration file used by current server

- [ ] **Step 1: Write failing route tests**

Routes:
- `POST /agent-chat/:chatSlug/messages`
- `GET /agent-chat/sessions/:sessionId/messages`
- `GET /agent-tools`
- `GET /agent-memory`
- `POST /agent-memory`
- `DELETE /agent-memory/:memoryId`
- `POST /agent-approvals/:approvalId/approve`
- `POST /agent-approvals/:approvalId/reject`

Tests:
- public chat message returns session id and assistant response.
- invalid slug returns 404.
- invalid payload returns 400 without stack trace.
- tool list does not expose credentials.
- memory list is profile-scoped.
- approval endpoints require matching profile/execution.

Run:

```bash
cd server
node --test src/core/routes/agent-chat.routes.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement routes**

Use current Fastify route style. Every route must call service methods and serialize errors with `serializeAgentError`.

- [ ] **Step 3: Register routes**

Follow the existing route registration pattern in the server.

- [ ] **Step 4: Verify**

Run:

```bash
cd server
node --test src/core/routes/agent-chat.routes.test.ts
npm run build
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/core/routes/agent-chat.routes.ts server/src/core/routes/agent-chat.routes.test.ts server/src/core/server.ts
git commit -m "feat: expose agent chat routes"
```

### Task 18: Backend Integration Smoke

**Files:**
- Create: `server/src/core/routes/agent-chat-workflow.integration.test.ts`

- [ ] **Step 1: Write failing integration test**

Scenario:
1. Register fake OpenAI-compatible model provider.
2. Register fake plugin tool `notes_create`.
3. Create workflow with chat trigger, AI Agent, model node, memory node, and tool node.
4. Send first chat message.
5. Assert session is created.
6. Assert workflow execution exists.
7. Assert tool call event exists.
8. Send second chat message with same session.
9. Assert short-term memory used same thread id.

Run:

```bash
cd server
node --test src/core/routes/agent-chat-workflow.integration.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement missing glue only**

Fix only integration gaps. Do not add product scope.

- [ ] **Step 3: Verify backend focused suite**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/*.test.ts src/core/modules/agent-runtime/**/*.test.ts src/core/nodes/handlers/ai-agent.test.ts src/core/routes/agent-chat*.test.ts
npm run build
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add server/src/core/routes/agent-chat-workflow.integration.test.ts server/src/core/modules/agent-runtime server/src/core/modules/workflows server/src/core/nodes server/src/shared/models/workflow-types.ts
git commit -m "test: verify chat agent workflow"
```

### Task 19: Frontend API Contracts

**Files:**
- Create: `client-vue/src/features/agent-runtime/types/agent.types.ts`
- Create: `client-vue/src/core/api/agent-chat.api.ts`
- Create: `client-vue/src/core/api/agent-tools.api.ts`
- Modify: `client-vue/src/core/api/endpoints.ts`
- Create: `client-vue/src/core/api/agent-runtime.api.contract.test.ts`

- [ ] **Step 1: Write failing frontend API test**

Tests:
- endpoints expose chat message, session messages, tools, memory, approvals.
- `agentChatApi.sendMessage` exists.
- `agentChatApi.listSessionMessages` exists.
- `agentToolsApi.listTools` exists.
- type union includes memory scopes and side effects.

Run:

```bash
cd client-vue
node --test src/core/api/agent-runtime.api.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement types and APIs**

Mirror backend public contracts only. Do not expose internal LangGraph state.

- [ ] **Step 3: Verify**

Run:

```bash
cd client-vue
node --test src/core/api/agent-runtime.api.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/agent-runtime/types/agent.types.ts client-vue/src/core/api/agent-chat.api.ts client-vue/src/core/api/agent-tools.api.ts client-vue/src/core/api/endpoints.ts client-vue/src/core/api/agent-runtime.api.contract.test.ts
git commit -m "feat: add agent runtime frontend api"
```

### Task 20: Frontend Workflow Node Components

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/nodes/AiAgentNode.vue`
- Create: `client-vue/src/features/workflow-editor/components/nodes/AiModelNode.vue`
- Create: `client-vue/src/features/workflow-editor/components/nodes/AiMemoryNode.vue`
- Create: `client-vue/src/features/workflow-editor/components/nodes/AiToolNode.vue`
- Create: `client-vue/src/features/workflow-editor/components/nodes/ChatTriggerNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue`
- Create: `client-vue/src/features/workflow-editor/components/nodes/__tests__/agentNodes.contract.test.ts`

- [ ] **Step 1: Write failing node component test**

Tests:
- canvas registers all AI node components.
- AI Agent node shows provider/memory/tool counts from data.
- AI Model node shows provider/model.
- AI Memory node shows scope.
- AI Tool node shows plugin/method and side-effect badge.
- Chat Trigger node shows chat slug and auth mode.

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/nodes/__tests__/agentNodes.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement components**

Use existing `BaseNode.vue` and icon conventions. Keep components display-only; no API calls inside node views.

- [ ] **Step 3: Verify**

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/nodes/__tests__/agentNodes.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/nodes/AiAgentNode.vue client-vue/src/features/workflow-editor/components/nodes/AiModelNode.vue client-vue/src/features/workflow-editor/components/nodes/AiMemoryNode.vue client-vue/src/features/workflow-editor/components/nodes/AiToolNode.vue client-vue/src/features/workflow-editor/components/nodes/ChatTriggerNode.vue client-vue/src/features/workflow-editor/components/SailorWorkflowCanvas.vue client-vue/src/features/workflow-editor/components/nodes/__tests__/agentNodes.contract.test.ts
git commit -m "feat: add ai workflow node components"
```

### Task 21: Add Node Panel and Node Previews

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/nodeInspectorPreview.ts`
- Create: `client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`

- [ ] **Step 1: Write failing add-node test**

Tests:
- AddNodePanel has AI category.
- AI category includes AI Agent, AI Model, AI Memory, AI Tool, Chat Trigger.
- default AI Agent config uses safe limits.
- default AI Tool requires approval for write/delete.
- previews mention provider, memory, tools, and chat.

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement add-node entries**

Add defaults that match backend validation:

```ts
{
  type: "ai-agent",
  name: "AI Agent",
  prompt: "You are a helpful workflow agent. Use tools only when needed.",
  maxIterations: 8,
  maxToolCalls: 12,
  timeoutMs: 180000,
  requireApprovalForSideEffects: ["write", "delete", "external-message", "external-payment", "filesystem"],
  outputMode: "text"
}
```

- [ ] **Step 3: Verify**

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue client-vue/src/features/workflow-editor/components/settings/nodeInspectorPreview.ts client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts
git commit -m "feat: add ai nodes to workflow palette"
```

### Task 22: Node Editors

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/AiAgentEditor.vue`
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/AiModelEditor.vue`
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/AiMemoryEditor.vue`
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/AiToolEditor.vue`
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/ChatTriggerEditor.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/index.ts`
- Create: `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts`

- [ ] **Step 1: Write failing editor contract tests**

Tests:
- editor registry maps each AI node to an editor.
- agent editor exposes prompt, max iterations, max tool calls, timeout, output mode.
- model editor exposes provider, model, temperature, max tokens, credential selector placeholder.
- memory editor exposes scope, read/write toggles, retrieval limit.
- tool editor loads tool picker and side-effect policy.
- chat trigger editor exposes slug, title, auth mode, session mode, rate limit.

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement editors**

Use existing `EditorField`, `ExpressionInput`, `ExpressionTextarea`, shared base inputs, toggles, and select controls. Do not invent a new form system.

- [ ] **Step 3: Verify**

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/settings/editors/AiAgentEditor.vue client-vue/src/features/workflow-editor/components/settings/editors/AiModelEditor.vue client-vue/src/features/workflow-editor/components/settings/editors/AiMemoryEditor.vue client-vue/src/features/workflow-editor/components/settings/editors/AiToolEditor.vue client-vue/src/features/workflow-editor/components/settings/editors/ChatTriggerEditor.vue client-vue/src/features/workflow-editor/components/settings/editors/index.ts client-vue/src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts
git commit -m "feat: add ai node editors"
```

### Task 23: Agent Tool Picker

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/agent/AgentToolPicker.vue`
- Create: `client-vue/src/features/workflow-editor/components/agent/__tests__/AgentToolPicker.contract.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/AiToolEditor.vue`

- [ ] **Step 1: Write failing tool picker tests**

Tests:
- calls `agentToolsApi.listTools`.
- filters by plugin, method name, description.
- shows input schema preview.
- shows side-effect badge.
- shows approval requirement.
- emits selected pluginId/methodId.
- never renders credential values.

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/AgentToolPicker.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement tool picker**

Keep as a pure UI component with API call isolated in a small loading function. Emit selection to editor.

- [ ] **Step 3: Verify**

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/AgentToolPicker.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/agent/AgentToolPicker.vue client-vue/src/features/workflow-editor/components/agent/__tests__/AgentToolPicker.contract.test.ts client-vue/src/features/workflow-editor/components/settings/editors/AiToolEditor.vue
git commit -m "feat: add agent tool picker"
```

### Task 24: Memory Scope Picker and Memory Admin UI

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/agent/AgentMemoryScopePicker.vue`
- Create: `client-vue/src/features/workflow-editor/components/agent/AgentMemoryAdminPanel.vue`
- Create: `client-vue/src/features/workflow-editor/components/agent/__tests__/AgentMemory.contract.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/AiMemoryEditor.vue`

- [ ] **Step 1: Write failing memory UI tests**

Tests:
- scope picker includes none/session/workflow/profile/user.
- write toggle is disabled when scope is none/session.
- admin panel lists memories from API.
- delete emits API call.
- memory value preview is truncated.

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/AgentMemory.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement components**

Use existing panel/modal patterns. Keep memory admin behind explicit UI; do not auto-open inside normal node editing.

- [ ] **Step 3: Verify**

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/AgentMemory.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/agent/AgentMemoryScopePicker.vue client-vue/src/features/workflow-editor/components/agent/AgentMemoryAdminPanel.vue client-vue/src/features/workflow-editor/components/agent/__tests__/AgentMemory.contract.test.ts client-vue/src/features/workflow-editor/components/settings/editors/AiMemoryEditor.vue
git commit -m "feat: add agent memory controls"
```

### Task 25: Chat Session Panel

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue`
- Create: `client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`
- Modify: `client-vue/src/features/workflow-editor/utils/workflowRunTrigger.ts`

- [ ] **Step 1: Write failing chat UI tests**

Tests:
- panel sends message through `agentChatApi.sendMessage`.
- shows user and assistant messages.
- preserves session id for follow-up.
- disables send while pending.
- shows safe error.
- workflow run trigger recognizes chat trigger and opens chat panel mode.

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts src/features/workflow-editor/utils/__tests__/workflowRunTrigger.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement panel**

Keep it a test/debug chat surface inside workflow editor. Public embeddable chat for Sailor Pages can be a later feature.

- [ ] **Step 3: Verify**

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts src/features/workflow-editor/utils/__tests__/workflowRunTrigger.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts client-vue/src/features/workflow-editor/utils/workflowRunTrigger.ts
git commit -m "feat: add chat trigger test panel"
```

### Task 26: Agent Trace and Execution Timeline

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/agent/AgentTracePanel.vue`
- Create: `client-vue/src/features/workflow-editor/components/agent/__tests__/AgentTracePanel.contract.test.ts`
- Modify: `client-vue/src/features/workflow-editor/stores/execution.store.ts`
- Modify: `client-vue/src/features/workflow-editor/components/execution/ExecutionLogsPanel.vue`

- [ ] **Step 1: Write failing trace tests**

Tests:
- execution store accepts `agent:*` event types.
- trace panel groups model calls, tool calls, memory operations, approvals, and errors.
- trace panel redacts secret-like fields.
- large payloads are collapsed by default.
- tool failure displays retry/error state.

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/AgentTracePanel.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement trace panel**

Use quiet operational UI, not marketing cards. Make it dense and scannable because this is a debugging tool.

- [ ] **Step 3: Wire execution logs**

Add an Agent tab or section inside existing execution UI. Keep existing logs unchanged.

- [ ] **Step 4: Verify**

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/AgentTracePanel.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/agent/AgentTracePanel.vue client-vue/src/features/workflow-editor/components/agent/__tests__/AgentTracePanel.contract.test.ts client-vue/src/features/workflow-editor/stores/execution.store.ts client-vue/src/features/workflow-editor/components/execution/ExecutionLogsPanel.vue
git commit -m "feat: show agent execution traces"
```

### Task 27: Human Approval UI

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/agent/AgentApprovalPanel.vue`
- Create: `client-vue/src/features/workflow-editor/components/agent/__tests__/AgentApprovalPanel.contract.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/agent/AgentTracePanel.vue`

- [ ] **Step 1: Write failing approval UI tests**

Tests:
- pending approval shows tool name, side-effect, sanitized args.
- approve calls API.
- reject calls API with reason.
- approval panel never shows credentials.
- after approval result, trace refresh action is emitted.

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/AgentApprovalPanel.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement approval panel**

Use existing confirm/panel components if available. Keep controls explicit: approve and reject only.

- [ ] **Step 3: Verify**

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/AgentApprovalPanel.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/agent/AgentApprovalPanel.vue client-vue/src/features/workflow-editor/components/agent/__tests__/AgentApprovalPanel.contract.test.ts client-vue/src/features/workflow-editor/components/agent/AgentTracePanel.vue
git commit -m "feat: add agent tool approval ui"
```

### Task 28: Security Hardening Backend

**Files:**
- Create: `server/src/core/modules/agent-runtime/agent-security.test.ts`
- Modify: agent runtime files as required by failing tests

- [ ] **Step 1: Write failing attack tests**

Attack cases:
- user message attempts to force tool to reveal credential.
- model returns tool args with 1000 keys.
- model returns deeply nested tool args.
- tool result contains `authorization` and is redacted in events.
- chat session id from another profile is rejected.
- memory write tries to store API key.
- public chat origin outside allowlist is rejected.
- destructive tool without approval returns waiting approval.
- `thread_id` is never accepted raw from request body.

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/agent-security.test.ts
```

Expected: fail until hardening is complete.

- [ ] **Step 2: Implement hardening**

Fix only through central validators, policy modules, repositories, and service guards. Do not scatter one-off checks in routes.

- [ ] **Step 3: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/agent-security.test.ts src/core/modules/agent-runtime/**/*.test.ts src/core/routes/agent-chat*.test.ts
npm run build
npm audit --omit=dev
```

Expected: pass, audit has no high/critical runtime issue.

- [ ] **Step 4: Commit**

```bash
git add server/src/core/modules/agent-runtime/agent-security.test.ts server/src/core/modules/agent-runtime server/src/core/routes/agent-chat.routes.ts
git commit -m "test: harden agent runtime security"
```

### Task 29: Frontend Safety and Usability Polish

**Files:**
- Modify: `client-vue/src/features/workflow-editor/styles/agent.css`
- Modify: AI components and editors as required
- Create: `client-vue/src/features/workflow-editor/components/agent/__tests__/AgentSafetyUx.contract.test.ts`

- [ ] **Step 1: Write failing UX safety tests**

Tests:
- destructive side effects render danger badges.
- approval-required tools cannot hide approval state.
- memory write-enabled state is visibly indicated.
- public chat trigger shows rate limit/auth warning text.
- long schema preview collapses.
- all icon-only buttons have accessible labels.

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/AgentSafetyUx.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement polish**

Use existing tokens. No nested cards. Keep workflow editor dense and operational.

- [ ] **Step 3: Verify**

Run:

```bash
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/AgentSafetyUx.contract.test.ts
npm run type-check
npm run build-only
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/workflow-editor/styles/agent.css client-vue/src/features/workflow-editor/components/agent client-vue/src/features/workflow-editor/components/settings/editors client-vue/src/features/workflow-editor/components/agent/__tests__/AgentSafetyUx.contract.test.ts
git commit -m "fix: polish agent safety ux"
```

### Task 30: Documentation and Feature Map Completion

**Files:**
- Modify: `feats-map/agent-tools-chat-trigger-memory.md`
- Create: `docs/agent-runtime.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Write docs**

`docs/agent-runtime.md` must include:
- architecture overview.
- memory architecture.
- plugin tool metadata guide.
- security model.
- how Chat Trigger maps to sessions and workflow executions.
- how to debug agent runs.
- anti-patterns: raw prompt memory, unapproved destructive tools, plugin core imports.

- [ ] **Step 2: Update feature map**

Mark completed tasks in `feats-map/agent-tools-chat-trigger-memory.md`.

- [ ] **Step 3: Update roadmap**

Add a short roadmap entry:

```md
- Agent Tools foundation:
  - Chat Trigger
  - AI Agent / Model / Memory / Tool nodes
  - Plugin method tool adapter
  - Persistent short-term and long-term memory
  - Tool approvals and execution trace
```

- [ ] **Step 4: Verify docs references**

Run:

```bash
git diff -- docs/agent-runtime.md feats-map/agent-tools-chat-trigger-memory.md ROADMAP.md
```

Expected: docs are specific, no placeholder language.

- [ ] **Step 5: Commit**

```bash
git add docs/agent-runtime.md feats-map/agent-tools-chat-trigger-memory.md ROADMAP.md
git commit -m "docs: document agent runtime architecture"
```

### Task 31: Full Verification

**Files:**
- Modify only files required by failed checks.

- [ ] **Step 1: Run backend agent suite**

```bash
cd server
node --test src/core/modules/agent-runtime/*.test.ts src/core/modules/agent-runtime/**/*.test.ts src/core/nodes/handlers/ai-agent.test.ts src/core/modules/workflows/agent-config-node-execution.test.ts src/core/routes/agent-chat*.test.ts
```

Expected: pass.

- [ ] **Step 2: Run backend full build**

```bash
cd server
npm run build
npm audit --omit=dev
```

Expected: build passes; audit has no high/critical runtime issue.

- [ ] **Step 3: Run frontend agent suite**

```bash
cd client-vue
node --test src/core/api/agent-runtime.api.contract.test.ts src/features/workflow-editor/components/agent/**/*.test.ts src/features/workflow-editor/components/nodes/__tests__/agentNodes.contract.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts
```

Expected: pass.

- [ ] **Step 4: Run frontend checks**

```bash
cd client-vue
npm run type-check
npm run build-only
```

Expected: pass. Existing chunk warnings are acceptable if exit code is 0.

- [ ] **Step 5: Manual smoke**

Start server and client:

```bash
cd server
npm run dev
cd ../client-vue
npm run dev
```

Smoke:
- create workflow.
- add Chat Trigger.
- add AI Agent.
- attach AI Model.
- attach Session Memory.
- attach one safe read tool.
- publish workflow.
- send chat message.
- confirm response appears.
- send follow-up message.
- confirm session memory works.
- attach write tool with approval.
- confirm execution pauses for approval.
- approve tool.
- confirm execution resumes.
- inspect Agent Trace panel.
- confirm no credentials appear in UI/logs.

- [ ] **Step 6: Commit stabilization**

```bash
git add server/src/core/modules/agent-runtime server/src/core/nodes server/src/core/routes/agent-chat.routes.ts server/src/shared/models/workflow-types.ts client-vue/src/features/agent-runtime client-vue/src/core/api client-vue/src/features/workflow-editor
git commit -m "fix: stabilize agent runtime"
```

---

## Safety Checklist

- [ ] Plugins do not import core/engines/other plugins.
- [ ] Only core adapts plugin methods into tools.
- [ ] Agent tools require explicit metadata.
- [ ] Tool input is schema validated.
- [ ] Tool payload size/depth/key count is limited.
- [ ] Tool result size is limited and redacted in events.
- [ ] Destructive/external-message/filesystem/payment tools require approval by default.
- [ ] Model API keys are loaded from credential store only.
- [ ] Model API keys never appear in logs, events, routes, or UI.
- [ ] Public chat routes enforce slug validation, origin policy, and rate limit.
- [ ] Chat session ownership is profile-scoped.
- [x] LangGraph thread id is derived from validated Sailor session id.
- [ ] Request body cannot override LangGraph thread id.
- [x] Short-term memory is checkpointer-backed, not prompt concatenation.
- [ ] Long-term memory writes pass policy.
- [ ] Memory admin can delete stored memories.
- [ ] Backend returns safe public errors without stack traces.
- [ ] Tests use fake models/tools except explicit manual smoke.
- [ ] Dependency versions are audited before release.

## Stability Checklist

- [ ] Agent can run without tools.
- [ ] Agent can run with read tools.
- [ ] Agent pauses for sensitive write tools.
- [ ] Approval resumes the right execution/session only.
- [ ] Failed model call emits clear event.
- [ ] Failed tool call emits clear event.
- [ ] Timeout stops agent run safely.
- [ ] Max iterations prevents infinite loops.
- [ ] Max tool calls prevents tool spam.
- [ ] Session follow-up uses same checkpointer thread.
- [ ] Workflow execution timeline remains readable.
- [ ] Existing plugin node execution still works.
- [ ] Existing triggers still work.
- [ ] Existing Pages feature still builds.
- [ ] Existing Plugin Creator dirty work is not reverted.

## Self-Review

- Spec coverage: plan includes dependencies, contracts, runtime, tool adapter, model provider, short-term memory, long-term memory, chat trigger, routes, UI, approvals, traces, security, docs, and verification.
- Placeholder scan: no unresolved placeholder commands remain in the plan.
- Type consistency: node type names use `ai-agent`, `ai-model`, `ai-memory`, `ai-tool`, and chat trigger uses `WorkflowTrigger.type === "chat"`.
- Scope check: this is large but still one coherent platform feature because every subsystem is required for a production-quality Agent Tools foundation. RAG ingestion and multi-agent orchestration are intentionally excluded.
