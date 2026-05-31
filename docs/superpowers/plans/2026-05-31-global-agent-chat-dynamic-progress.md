# Global Agent Chat Dynamic Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Global Agent Chat feel alive by showing contextual progress messages before/during tool calls and a concise completion summary at the end.

**Architecture:** Keep the source of truth in existing agent runtime events. `agent-panel.routes.ts` will translate existing `agent:tool-intent`, `agent:tool-start`, `agent:tool-end`, and `agent:end` events into Agent Panel stream events. The Vue store will convert those stream events into assistant progress messages, while final answer streaming remains unchanged.

**Tech Stack:** Fastify SSE, existing `workflowEventBus`, Vue 3 + Pinia, existing Agent Panel contract tests with `node:test`.

---

## File Map

- Modify `server/src/core/routes/agent-panel.routes.ts`: add stream event mapping for tool progress and completion summary.
- Modify `server/src/core/routes/agent-panel.routes.test.ts`: prove SSE sends progress events in order.
- Modify `client-vue/src/features/agent-panel/types/agent-panel.types.ts`: add typed stream events and progress content shape.
- Modify `client-vue/src/features/agent-panel/stores/agentPanel.store.ts`: upsert progress messages from stream events.
- Modify `client-vue/src/features/agent-panel/components/AgentChatView.vue`: render progress timeline/status rows inside chat.
- Modify `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`: lock frontend contract.
- Create/update `feats-map/global-agent-chat-dynamic-progress-plan-2026-05-31.md`: task tracker.

---

### Task 1: Backend Stream Progress Events

**Files:**
- Modify: `server/src/core/routes/agent-panel.routes.ts`
- Test: `server/src/core/routes/agent-panel.routes.test.ts`

- [ ] **Step 1: Write failing test for tool progress stream**

Add a test that emits tool lifecycle events during `sendMessage` and expects SSE events before `done`:

```ts
it("streams tool progress events before done", async () => {
  const app = await buildApp({
    sendMessage: async (input: { executionId?: string }) => {
      assert.ok(input.executionId);
      workflowEventBus.emitWorkflowEvent({
        executionId: input.executionId,
        workflowId: "workflow_agent",
        nodeId: "agent",
        type: "agent:tool-intent",
        timestamp: Date.now(),
        data: {
          name: "send_email",
          pluginName: "Gmail",
          requiresApproval: false,
        },
      });
      workflowEventBus.emitWorkflowEvent({
        executionId: input.executionId,
        workflowId: "workflow_agent",
        nodeId: "agent",
        type: "agent:tool-start",
        timestamp: Date.now(),
        data: {
          name: "send_email",
          pluginName: "Gmail",
        },
      });
      workflowEventBus.emitWorkflowEvent({
        executionId: input.executionId,
        workflowId: "workflow_agent",
        nodeId: "agent",
        type: "agent:tool-end",
        timestamp: Date.now(),
        data: {
          name: "send_email",
          pluginName: "Gmail",
          status: "success",
        },
      });

      return {
        session: session("chat_1"),
        messages: [
          message("msg_user", "chat_1"),
          {
            ...message("msg_assistant", "chat_1"),
            role: "assistant" as const,
            content: "Email enviado.",
          },
        ],
        execution: { status: "SUCCESS" },
      };
    },
  });

  const response = await app.inject({
    method: "POST",
    url: "/agent-panel/sessions/chat_1/messages/stream",
    payload: { message: "Enviar email" },
  });

  const events = parseStreamEvents(response.body);
  assert.deepEqual(
    events.filter((event) => event.type === "progress").map((event) => event.status),
    ["planned", "running", "success"],
  );
  assert.equal(events.at(-1)?.type, "done");
});
```

- [ ] **Step 2: Run test and verify red**

Run from `server`: `node --test src/core/routes/agent-panel.routes.test.ts`

Expected: FAIL because no `progress` events exist yet.

- [ ] **Step 3: Implement backend event translation**

In `agent-panel.routes.ts`, inside `workflowEventBus.onExecution`, map:

```ts
if (event.type === "agent:tool-intent") {
  writeStreamEvent(reply, {
    type: "progress",
    status: "planned",
    message: formatToolProgressMessage(event, "planned"),
    tool: extractToolProgress(event),
  });
}
if (event.type === "agent:tool-start") {
  writeStreamEvent(reply, {
    type: "progress",
    status: "running",
    message: formatToolProgressMessage(event, "running"),
    tool: extractToolProgress(event),
  });
}
if (event.type === "agent:tool-end") {
  const status = extractToolStatus(event) === "failed" ? "failed" : "success";
  writeStreamEvent(reply, {
    type: "progress",
    status,
    message: formatToolProgressMessage(event, status),
    tool: extractToolProgress(event),
  });
}
```

Add helpers:

```ts
function extractToolProgress(event: WorkflowEvent) {
  const data = event.data as Record<string, unknown> | undefined;
  const name = typeof data?.name === "string" ? data.name : "agent tool";
  const pluginName = typeof data?.pluginName === "string" ? data.pluginName : undefined;
  return { name, pluginName };
}

function extractToolStatus(event: WorkflowEvent): string {
  const data = event.data as Record<string, unknown> | undefined;
  return typeof data?.status === "string" ? data.status : "";
}

function formatToolProgressMessage(event: WorkflowEvent, status: "planned" | "running" | "success" | "failed"): string {
  const tool = extractToolProgress(event);
  const label = tool.pluginName ? `${tool.name} (${tool.pluginName})` : tool.name;
  if (status === "planned") return `Vou usar ${label}.`;
  if (status === "running") return `Executando ${label} agora.`;
  if (status === "success") return `Conclui ${label}.`;
  return `Nao consegui concluir ${label}.`;
}
```

- [ ] **Step 4: Run backend test green**

Run from `server`: `node --test src/core/routes/agent-panel.routes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit backend progress**

```bash
git add server/src/core/routes/agent-panel.routes.ts server/src/core/routes/agent-panel.routes.test.ts
git commit -m "feat: stream agent panel tool progress"
```

---

### Task 2: Frontend Progress Message Model

**Files:**
- Modify: `client-vue/src/features/agent-panel/types/agent-panel.types.ts`
- Modify: `client-vue/src/features/agent-panel/stores/agentPanel.store.ts`
- Test: `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`

- [ ] **Step 1: Write failing frontend contract**

Add assertions:

```ts
assert.match(types, /type: 'progress'/);
assert.match(store, /appendAgentProgressMessage/);
assert.match(store, /event\.type === 'progress'/);
assert.match(store, /kind: 'agentProgress'/);
```

- [ ] **Step 2: Run frontend contract red**

Run from `client-vue`: `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`

Expected: FAIL because progress stream type/store handler does not exist.

- [ ] **Step 3: Add typed stream event**

In `agent-panel.types.ts`:

```ts
export type AgentPanelProgressStatus = 'planned' | 'running' | 'success' | 'failed';

export interface AgentPanelProgressContent {
  kind: 'agentProgress';
  status: AgentPanelProgressStatus;
  message: string;
  tool?: {
    name: string;
    pluginName?: string;
  };
}
```

Extend `AgentPanelStreamEvent`:

```ts
| { type: 'progress'; status: AgentPanelProgressStatus; message: string; tool?: AgentPanelProgressContent['tool'] }
```

- [ ] **Step 4: Add store upsert**

In `agentPanel.store.ts`:

```ts
function appendAgentProgressMessage(sessionId: string, event: Extract<AgentPanelStreamEvent, { type: 'progress' }>) {
  const toolKey = event.tool?.name ?? 'agent-tool';
  const id = `local-agent-progress-${sessionId}-${toolKey}`;
  const existing = messages.value.find((message) => message.id === id);
  const content = {
    kind: 'agentProgress',
    status: event.status,
    message: event.message,
    tool: event.tool,
  };
  if (existing) {
    existing.content = content;
    return;
  }
  messages.value = [
    ...messages.value,
    {
      id,
      profileId: '',
      sessionId,
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
      entrance: 'assistant',
    } as AgentChatMessage,
  ];
}
```

In the stream loop:

```ts
if (event.type === 'progress') appendAgentProgressMessage(selectedSessionId.value, event);
```

- [ ] **Step 5: Run frontend contract green**

Run from `client-vue`: `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit frontend model**

```bash
git add client-vue/src/features/agent-panel/types/agent-panel.types.ts client-vue/src/features/agent-panel/stores/agentPanel.store.ts client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts
git commit -m "feat: model agent panel progress messages"
```

---

### Task 3: Progress UI In Global Agent Chat

**Files:**
- Modify: `client-vue/src/features/agent-panel/components/AgentChatView.vue`
- Test: `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`

- [ ] **Step 1: Write failing render contract**

Add assertions:

```ts
assert.match(chat, /isAgentProgressContent/);
assert.match(chat, /agent-chat-view__progress/);
assert.match(chat, /agent-chat-view__progress--running/);
assert.match(chat, /progressMessage/);
```

- [ ] **Step 2: Run contract red**

Run from `client-vue`: `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`

Expected: FAIL because progress UI is missing.

- [ ] **Step 3: Render progress card**

In the message template, before thinking/text:

```vue
<div
  v-if="isAgentProgressContent(message.content)"
  class="agent-chat-view__progress"
  :class="`agent-chat-view__progress--${message.content.status}`"
>
  <LucideIcon :name="progressIcon(message.content.status)" :size="14" />
  <span>{{ progressMessage(message.content) }}</span>
</div>
```

Add helpers:

```ts
function isAgentProgressContent(content: unknown): content is AgentPanelProgressContent {
  return Boolean(content && typeof content === 'object' && !Array.isArray(content) && (content as { kind?: unknown }).kind === 'agentProgress');
}

function progressMessage(content: AgentPanelProgressContent): string {
  return content.message;
}

function progressIcon(status: AgentPanelProgressContent['status']): string {
  if (status === 'success') return 'check';
  if (status === 'failed') return 'triangle-alert';
  if (status === 'running') return 'loader-circle';
  return 'wrench';
}
```

Update `messageText()` to return empty string for progress content.

- [ ] **Step 4: Add compact styling**

Add CSS:

```css
.agent-chat-view__progress {
  grid-column: 2;
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: var(--sailor-space-2);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-elevated);
  padding: 8px 10px;
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
}

.agent-chat-view__progress--running svg {
  animation: agent-progress-spin 0.9s linear infinite;
}

.agent-chat-view__progress--success {
  color: var(--sailor-success);
}

.agent-chat-view__progress--failed {
  color: var(--sailor-danger);
}

@keyframes agent-progress-spin {
  to {
    transform: rotate(360deg);
  }
}
```

- [ ] **Step 5: Run frontend contract green**

Run from `client-vue`: `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit UI**

```bash
git add client-vue/src/features/agent-panel/components/AgentChatView.vue client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts
git commit -m "feat: render agent panel progress messages"
```

---

### Task 4: Final Completion Summary

**Files:**
- Modify: `server/src/core/routes/agent-panel.routes.ts`
- Modify: `client-vue/src/features/agent-panel/types/agent-panel.types.ts`
- Modify: `client-vue/src/features/agent-panel/stores/agentPanel.store.ts`
- Test: backend and frontend contract tests.

- [ ] **Step 1: Write failing backend test**

Add a route test where one tool succeeds and final answer exists. Assert an event:

```ts
assert.ok(events.some((event) =>
  event.type === "summary" &&
  /Conclui/.test(event.message) &&
  /send_email/.test(event.message)
));
```

- [ ] **Step 2: Implement summary event**

Track successful tools in route scope:

```ts
const completedTools: string[] = [];
```

On `agent:tool-end` success:

```ts
completedTools.push(extractToolProgress(event).name);
```

Before `done`:

```ts
if (completedTools.length > 0) {
  writeStreamEvent(reply, {
    type: "summary",
    message: `Conclui ${completedTools.join(", ")} e preparei a resposta final.`,
    tools: completedTools,
  });
}
```

- [ ] **Step 3: Add frontend type and store handling**

Extend stream event:

```ts
| { type: 'summary'; message: string; tools: string[] }
```

Store:

```ts
if (event.type === 'summary') appendAgentProgressMessage(selectedSessionId.value, {
  type: 'progress',
  status: 'success',
  message: event.message,
  tool: { name: 'summary' },
});
```

- [ ] **Step 4: Run tests**

Run:

```bash
cd server && node --test src/core/routes/agent-panel.routes.test.ts
cd ../client-vue && node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit summary**

```bash
git add server/src/core/routes/agent-panel.routes.ts server/src/core/routes/agent-panel.routes.test.ts client-vue/src/features/agent-panel/types/agent-panel.types.ts client-vue/src/features/agent-panel/stores/agentPanel.store.ts client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts
git commit -m "feat: summarize agent panel tool work"
```

---

### Task 5: Final Verification

**Files:**
- Modify: `feats-map/global-agent-chat-dynamic-progress-plan-2026-05-31.md`

- [ ] **Step 1: Run full focused verification**

Run:

```bash
cd server && node --test src/core/routes/agent-panel.routes.test.ts src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts
cd ../client-vue && node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts
cd ../server && npm run build
cd ../client-vue && npm run build
```

- [ ] **Step 2: Manual browser smoke**

Open `http://localhost:23802`, open Global Agent, send a message that uses a tool, verify:

- user message appears immediately
- assistant shows typing dots
- assistant shows "Vou usar..." before tool execution
- running tool row updates to completed/failed
- final answer streams
- completion summary appears before/near final answer

- [ ] **Step 3: Mark feat-map complete**

Update every checkbox in `feats-map/global-agent-chat-dynamic-progress-plan-2026-05-31.md` to `[x]` and add verification notes.

- [ ] **Step 4: Commit verification**

```bash
git add feats-map/global-agent-chat-dynamic-progress-plan-2026-05-31.md
git commit -m "docs: track global agent progress ux verification"
```
