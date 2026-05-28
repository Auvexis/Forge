# Global Agent Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a global published-agent chat panel where users can discover, open, chat with, and manage conversations for eligible agents from published workflows across profiles.

**Architecture:** Add a backend Agent Directory that scans published workflows and returns eligible `Chat Trigger -> AI Agent -> Chat Model` entries. Add agent-scoped chat sessions on top of the existing chat runtime, then expose a dedicated Vue page that treats published agent chat as a product surface instead of a Workflow Editor test path.

**Tech Stack:** Node/Fastify backend, better-sqlite3 migrations, existing workflow engine and agent runtime, Vue 3 + Pinia frontend, vue3-emoji-picker via existing `ProfileAvatarPicker`, source-contract tests, `node --test`, `vue-tsc`, Vite.

---

## Scope Decisions

- Build the full global agent panel now, not a throwaway tester.
- Keep the Workflow Editor chat as dev/test only. Published chat belongs in the global panel.
- Do not call chat transcript "long memory". Transcript is chat history. Long-term memory remains owned by `AI Memory` nodes.
- Agent eligibility is graph-based:
  - workflow is published/active;
  - reachable Chat Trigger has `chatSlug`;
  - reachable AI Agent exists;
  - AI Agent has a connected AI Model config node;
  - entry is scoped by profile.
- Stable agent key format:

```ts
type PublishedAgentKey = `${string}:${string}:${string}:${string}`;
// profileId:workflowId:triggerNodeId:agentNodeId
```

- Global panel executes a selected agent, not an ambiguous whole workflow fan-out. The backend must pass `targetAgentNodeId` through the chat execution path and the workflow engine must stop after that agent node succeeds.

---

## File Map

### Backend

- Create: `server/src/core/modules/agent-runtime/directory/published-agent-directory.ts`
  - Discovers eligible published agents inside one profile scope.
- Create: `server/src/core/modules/agent-runtime/directory/published-agent-directory.test.ts`
  - Tests graph eligibility and multi-agent discovery.
- Modify: `server/src/shared/models/workflow-types.ts`
  - Adds public agent metadata fields to AI Agent nodes.
- Modify: `server/src/core/modules/agent-runtime/agent-types.ts`
  - Adds optional public agent metadata to config if needed by runtime events.
- Modify: `server/src/core/nodes/handlers/ai-agent.ts`
  - Preserves metadata from workflow node to runtime input when useful.
- Create: `server/src/core/database/migrations/workflows/006_agent_panel_sessions.ts`
  - Adds `agent_node_id`, `agent_key`, and indexes to chat sessions.
- Modify: `server/src/core/modules/agent-runtime/chat/chat-session-repository.ts`
  - Supports agent-scoped sessions and delete.
- Modify: `server/src/core/modules/agent-runtime/chat/chat-message-repository.ts`
  - Supports message listing by session and cascade behavior remains unchanged.
- Create: `server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.ts`
  - Owns global panel session creation, message send, delete, rename.
- Create: `server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts`
  - Tests session ownership, history, target agent routing, delete behavior.
- Create: `server/src/core/routes/agent-panel.routes.ts`
  - Provides agent directory and chat session routes.
- Create: `server/src/core/routes/agent-panel.routes.test.ts`
  - Route contract tests.
- Modify: `server/src/core/routes/index.ts` or server route registration file currently registering routes.
  - Registers `agent-panel.routes.ts`.
- Modify: `server/src/core/modules/workflows/executor.ts`
  - Adds optional execution target support for chat panel runs.
- Modify: `server/src/core/modules/workflows/executor.test.ts`
  - Tests targeted execution stops after selected agent.

### Frontend

- Modify: `client-vue/src/core/types/workflow.types.ts`
  - Adds `agentDisplayName`, `agentEmoji`, `agentDescription`.
- Create: `client-vue/src/features/agent-panel/types/agent-panel.types.ts`
  - Agent card, session, message, request/response types.
- Create: `client-vue/src/core/api/agent-panel.api.ts`
  - Frontend API client for global agent panel.
- Create: `client-vue/src/core/api/agent-panel.api.contract.test.ts`
  - Source contract for endpoints and payloads.
- Modify: `client-vue/src/core/api/endpoints.ts`
  - Adds agent panel endpoints.
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/AiAgentEditor.vue`
  - Adds public name, emoji, description controls.
- Create or reuse: `client-vue/src/features/profiles/components/ProfileAvatarPicker.vue`
  - Reuse for agent emoji selection.
- Create: `client-vue/src/app/pages/AgentPanelPage.vue`
  - Page-level layout.
- Create: `client-vue/src/features/agent-panel/components/AgentDirectoryList.vue`
  - Left agent list.
- Create: `client-vue/src/features/agent-panel/components/AgentSessionList.vue`
  - Middle session list.
- Create: `client-vue/src/features/agent-panel/components/AgentChatView.vue`
  - Right chat panel.
- Create: `client-vue/src/features/agent-panel/components/AgentChatComposer.vue`
  - Composer and send state.
- Create: `client-vue/src/features/agent-panel/stores/agentPanel.store.ts`
  - Loads agents, sessions, messages, send state, delete state.
- Create: `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
  - Source contracts for layout, store actions, and non-editor published chat path.
- Modify: `client-vue/src/app/router.ts`
  - Adds `/agents`.
- Modify: `client-vue/src/app/App.vue` or current navigation/sidebar component.
  - Adds navigation entry for Agents.
- Modify: `client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue`
  - Remove or clearly block published fallback from editor chat.

### Docs and Tracking

- Modify: `feats-map/global-agent-panel.md`
  - Track completed tasks.
- Modify: `docs/agent-runtime.md`
  - Document agent directory, chat transcript vs long-term memory, and panel route rules.

---

## Task 1: Backend Agent Directory Discovery

**Files:**
- Create: `server/src/core/modules/agent-runtime/directory/published-agent-directory.ts`
- Create: `server/src/core/modules/agent-runtime/directory/published-agent-directory.test.ts`
- Modify: `docs/agent-runtime.md`

- [ ] **Step 1: Write failing tests for eligible agent discovery**

Create `server/src/core/modules/agent-runtime/directory/published-agent-directory.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listPublishedAgentsForProfile } from "./published-agent-directory.ts";
import type { WorkflowItem } from "../../../../../shared/models/workflow-types.ts";

describe("published agent directory", () => {
  it("lists one agent for a published Chat Trigger -> AI Agent -> AI Model path", () => {
    const agents = listPublishedAgentsForProfile("profile_a", [workflowFixture()]);

    assert.deepEqual(agents.map((agent) => ({
      key: agent.key,
      profileId: agent.profileId,
      workflowId: agent.workflowId,
      triggerNodeId: agent.triggerNodeId,
      agentNodeId: agent.agentNodeId,
      chatSlug: agent.chatSlug,
      name: agent.name,
      emoji: agent.emoji,
    })), [{
      key: "profile_a:workflow_agent:chat_trigger:agent",
      profileId: "profile_a",
      workflowId: "workflow_agent",
      triggerNodeId: "chat_trigger",
      agentNodeId: "agent",
      chatSlug: "support-agent",
      name: "Support Agent",
      emoji: "🤖",
    }]);
  });

  it("does not list draft, inactive, missing-slug, missing-model, or unreachable agents", () => {
    const draft = workflowFixture({ metadata: { ...workflowFixture().metadata, isDraft: true } });
    const inactive = workflowFixture({ metadata: { ...workflowFixture().metadata, isActive: false } });
    const noSlug = workflowFixture({
      nodes: {
        ...workflowFixture().nodes,
        chat_trigger: {
          ...workflowFixture().nodes.chat_trigger,
          trigger: { type: "chat" },
        } as any,
      },
    });
    const noModel = workflowFixture({
      edges: [{ id: "trigger-agent", source: "chat_trigger", target: "agent" }],
    });

    assert.equal(listPublishedAgentsForProfile("profile_a", [draft, inactive, noSlug, noModel]).length, 0);
  });

  it("lists multiple reachable agents from one published workflow", () => {
    const workflow = workflowFixture({
      nodes: {
        ...workflowFixture().nodes,
        agent_two: {
          type: "ai-agent",
          name: "Billing Agent",
          agentDisplayName: "Billing Agent",
          agentEmoji: "💳",
          prompt: "Help with billing.",
          maxIterations: 4,
          maxToolCalls: 4,
          timeoutMs: 30000,
          requireApprovalForSideEffects: ["write", "delete", "external-message", "external-payment"],
          outputMode: "text",
        } as any,
      },
      edges: [
        ...workflowFixture().edges,
        { id: "trigger-agent-two", source: "chat_trigger", target: "agent_two" },
        { id: "model-agent-two", source: "model", target: "agent_two" },
      ],
    });

    const agents = listPublishedAgentsForProfile("profile_a", [workflow]);

    assert.deepEqual(agents.map((agent) => agent.agentNodeId), ["agent", "agent_two"]);
  });
});

function workflowFixture(overrides: Partial<WorkflowItem> = {}): WorkflowItem {
  return {
    metadata: {
      id: "workflow_agent",
      name: "Agent Workflow",
      version: "1",
      isActive: true,
      isDraft: false,
      public: false,
      createdAt: new Date(0).toISOString(),
    },
    trigger: { type: "manual" },
    nodes: {
      chat_trigger: {
        type: "trigger",
        name: "Chat",
        trigger: {
          type: "chat",
          chatSlug: "support-agent",
          chatTitle: "Support",
          chatAuthMode: "profile",
          chatSessionMode: "resume-by-session-id",
          chatRateLimitPerMinute: 30,
        },
      },
      agent: {
        type: "ai-agent",
        name: "Agent",
        agentDisplayName: "Support Agent",
        agentEmoji: "🤖",
        agentDescription: "Answers support questions.",
        prompt: "Help users.",
        maxIterations: 4,
        maxToolCalls: 4,
        timeoutMs: 30000,
        requireApprovalForSideEffects: ["write", "delete", "external-message", "external-payment"],
        outputMode: "text",
      } as any,
      model: {
        type: "ai-model",
        name: "Model",
        pluginId: "openai",
        adapter: "openai-compatible",
        model: "gpt-test",
        temperature: 0,
      },
    },
    edges: [
      { id: "trigger-agent", source: "chat_trigger", target: "agent" },
      { id: "model-agent", source: "model", target: "agent" },
    ],
    ...overrides,
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/directory/published-agent-directory.test.ts
```

Expected: FAIL because `published-agent-directory.ts` does not exist.

- [ ] **Step 3: Implement directory discovery**

Create `server/src/core/modules/agent-runtime/directory/published-agent-directory.ts`:

```ts
import type { WorkflowItem, WorkflowNode } from "../../../../shared/models/workflow-types.ts";

export interface PublishedAgentSummary {
  key: string;
  profileId: string;
  workflowId: string;
  workflowName: string;
  triggerNodeId: string;
  agentNodeId: string;
  chatSlug: string;
  chatTitle: string;
  name: string;
  emoji: string;
  description: string;
  modelNodeId: string;
}

export function listPublishedAgentsForProfile(
  profileId: string,
  workflows: WorkflowItem[],
): PublishedAgentSummary[] {
  return workflows.flatMap((workflow) => listWorkflowAgents(profileId, workflow));
}

function listWorkflowAgents(profileId: string, workflow: WorkflowItem): PublishedAgentSummary[] {
  if (!workflow.metadata.isActive || workflow.metadata.isDraft) return [];

  const adjacency = buildAdjacency(workflow.edges);
  const agents: PublishedAgentSummary[] = [];

  for (const [triggerNodeId, node] of Object.entries(workflow.nodes)) {
    if (node.type !== "trigger") continue;
    const trigger = node.trigger;
    if (trigger.type !== "chat") continue;
    const chatSlug = typeof trigger.chatSlug === "string" ? trigger.chatSlug.trim() : "";
    if (!chatSlug) continue;

    const reachable = collectReachable(triggerNodeId, adjacency);
    for (const agentNodeId of reachable) {
      const agentNode = workflow.nodes[agentNodeId];
      if (agentNode?.type !== "ai-agent") continue;
      const modelNodeId = findConnectedModelNodeId(workflow, agentNodeId);
      if (!modelNodeId) continue;

      agents.push({
        key: buildPublishedAgentKey(profileId, workflow.metadata.id, triggerNodeId, agentNodeId),
        profileId,
        workflowId: workflow.metadata.id,
        workflowName: workflow.metadata.name,
        triggerNodeId,
        agentNodeId,
        chatSlug,
        chatTitle: typeof trigger.chatTitle === "string" ? trigger.chatTitle : node.name,
        name: publicAgentName(agentNode),
        emoji: publicAgentEmoji(agentNode),
        description: publicAgentDescription(agentNode),
        modelNodeId,
      });
    }
  }

  return agents.sort((a, b) => a.name.localeCompare(b.name));
}

export function buildPublishedAgentKey(
  profileId: string,
  workflowId: string,
  triggerNodeId: string,
  agentNodeId: string,
): string {
  return [profileId, workflowId, triggerNodeId, agentNodeId].join(":");
}

function buildAdjacency(edges: WorkflowItem["edges"]): Record<string, string[]> {
  const adjacency: Record<string, string[]> = {};
  for (const edge of edges) {
    adjacency[edge.source] = [...(adjacency[edge.source] ?? []), edge.target];
  }
  return adjacency;
}

function collectReachable(startNodeId: string, adjacency: Record<string, string[]>): string[] {
  const queue = [...(adjacency[startNodeId] ?? [])];
  const seen = new Set<string>();
  while (queue.length) {
    const nodeId = queue.shift()!;
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);
    queue.push(...(adjacency[nodeId] ?? []));
  }
  return Array.from(seen);
}

function findConnectedModelNodeId(workflow: WorkflowItem, agentNodeId: string): string | null {
  const edge = workflow.edges.find((candidate) => {
    if (candidate.target !== agentNodeId) return false;
    const source = workflow.nodes[candidate.source];
    return source?.type === "ai-model";
  });
  return edge?.source ?? null;
}

function publicAgentName(node: WorkflowNode): string {
  const record = node as Record<string, unknown>;
  return stringValue(record.agentDisplayName) ?? stringValue(record.name) ?? "Agent";
}

function publicAgentEmoji(node: WorkflowNode): string {
  return stringValue((node as Record<string, unknown>).agentEmoji) ?? "🤖";
}

function publicAgentDescription(node: WorkflowNode): string {
  return stringValue((node as Record<string, unknown>).agentDescription) ?? "";
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/directory/published-agent-directory.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/src/core/modules/agent-runtime/directory/published-agent-directory.ts server/src/core/modules/agent-runtime/directory/published-agent-directory.test.ts docs/agent-runtime.md feats-map/global-agent-panel.md
git commit -m "feat: discover published chat agents"
```

---

## Task 2: Agent Node Public Metadata

**Files:**
- Modify: `server/src/shared/models/workflow-types.ts`
- Modify: `client-vue/src/core/types/workflow.types.ts`
- Modify: `client-vue/src/features/agent-runtime/types/agent.types.ts`
- Modify: `server/src/core/nodes/handlers/ai-agent.test.ts`
- Modify: `server/src/core/nodes/handlers/ai-agent.ts`

- [ ] **Step 1: Write failing backend metadata preservation test**

In `server/src/core/nodes/handlers/ai-agent.test.ts`, extend the existing AI Agent handler test to assert metadata:

```ts
assert.equal((runCall.agent as any).agentDisplayName, "Support Agent");
assert.equal((runCall.agent as any).agentEmoji, "🤖");
assert.equal((runCall.agent as any).agentDescription, "Answers support questions.");
```

Update the `workflowFixture()` agent node used by that test:

```ts
agentDisplayName: "Support Agent",
agentEmoji: "🤖",
agentDescription: "Answers support questions.",
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd server
node --test src/core/nodes/handlers/ai-agent.test.ts
```

Expected: FAIL because `toAgentConfig()` does not include public metadata.

- [ ] **Step 3: Add metadata to shared/server/client types**

In `server/src/shared/models/workflow-types.ts`, `client-vue/src/core/types/workflow.types.ts`, and `client-vue/src/features/agent-runtime/types/agent.types.ts`, add optional fields to the AI Agent node/config shape:

```ts
agentDisplayName?: string;
agentEmoji?: string;
agentDescription?: string;
```

- [ ] **Step 4: Preserve metadata in AI Agent handler**

In `server/src/core/nodes/handlers/ai-agent.ts`, update `toAgentConfig()`:

```ts
function toAgentConfig(node: AiAgentNode): AiAgentNodeConfig {
  return {
    type: "ai-agent",
    name: node.name,
    agentDisplayName: node.agentDisplayName,
    agentEmoji: node.agentEmoji,
    agentDescription: node.agentDescription,
    prompt: node.prompt,
    maxIterations: node.maxIterations,
    maxToolCalls: node.maxToolCalls,
    timeoutMs: node.timeoutMs,
    requireApprovalForSideEffects: node.requireApprovalForSideEffects,
    outputMode: node.outputMode,
    outputSchema: node.outputSchema,
  };
}
```

- [ ] **Step 5: Run test and builds**

Run:

```powershell
cd server
node --test src/core/nodes/handlers/ai-agent.test.ts
npm run build
cd ../client-vue
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add server/src/shared/models/workflow-types.ts server/src/core/nodes/handlers/ai-agent.ts server/src/core/nodes/handlers/ai-agent.test.ts client-vue/src/core/types/workflow.types.ts client-vue/src/features/agent-runtime/types/agent.types.ts feats-map/global-agent-panel.md
git commit -m "feat: add public agent metadata"
```

---

## Task 3: Agent-Scoped Chat Session Schema

**Files:**
- Create: `server/src/core/database/migrations/workflows/006_agent_panel_sessions.ts`
- Modify: migration registry if migrations are explicitly listed.
- Modify: `server/src/core/modules/agent-runtime/chat/chat-session-repository.ts`
- Modify: `server/src/core/modules/agent-runtime/agent-runtime-repositories.test.ts`

- [ ] **Step 1: Write failing repository test**

In `server/src/core/modules/agent-runtime/agent-runtime-repositories.test.ts`, add:

```ts
it("stores chat sessions with optional agent node identity", () => {
  const sessions = new ChatSessionRepository(db);

  const session = sessions.create({
    id: "chat_agent_1",
    profileId: "profile_a",
    workflowId: "workflow_agent",
    triggerNodeId: "chat_trigger",
    agentNodeId: "agent",
    agentKey: "profile_a:workflow_agent:chat_trigger:agent",
    title: "New chat",
    status: "active",
  });

  assert.equal(session.agentNodeId, "agent");
  assert.equal(session.agentKey, "profile_a:workflow_agent:chat_trigger:agent");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/agent-runtime-repositories.test.ts
```

Expected: FAIL because repository types and table columns do not support `agentNodeId` or `agentKey`.

- [ ] **Step 3: Add migration**

Create `server/src/core/database/migrations/workflows/006_agent_panel_sessions.ts`:

```ts
import type Database from "better-sqlite3";

export async function up(db: Database.Database): Promise<void> {
  const columns = db.prepare(`PRAGMA table_info(agent_chat_sessions)`).all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));

  if (!names.has("agent_node_id")) {
    db.prepare(`ALTER TABLE agent_chat_sessions ADD COLUMN agent_node_id TEXT`).run();
  }
  if (!names.has("agent_key")) {
    db.prepare(`ALTER TABLE agent_chat_sessions ADD COLUMN agent_key TEXT`).run();
  }

  db.prepare(`
    CREATE INDEX IF NOT EXISTS agent_chat_sessions_agent_lookup_idx
    ON agent_chat_sessions(profile_id, agent_key, updated_at DESC)
  `).run();
}

export async function down(_db: Database.Database): Promise<void> {
  // SQLite cannot drop columns safely without table rebuild. Leave columns in place.
}
```

- [ ] **Step 4: Update repository types and SQL**

In `server/src/core/modules/agent-runtime/chat/chat-session-repository.ts`, extend session types:

```ts
agentNodeId?: string;
agentKey?: string;
```

Update insert SQL columns:

```sql
(id, profile_id, workflow_id, trigger_node_id, agent_node_id, agent_key, title, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

Map row values:

```ts
agentNodeId: row.agent_node_id ?? undefined,
agentKey: row.agent_key ?? undefined,
```

- [ ] **Step 5: Run repository test**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/agent-runtime-repositories.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add server/src/core/database/migrations/workflows/006_agent_panel_sessions.ts server/src/core/modules/agent-runtime/chat/chat-session-repository.ts server/src/core/modules/agent-runtime/agent-runtime-repositories.test.ts feats-map/global-agent-panel.md
git commit -m "feat: store agent scoped chat sessions"
```

---

## Task 4: Agent Panel Chat Service

**Files:**
- Create: `server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.ts`
- Create: `server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts`
- Modify: `server/src/core/modules/agent-runtime/chat/chat-trigger-service.ts`

- [ ] **Step 1: Write failing service tests**

Create `server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts` with tests for:

```ts
it("creates a new session for a published agent key", async () => {
  const service = serviceFixture();
  const session = await service.createSession({
    profileId: "profile_a",
    agentKey: "profile_a:workflow_agent:chat_trigger:agent",
    title: "Support chat",
  });

  assert.equal(session.agentNodeId, "agent");
  assert.equal(session.agentKey, "profile_a:workflow_agent:chat_trigger:agent");
});

it("sends messages with targetAgentNodeId and previous transcript", async () => {
  const service = serviceFixture();
  const session = await service.createSession({
    profileId: "profile_a",
    agentKey: "profile_a:workflow_agent:chat_trigger:agent",
    title: "Support chat",
  });

  await service.sendMessage({ profileId: "profile_a", sessionId: session.id, message: "Boa noite" });
  await service.sendMessage({ profileId: "profile_a", sessionId: session.id, message: "What did I ask?" });

  assert.equal(executions[1].payload.targetAgentNodeId, "agent");
  assert.deepEqual(executions[1].payload.messages.map((message: any) => message.role), ["user", "assistant"]);
});

it("deletes a session and its transcript", async () => {
  const service = serviceFixture();
  const session = await service.createSession({
    profileId: "profile_a",
    agentKey: "profile_a:workflow_agent:chat_trigger:agent",
    title: "Support chat",
  });

  await service.deleteSession({ profileId: "profile_a", sessionId: session.id, memoryMode: "session" });

  assert.deepEqual(await service.listSessions({ profileId: "profile_a", agentKey: session.agentKey! }), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement service**

Create `agent-panel-chat-service.ts` with this public interface:

```ts
export interface CreateAgentPanelSessionInput {
  profileId: string;
  agentKey: string;
  title?: string;
}

export interface SendAgentPanelMessageInput {
  profileId: string;
  sessionId: string;
  message: string;
}

export interface DeleteAgentPanelSessionInput {
  profileId: string;
  sessionId: string;
  memoryMode: "session" | "transcript-only" | "all-agent-memory";
}

export class AgentPanelChatService {
  async listAgents(input: { profileId?: string; scope: "current" | "global" }): Promise<PublishedAgentSummary[]> {}
  async listSessions(input: { profileId: string; agentKey: string }): Promise<AgentChatSession[]> {}
  async createSession(input: CreateAgentPanelSessionInput): Promise<AgentChatSession> {}
  async listMessages(input: { profileId: string; sessionId: string }): Promise<AgentChatMessage[]> {}
  async sendMessage(input: SendAgentPanelMessageInput): Promise<{ session: AgentChatSession; messages: AgentChatMessage[]; execution: unknown }> {}
  async deleteSession(input: DeleteAgentPanelSessionInput): Promise<void> {}
}
```

Implementation rules:

- Resolve `agentKey` through `PublishedAgentDirectory` before creating/sending.
- Store `agentNodeId` and `agentKey` on sessions.
- Send `targetAgentNodeId` in trigger payload.
- Reuse `ChatMessageRepository` for transcript.
- Delete transcript through session cascade.
- Delete session-scoped memory only when `memoryMode === "session"` or `"all-agent-memory"`.
- Do not delete workflow/profile/user memory unless `memoryMode === "all-agent-memory"`.

- [ ] **Step 4: Run service test**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.ts server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts server/src/core/modules/agent-runtime/chat/chat-trigger-service.ts feats-map/global-agent-panel.md
git commit -m "feat: add agent panel chat service"
```

---

## Task 5: Agent Panel Routes

**Files:**
- Create: `server/src/core/routes/agent-panel.routes.ts`
- Create: `server/src/core/routes/agent-panel.routes.test.ts`
- Modify: route registration file used by the server bootstrap.

- [ ] **Step 1: Write failing route tests**

Create tests covering:

```ts
GET /agent-panel/agents?scope=current
GET /agent-panel/agents?scope=global
GET /agent-panel/agents/:agentKey/sessions
POST /agent-panel/agents/:agentKey/sessions
GET /agent-panel/sessions/:sessionId/messages
POST /agent-panel/sessions/:sessionId/messages
DELETE /agent-panel/sessions/:sessionId?memoryMode=session
```

Expected response envelope:

```ts
{
  status_code: 200,
  message: "Agent panel agents fetched",
  error: null,
  data: []
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd server
node --test src/core/routes/agent-panel.routes.test.ts
```

Expected: FAIL because route module does not exist.

- [ ] **Step 3: Implement routes**

Create `server/src/core/routes/agent-panel.routes.ts`:

```ts
import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { activeProfileRuntime } from "../profiles/active-profile-runtime.ts";
import { AgentPanelChatService } from "../modules/agent-runtime/chat/agent-panel-chat-service.ts";

export default async function agentPanelRoutes(fastify: FastifyInstance) {
  const service = new AgentPanelChatService();
  const getProfileId = () => activeProfileRuntime.activeProfileService.getActiveProfile()?.id ?? "default";

  fastify.get("/agent-panel/agents", async (req, reply) => {
    const query = req.query as { scope?: "current" | "global" };
    return sendResponse(reply, {
      status_code: 200,
      message: "Agent panel agents fetched",
      error: null,
      data: await service.listAgents({ profileId: getProfileId(), scope: query.scope ?? "current" }),
    });
  });

  // Add remaining routes using the same envelope pattern.
}

function sendResponse<T>(reply: FastifyReply, response: ApiResponse<T>) {
  return reply.code(response.status_code).send(response);
}
```

Complete all routes from Step 1 with explicit status codes:

- create session: `201`
- send message: `200`
- delete session: `200`
- invalid input: use existing `AgentRuntimeError` serialization pattern from `agent-chat.routes.ts`.

- [ ] **Step 4: Register route module**

In the server route registration file, add:

```ts
import agentPanelRoutes from "./agent-panel.routes.ts";
await app.register(agentPanelRoutes);
```

Use the actual local registration style used by neighboring route modules.

- [ ] **Step 5: Run route tests and build**

Run:

```powershell
cd server
node --test src/core/routes/agent-panel.routes.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add server/src/core/routes/agent-panel.routes.ts server/src/core/routes/agent-panel.routes.test.ts server/src/core/routes/index.ts feats-map/global-agent-panel.md
git commit -m "feat: expose agent panel routes"
```

---

## Task 6: Published-Agent Execution Targeting

**Files:**
- Modify: `server/src/core/modules/workflows/executor.ts`
- Modify: `server/src/core/modules/workflows/executor.test.ts`
- Modify: `server/src/core/modules/agent-runtime/chat/chat-trigger-service.ts`
- Modify: `server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.ts`

- [ ] **Step 1: Write failing targeted execution test**

In `server/src/core/modules/workflows/executor.test.ts`, add a workflow with one Chat Trigger and two AI Agent nodes. Assert that `targetNodeId: "agent_two"` executes only `agent_two`.

Expected context:

```ts
assert.equal(result.context.steps.agent_one, undefined);
assert.equal(result.context.steps.agent_two.status, "SUCCESS");
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd server
node --test src/core/modules/workflows/executor.test.ts
```

Expected: FAIL because executor does not accept targeted execution.

- [ ] **Step 3: Add target option**

Extend `WorkflowEngine.executeWorkflowFromTrigger` signature:

```ts
executeWorkflowFromTrigger: async (
  workflow: WorkflowItem,
  triggerNodeId: string,
  triggerPayload: any,
  executionId?: string,
  options: { targetNodeId?: string } = {},
): Promise<any> => {
```

After graph creation, restrict reachable nodes when `options.targetNodeId` exists:

```ts
const reachable = options.targetNodeId
  ? collectNodesOnPathsToTarget(triggerNodeId, options.targetNodeId, adjList)
  : collectReachableNodeIds(triggerNodeId, adjList);
```

Stop execution after target succeeds:

```ts
if (options.targetNodeId && nodeId === options.targetNodeId) {
  queue.length = 0;
  continue;
}
```

Implement `collectNodesOnPathsToTarget()` in the same file with tests.

- [ ] **Step 4: Pass target from agent panel service**

In `AgentPanelChatService.sendMessage()`, call workflow engine with:

```ts
await this.workflowEngine.executeWorkflowFromTrigger(
  agent.workflow,
  agent.triggerNodeId,
  payload,
  undefined,
  { targetNodeId: agent.agentNodeId },
);
```

- [ ] **Step 5: Run targeted tests**

Run:

```powershell
cd server
node --test src/core/modules/workflows/executor.test.ts src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add server/src/core/modules/workflows/executor.ts server/src/core/modules/workflows/executor.test.ts server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.ts feats-map/global-agent-panel.md
git commit -m "feat: target published agent execution"
```

---

## Task 7: Frontend API Contracts and Types

**Files:**
- Create: `client-vue/src/features/agent-panel/types/agent-panel.types.ts`
- Create: `client-vue/src/core/api/agent-panel.api.ts`
- Create: `client-vue/src/core/api/agent-panel.api.contract.test.ts`
- Modify: `client-vue/src/core/api/endpoints.ts`

- [ ] **Step 1: Write failing source contract test**

Create `client-vue/src/core/api/agent-panel.api.contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

describe("agent panel api contract", () => {
  it("exposes agent panel endpoints and api methods", () => {
    const endpoints = readFileSync("src/core/api/endpoints.ts", "utf8");
    const api = readFileSync("src/core/api/agent-panel.api.ts", "utf8");

    assert.match(endpoints, /AGENT_PANEL_AGENTS/);
    assert.match(endpoints, /AGENT_PANEL_AGENT_SESSIONS/);
    assert.match(endpoints, /AGENT_PANEL_SESSION_MESSAGES/);
    assert.match(api, /listAgents/);
    assert.match(api, /createSession/);
    assert.match(api, /sendMessage/);
    assert.match(api, /deleteSession/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd client-vue
node --test src/core/api/agent-panel.api.contract.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add endpoint constants**

In `client-vue/src/core/api/endpoints.ts`:

```ts
AGENT_PANEL_AGENTS: "/agent-panel/agents",
AGENT_PANEL_AGENT_SESSIONS: (agentKey: string) => `/agent-panel/agents/${encodeURIComponent(agentKey)}/sessions`,
AGENT_PANEL_SESSION_MESSAGES: (sessionId: string) => `/agent-panel/sessions/${encodeURIComponent(sessionId)}/messages`,
AGENT_PANEL_SESSION: (sessionId: string) => `/agent-panel/sessions/${encodeURIComponent(sessionId)}`,
```

- [ ] **Step 4: Add types**

Create `agent-panel.types.ts`:

```ts
import type { AgentChatMessage, AgentChatSession } from "@/features/agent-runtime/types/agent.types";

export interface PublishedAgentSummary {
  key: string;
  profileId: string;
  workflowId: string;
  workflowName: string;
  triggerNodeId: string;
  agentNodeId: string;
  chatSlug: string;
  chatTitle: string;
  name: string;
  emoji: string;
  description: string;
  modelNodeId: string;
}

export interface CreateAgentPanelSessionPayload {
  title?: string;
}

export interface SendAgentPanelMessagePayload {
  message: string;
}

export interface DeleteAgentPanelSessionPayload {
  memoryMode: "session" | "transcript-only" | "all-agent-memory";
}

export interface AgentPanelMessageResult {
  session: AgentChatSession;
  messages: AgentChatMessage[];
  execution: unknown;
}
```

- [ ] **Step 5: Add API client**

Create `client-vue/src/core/api/agent-panel.api.ts`:

```ts
import { apiRequest } from "./client";
import { ENDPOINTS } from "./endpoints";
import type {
  AgentPanelMessageResult,
  CreateAgentPanelSessionPayload,
  DeleteAgentPanelSessionPayload,
  PublishedAgentSummary,
  SendAgentPanelMessagePayload,
} from "@/features/agent-panel/types/agent-panel.types";
import type { AgentChatMessage, AgentChatSession } from "@/features/agent-runtime/types/agent.types";

export const agentPanelApi = {
  listAgents: (scope: "current" | "global" = "current") =>
    apiRequest<PublishedAgentSummary[]>(ENDPOINTS.AGENT_PANEL_AGENTS, { params: { scope } }),

  listSessions: (agentKey: string) =>
    apiRequest<AgentChatSession[]>(ENDPOINTS.AGENT_PANEL_AGENT_SESSIONS(agentKey)),

  createSession: (agentKey: string, payload: CreateAgentPanelSessionPayload = {}) =>
    apiRequest<AgentChatSession>(ENDPOINTS.AGENT_PANEL_AGENT_SESSIONS(agentKey), {
      method: "POST",
      body: payload,
    }),

  listMessages: (sessionId: string) =>
    apiRequest<AgentChatMessage[]>(ENDPOINTS.AGENT_PANEL_SESSION_MESSAGES(sessionId)),

  sendMessage: (sessionId: string, payload: SendAgentPanelMessagePayload) =>
    apiRequest<AgentPanelMessageResult>(ENDPOINTS.AGENT_PANEL_SESSION_MESSAGES(sessionId), {
      method: "POST",
      body: payload,
    }),

  deleteSession: (sessionId: string, payload: DeleteAgentPanelSessionPayload) =>
    apiRequest<{ sessionId: string }>(ENDPOINTS.AGENT_PANEL_SESSION(sessionId), {
      method: "DELETE",
      body: payload,
    }),
};
```

- [ ] **Step 6: Run contracts and build**

Run:

```powershell
cd client-vue
node --test src/core/api/agent-panel.api.contract.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add client-vue/src/features/agent-panel/types/agent-panel.types.ts client-vue/src/core/api/agent-panel.api.ts client-vue/src/core/api/agent-panel.api.contract.test.ts client-vue/src/core/api/endpoints.ts feats-map/global-agent-panel.md
git commit -m "feat: add agent panel frontend api"
```

---

## Task 8: Agent Metadata Editor UI

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/AiAgentEditor.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts`
- Reuse: `client-vue/src/features/profiles/components/ProfileAvatarPicker.vue`

- [ ] **Step 1: Write failing editor contract**

In `agentEditors.contract.test.ts`, assert:

```ts
assert.match(source, /agentDisplayName/);
assert.match(source, /agentEmoji/);
assert.match(source, /agentDescription/);
assert.match(source, /ProfileAvatarPicker/);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd client-vue
node --test src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add editor controls**

In `AiAgentEditor.vue`, add fields near the top:

```vue
<EditorField label="Agent Emoji">
  <ProfileAvatarPicker
    :model-value="(node.data.agentEmoji as string) || '🤖'"
    @update:model-value="updateNodeData({ agentEmoji: $event })"
  />
</EditorField>

<EditorField label="Public Agent Name">
  <BaseInput
    :model-value="(node.data.agentDisplayName as string) || (node.data.name as string) || ''"
    placeholder="Support Agent"
    @update:model-value="updateNodeData({ agentDisplayName: ($event as string) || undefined })"
  />
</EditorField>

<EditorField label="Public Description">
  <BaseTextarea
    :model-value="(node.data.agentDescription as string) || ''"
    placeholder="What this agent helps with"
    @update:model-value="updateNodeData({ agentDescription: ($event as string) || undefined })"
  />
</EditorField>
```

Use the existing textarea component name in this editor file. If no textarea component is imported, use the same one used by prompt editing in this file.

- [ ] **Step 4: Run frontend tests and build**

Run:

```powershell
cd client-vue
node --test src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add client-vue/src/features/workflow-editor/components/settings/editors/AiAgentEditor.vue client-vue/src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts feats-map/global-agent-panel.md
git commit -m "feat: edit public agent identity"
```

---

## Task 9: Global Agent Panel Shell

**Files:**
- Create: `client-vue/src/app/pages/AgentPanelPage.vue`
- Create: `client-vue/src/features/agent-panel/stores/agentPanel.store.ts`
- Create: `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- Modify: `client-vue/src/app/router.ts`
- Modify: app navigation component.

- [ ] **Step 1: Write failing contract**

Create `agentPanel.contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

describe("agent panel page contract", () => {
  it("registers the global agents route and page", () => {
    const router = readFileSync("src/app/router.ts", "utf8");
    assert.match(router, /AgentPanelPage/);
    assert.match(router, /path:\s*['"]\/agents['"]/);
  });

  it("renders three product columns", () => {
    const page = readFileSync("src/app/pages/AgentPanelPage.vue", "utf8");
    assert.match(page, /AgentDirectoryList/);
    assert.match(page, /AgentSessionList/);
    assert.match(page, /AgentChatView/);
  });
});
```

- [ ] **Step 2: Run contract to verify it fails**

Run:

```powershell
cd client-vue
node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add Pinia store skeleton**

Create `agentPanel.store.ts`:

```ts
import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { agentPanelApi } from "@/core/api/agent-panel.api";
import type { AgentChatMessage, AgentChatSession } from "@/features/agent-runtime/types/agent.types";
import type { PublishedAgentSummary } from "@/features/agent-panel/types/agent-panel.types";

export const useAgentPanelStore = defineStore("agent-panel", () => {
  const agents = ref<PublishedAgentSummary[]>([]);
  const sessions = ref<AgentChatSession[]>([]);
  const messages = ref<AgentChatMessage[]>([]);
  const selectedAgentKey = ref("");
  const selectedSessionId = ref("");
  const loading = ref(false);
  const sending = ref(false);
  const error = ref("");

  const selectedAgent = computed(() => agents.value.find((agent) => agent.key === selectedAgentKey.value) ?? null);
  const selectedSession = computed(() => sessions.value.find((session) => session.id === selectedSessionId.value) ?? null);

  async function loadAgents(scope: "current" | "global" = "current") {
    loading.value = true;
    error.value = "";
    try {
      agents.value = await agentPanelApi.listAgents(scope);
      selectedAgentKey.value = selectedAgentKey.value || agents.value[0]?.key || "";
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load agents";
    } finally {
      loading.value = false;
    }
  }

  return {
    agents,
    sessions,
    messages,
    selectedAgentKey,
    selectedSessionId,
    loading,
    sending,
    error,
    selectedAgent,
    selectedSession,
    loadAgents,
  };
});
```

- [ ] **Step 4: Add page shell**

Create `AgentPanelPage.vue` with three columns and no marketing hero:

```vue
<template>
  <main class="agent-panel-page">
    <AgentDirectoryList />
    <AgentSessionList />
    <AgentChatView />
  </main>
</template>

<script setup lang="ts">
import AgentDirectoryList from "@/features/agent-panel/components/AgentDirectoryList.vue";
import AgentSessionList from "@/features/agent-panel/components/AgentSessionList.vue";
import AgentChatView from "@/features/agent-panel/components/AgentChatView.vue";
</script>

<style scoped>
.agent-panel-page {
  display: grid;
  grid-template-columns: 280px 300px minmax(0, 1fr);
  min-height: calc(100vh - var(--app-header-height, 0px));
  background: var(--sailor-bg-page);
}
</style>
```

- [ ] **Step 5: Register route and nav**

In `router.ts`, add route:

```ts
{
  path: "/agents",
  name: "agents",
  component: () => import("@/app/pages/AgentPanelPage.vue"),
}
```

Add a sidebar/nav entry using the existing navigation pattern:

```ts
{ label: "Agents", icon: "bot", to: "/agents" }
```

- [ ] **Step 6: Run contract and build**

Run:

```powershell
cd client-vue
node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add client-vue/src/app/pages/AgentPanelPage.vue client-vue/src/features/agent-panel/stores/agentPanel.store.ts client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts client-vue/src/app/router.ts client-vue/src/app/App.vue feats-map/global-agent-panel.md
git commit -m "feat: add global agent panel shell"
```

---

## Task 10: Agent List and Session List UI

**Files:**
- Create: `client-vue/src/features/agent-panel/components/AgentDirectoryList.vue`
- Create: `client-vue/src/features/agent-panel/components/AgentSessionList.vue`
- Modify: `client-vue/src/features/agent-panel/stores/agentPanel.store.ts`
- Modify: `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`

- [ ] **Step 1: Add failing contracts for list behavior**

Extend test:

```ts
it("agent and session lists expose expected actions", () => {
  const directory = readFileSync("src/features/agent-panel/components/AgentDirectoryList.vue", "utf8");
  const sessions = readFileSync("src/features/agent-panel/components/AgentSessionList.vue", "utf8");
  const store = readFileSync("src/features/agent-panel/stores/agentPanel.store.ts", "utf8");

  assert.match(directory, /agent\.emoji/);
  assert.match(directory, /agent\.workflowName/);
  assert.match(sessions, /createSession/);
  assert.match(sessions, /deleteSession/);
  assert.match(store, /loadSessions/);
});
```

- [ ] **Step 2: Run contract to verify it fails**

Run:

```powershell
cd client-vue
node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement store actions**

Add actions:

```ts
async function selectAgent(agentKey: string) {
  selectedAgentKey.value = agentKey;
  selectedSessionId.value = "";
  await loadSessions(agentKey);
}

async function loadSessions(agentKey = selectedAgentKey.value) {
  if (!agentKey) {
    sessions.value = [];
    return;
  }
  sessions.value = await agentPanelApi.listSessions(agentKey);
  selectedSessionId.value = sessions.value[0]?.id ?? "";
  if (selectedSessionId.value) await loadMessages(selectedSessionId.value);
}

async function createSession(title = "New chat") {
  if (!selectedAgentKey.value) return;
  const session = await agentPanelApi.createSession(selectedAgentKey.value, { title });
  sessions.value = [session, ...sessions.value];
  selectedSessionId.value = session.id;
  messages.value = [];
}

async function deleteSession(sessionId: string, memoryMode: "session" | "transcript-only" | "all-agent-memory" = "session") {
  await agentPanelApi.deleteSession(sessionId, { memoryMode });
  sessions.value = sessions.value.filter((session) => session.id !== sessionId);
  if (selectedSessionId.value === sessionId) {
    selectedSessionId.value = sessions.value[0]?.id ?? "";
    messages.value = [];
    if (selectedSessionId.value) await loadMessages(selectedSessionId.value);
  }
}
```

- [ ] **Step 4: Implement list components**

`AgentDirectoryList.vue` must render:

- emoji button/avatar;
- agent name;
- workflow name;
- profile id;
- empty state when no agents.

`AgentSessionList.vue` must render:

- new chat button with `plus` icon;
- session rows;
- delete icon button;
- selected state.

- [ ] **Step 5: Run contract and build**

Run:

```powershell
cd client-vue
node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add client-vue/src/features/agent-panel/components/AgentDirectoryList.vue client-vue/src/features/agent-panel/components/AgentSessionList.vue client-vue/src/features/agent-panel/stores/agentPanel.store.ts client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts feats-map/global-agent-panel.md
git commit -m "feat: list published agents and chats"
```

---

## Task 11: Chat Composer and Message UX

**Files:**
- Create: `client-vue/src/features/agent-panel/components/AgentChatView.vue`
- Create: `client-vue/src/features/agent-panel/components/AgentChatComposer.vue`
- Modify: `client-vue/src/features/agent-panel/stores/agentPanel.store.ts`
- Modify: `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`

- [ ] **Step 1: Add failing chat view contract**

Extend contract:

```ts
it("chat view renders messages and sends through the agent panel api", () => {
  const view = readFileSync("src/features/agent-panel/components/AgentChatView.vue", "utf8");
  const composer = readFileSync("src/features/agent-panel/components/AgentChatComposer.vue", "utf8");
  const store = readFileSync("src/features/agent-panel/stores/agentPanel.store.ts", "utf8");

  assert.match(view, /selectedAgent/);
  assert.match(view, /messages/);
  assert.match(composer, /Ctrl\\+Enter|ctrl\\.enter/);
  assert.match(store, /sendMessage/);
  assert.match(store, /agentPanelApi\.sendMessage/);
});
```

- [ ] **Step 2: Run contract to verify it fails**

Run:

```powershell
cd client-vue
node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add store send and load messages**

```ts
async function loadMessages(sessionId = selectedSessionId.value) {
  messages.value = sessionId ? await agentPanelApi.listMessages(sessionId) : [];
}

async function sendMessage(message: string) {
  const text = message.trim();
  if (!text || !selectedSessionId.value || sending.value) return;
  sending.value = true;
  error.value = "";
  try {
    const result = await agentPanelApi.sendMessage(selectedSessionId.value, { message: text });
    messages.value = result.messages;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Agent message failed";
  } finally {
    sending.value = false;
  }
}
```

- [ ] **Step 4: Implement chat view**

`AgentChatView.vue` must include:

- top bar with emoji, name, workflow name, profile id;
- button to open workflow editor route for `workflowId`;
- scrollable messages;
- empty state when no session selected;
- `AgentChatComposer` at bottom.

- [ ] **Step 5: Implement composer**

`AgentChatComposer.vue` must:

- use textarea;
- submit on button click;
- submit on Ctrl+Enter;
- disable while sending;
- emit `send` with trimmed text.

- [ ] **Step 6: Run contract and build**

Run:

```powershell
cd client-vue
node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add client-vue/src/features/agent-panel/components/AgentChatView.vue client-vue/src/features/agent-panel/components/AgentChatComposer.vue client-vue/src/features/agent-panel/stores/agentPanel.store.ts client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts feats-map/global-agent-panel.md
git commit -m "feat: chat with published agents"
```

---

## Task 12: Session Delete and Memory Cleanup UX

**Files:**
- Modify: `server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.ts`
- Modify: `server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts`
- Modify: `client-vue/src/features/agent-panel/components/AgentSessionList.vue`
- Modify: `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`

- [ ] **Step 1: Write failing backend cleanup tests**

Add tests:

```ts
it("delete transcript-only does not delete agent memories", async () => {
  await service.deleteSession({ profileId: "profile_a", sessionId: "chat_1", memoryMode: "transcript-only" });
  assert.equal(memoryDeletes.length, 0);
});

it("delete session deletes only session scoped memory", async () => {
  await service.deleteSession({ profileId: "profile_a", sessionId: "chat_1", memoryMode: "session" });
  assert.deepEqual(memoryDeletes, ["session:chat_1"]);
});
```

- [ ] **Step 2: Implement explicit cleanup policy**

In service delete:

```ts
if (input.memoryMode === "session") {
  await this.memoryStore.deleteNamespace(input.profileId, `session:${input.sessionId}`);
}

if (input.memoryMode === "all-agent-memory") {
  await this.memoryStore.deleteAgentScopedMemories({
    profileId: input.profileId,
    workflowId: session.workflowId,
    agentNodeId: session.agentNodeId,
  });
}
```

If `AgentMemoryStore` lacks these methods, add them with tests in the same task.

- [ ] **Step 3: Add frontend delete confirmation**

In `AgentSessionList.vue`, show a compact modal/menu with options:

- Delete chat only
- Delete chat and session memory
- Delete chat and all agent memory

Require an extra confirmation for all agent memory:

```ts
const dangerousMemoryMode = "all-agent-memory";
```

- [ ] **Step 4: Run tests and build**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts
cd ../client-vue
node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.ts server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts client-vue/src/features/agent-panel/components/AgentSessionList.vue client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts feats-map/global-agent-panel.md
git commit -m "feat: manage agent chat deletion"
```

---

## Task 13: Workflow Editor Chat Boundary Cleanup

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue`
- Modify: `client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`

- [ ] **Step 1: Write failing contract**

Add assertions:

```ts
assert.match(source, /Dev Session/);
assert.doesNotMatch(source, /agentChatApi\.sendMessage\(activeChatSlug/);
assert.match(source, /Open published agent panel/);
```

- [ ] **Step 2: Run contract to verify it fails**

Run:

```powershell
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts
```

Expected: FAIL because editor still has published fallback.

- [ ] **Step 3: Remove published send fallback from editor chat**

In `ChatSessionPanel.vue`:

- keep Dev Session send path;
- when no Dev Session exists, show a call to action:

```vue
<button type="button" @click="router.push('/agents')">
  Open published agent panel
</button>
```

Do not call `agentChatApi.sendMessage()` from the editor panel.

- [ ] **Step 4: Run contracts and build**

Run:

```powershell
cd client-vue
node --test src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts feats-map/global-agent-panel.md
git commit -m "fix: keep editor chat dev scoped"
```

---

## Task 14: Global Agent Panel Verification

**Files:**
- Modify: `docs/agent-runtime.md`
- Modify: `feats-map/global-agent-panel.md`

- [ ] **Step 1: Run full focused backend suite**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/directory/published-agent-directory.test.ts src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts src/core/routes/agent-panel.routes.test.ts src/core/modules/workflows/executor.test.ts src/core/modules/agent-runtime/chat/chat-trigger-service.test.ts src/core/routes/agent-chat.routes.test.ts
npm run build
```

Expected: all tests pass and `tsc` exits 0.

- [ ] **Step 2: Run full focused frontend suite**

Run:

```powershell
cd client-vue
node --test src/core/api/agent-panel.api.contract.test.ts src/features/agent-panel/__tests__/agentPanel.contract.test.ts src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts
npm run build
```

Expected: all tests pass and Vite build completes.

- [ ] **Step 3: Browser smoke test**

Start dev servers using the existing project commands. Open `/agents` in the in-app browser and verify:

- page has three columns;
- published Ollama agent appears after publishing workflow;
- new chat creates a session;
- second message sees previous assistant reply;
- delete chat removes it from session list;
- Workflow Editor chat points to Dev Session or `/agents`, not hidden production send.

- [ ] **Step 4: Update docs**

In `docs/agent-runtime.md`, add:

```md
## Global Agent Panel

The global Agent Panel discovers published agents from active workflows. An agent is eligible when a Chat Trigger with a chat slug reaches an AI Agent that has a connected AI Model.

Chat sessions store transcript history. Long-term memory is still controlled by AI Memory nodes and their configured scope. Deleting a chat deletes the transcript and can optionally delete session-scoped memory.
```

- [ ] **Step 5: Mark feature map complete**

In `feats-map/global-agent-panel.md`, mark completed task checkboxes and add verification notes.

- [ ] **Step 6: Commit**

```powershell
git add docs/agent-runtime.md feats-map/global-agent-panel.md
git commit -m "docs: document global agent panel"
```

---

## Self-Review

- Spec coverage: agent directory, metadata, persistent chats, global panel UI, delete/memory policy, and editor boundary all map to tasks.
- Placeholder scan: no placeholder markers or vague "add tests" steps remain. Each task contains concrete files, commands, and expected results.
- Type consistency: `PublishedAgentSummary`, `agentKey`, `agentNodeId`, `targetAgentNodeId`, and `memoryMode` names are consistent across backend and frontend tasks.
- Risk notes:
  - Targeted execution changes `WorkflowEngine`; keep tests focused because this can affect all workflow execution.
  - Existing chat routes should remain for direct slug-based chat, but the editor should stop pretending to be the production chat UI.
  - Session transcript is not long-term memory; UI copy must avoid calling it memory.

---

## Execution Options

Plan complete. Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.
