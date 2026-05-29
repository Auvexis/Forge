# Agent Chat Tool UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make agent tool usage in chat feel explicit, alive, and complete before approval, while running, and after success or failure.

**Architecture:** The server emits structured agent tool lifecycle events and keeps the LLM language policy neutral. The editor execution store converts those events into transient chat messages/status rows, and `ChatSessionPanel.vue` renders subtle animated tool activity plus final assistant messages.

**Tech Stack:** Vue 3, Pinia, TypeScript, Node contract tests, existing workflow dev-session SSE/event stream.

---

## File Structure

- Modify `server/src/core/modules/agent-runtime/agent-types.ts`: add tool lifecycle event payload types.
- Modify `server/src/core/modules/agent-runtime/agent-graph-builder.ts`: emit tool intent/start/end events around approval and execution.
- Modify `server/src/core/modules/agent-runtime/agent-runner.ts`: pass plugin metadata into graph tools when available.
- Modify `client-vue/src/features/workflow-editor/stores/execution.store.ts`: map backend tool events to editor chat messages.
- Modify `client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue`: render tool preamble/status/success rows with subtle transitions.
- Modify `client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`: assert tool status UI structure.
- Modify `client-vue/src/features/workflow-editor/stores/__tests__/execution.store.contract.test.ts`: assert tool lifecycle events become chat records.
- Modify `server/src/core/modules/agent-runtime/__tests__/agent-graph-builder.contract.test.ts`: assert lifecycle events are emitted before and after tools.

### Task 1: Backend Tool Lifecycle Events

**Files:**
- Modify: `server/src/core/modules/agent-runtime/agent-types.ts`
- Modify: `server/src/core/modules/agent-runtime/agent-graph-builder.ts`
- Test: `server/src/core/modules/agent-runtime/__tests__/agent-graph-builder.contract.test.ts`

- [x] **Step 1: Write the failing test**

Add a contract test that checks the graph builder emits a tool intent event before approval or execution, a tool start event when execution begins, and a tool end event with success or failure.

```ts
test('agent graph emits tool lifecycle events around tool execution', () => {
  const source = read('src/core/modules/agent-runtime/agent-graph-builder.ts')
  const types = read('src/core/modules/agent-runtime/agent-types.ts')

  assert.match(types, /agent:tool-intent/)
  assert.match(types, /agent:tool-start/)
  assert.match(types, /agent:tool-end/)
  assert.match(source, /emitToolIntent/)
  assert.match(source, /emitToolStart/)
  assert.match(source, /emitToolEnd/)
  assert.match(source, /pluginId/)
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand server/src/core/modules/agent-runtime/__tests__/agent-graph-builder.contract.test.ts`

Expected: FAIL because the new lifecycle event names and emit helpers are missing.

- [x] **Step 3: Add event types**

Add these event variants to the existing agent runtime event union:

```ts
type AgentToolLifecycleEvent =
  | {
      type: 'agent:tool-intent'
      executionId: string
      toolName: string
      pluginId?: string
      pluginName?: string
      requiresApproval: boolean
    }
  | {
      type: 'agent:tool-start'
      executionId: string
      toolName: string
      pluginId?: string
      pluginName?: string
    }
  | {
      type: 'agent:tool-end'
      executionId: string
      toolName: string
      pluginId?: string
      pluginName?: string
      status: 'success' | 'failed'
      error?: string
    }
```

- [x] **Step 4: Emit lifecycle events**

In `agent-graph-builder.ts`, emit intent as soon as a model tool call is selected, before approval wait or direct execution. Emit start immediately before invoking the tool. Emit end in both the success path and the catch path.

```ts
emit({
  type: 'agent:tool-intent',
  executionId,
  toolName: tool.name,
  pluginId: tool.pluginId,
  pluginName: tool.pluginName,
  requiresApproval,
})
```

- [x] **Step 5: Run test to verify it passes**

Run: `npm test -- --runInBand server/src/core/modules/agent-runtime/__tests__/agent-graph-builder.contract.test.ts`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add server/src/core/modules/agent-runtime/agent-types.ts server/src/core/modules/agent-runtime/agent-graph-builder.ts server/src/core/modules/agent-runtime/__tests__/agent-graph-builder.contract.test.ts
git commit -m "feat: emit agent tool lifecycle events"
```

### Task 2: Tool Metadata From Plugin Tools

**Files:**
- Modify: `server/src/core/modules/agent-runtime/agent-runner.ts`
- Test: `server/src/core/modules/agent-runtime/__tests__/agent-runner.contract.test.ts`

- [x] **Step 1: Write the failing test**

Add a contract test that asserts graph tools include plugin identity fields.

```ts
test('agent runner passes plugin metadata into graph tools', () => {
  const source = read('src/core/modules/agent-runtime/agent-runner.ts')

  assert.match(source, /pluginId/)
  assert.match(source, /pluginName/)
  assert.match(source, /GraphTool/)
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand server/src/core/modules/agent-runtime/__tests__/agent-runner.contract.test.ts`

Expected: FAIL if plugin metadata is not propagated.

- [x] **Step 3: Add metadata to graph tools**

When converting connected workflow tool nodes into graph tools, preserve `pluginId` and a human-readable plugin name when the node has that metadata. Do not infer a plugin from the tool name alone.

```ts
const graphTool: GraphTool = {
  name: toolName,
  description,
  schema,
  pluginId: toolNode.data.pluginId,
  pluginName: toolNode.data.pluginName ?? toolNode.data.pluginId,
  execute,
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand server/src/core/modules/agent-runtime/__tests__/agent-runner.contract.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add server/src/core/modules/agent-runtime/agent-runner.ts server/src/core/modules/agent-runtime/__tests__/agent-runner.contract.test.ts
git commit -m "feat: include plugin metadata in agent tools"
```

### Task 3: Store Transient Tool Chat Records

**Files:**
- Modify: `client-vue/src/features/workflow-editor/stores/execution.store.ts`
- Test: `client-vue/src/features/workflow-editor/stores/__tests__/execution.store.contract.test.ts`

- [x] **Step 1: Write the failing test**

Add a contract test that checks event handlers append and update tool status chat records.

```ts
test('execution store maps agent tool lifecycle events to chat tool status messages', () => {
  const source = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(source, /agent:tool-intent/)
  assert.match(source, /agent:tool-start/)
  assert.match(source, /agent:tool-end/)
  assert.match(source, /toolStatus/)
  assert.match(source, /pending|running|success|failed/)
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test src/features/workflow-editor/stores/__tests__/execution.store.contract.test.ts`

Expected: FAIL because tool lifecycle chat records are not handled yet.

- [x] **Step 3: Add chat record shape**

Add a transient assistant-side record shape that does not pollute LLM history:

```ts
type EditorChatToolStatus = {
  kind: 'toolStatus'
  executionId: string
  toolName: string
  pluginName?: string
  status: 'pending' | 'running' | 'success' | 'failed'
  requiresApproval?: boolean
  error?: string
}
```

- [x] **Step 4: Map lifecycle events**

On `agent:tool-intent`, append a pending row. On `agent:tool-start`, update it to running. On `agent:tool-end`, update it to success or failed. Keep the existing pending assistant message for the model response separate.

- [x] **Step 5: Run test to verify it passes**

Run: `node --test src/features/workflow-editor/stores/__tests__/execution.store.contract.test.ts`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add client-vue/src/features/workflow-editor/stores/execution.store.ts client-vue/src/features/workflow-editor/stores/__tests__/execution.store.contract.test.ts
git commit -m "feat: track agent tool status in chat"
```

### Task 4: Chat Tool Status UI

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue`
- Test: `client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`

- [x] **Step 1: Write the failing test**

Add a contract test for the tool status row, shimmer, dots, and transition classes.

```ts
test('chat session panel renders animated agent tool status rows', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')

  assert.match(source, /toolStatus/)
  assert.match(source, /chat-session-panel__tool-status/)
  assert.match(source, /chat-session-panel__tool-status--running/)
  assert.match(source, /chat-session-panel__tool-dots/)
  assert.match(source, /@keyframes chat-tool-shimmer/)
  assert.match(source, /TransitionGroup/)
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`

Expected: FAIL because the new status UI is absent.

- [x] **Step 3: Render localized pre-tool and running states**

Render a compact assistant status row:

```ts
function formatToolStatus(status: EditorChatToolStatus, lastUserMessage: string) {
  const locale = detectChatLocale(lastUserMessage)
  return locale === 'pt'
    ? `Perfeito, para isso utilizarei ${status.toolName}${status.pluginName ? ` do plugin ${status.pluginName}` : ''}.`
    : `Perfect, I will use ${status.toolName}${status.pluginName ? ` from ${status.pluginName}` : ''} for that.`
}
```

Use locale templates only for UI chrome. Do not add a Portuguese-only system prompt to the LLM.

- [x] **Step 4: Add subtle animation**

Add CSS for a low-intensity shimmer and three dots while status is `pending` or `running`. Add a small opacity/translate transition for incoming messages.

- [x] **Step 5: Run test to verify it passes**

Run: `node --test src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts
git commit -m "feat: animate agent tool status in chat"
```

### Task 5: Final Assistant Completion Message

**Files:**
- Modify: `client-vue/src/features/workflow-editor/stores/execution.store.ts`
- Modify: `client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue`
- Test: `client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`

- [x] **Step 1: Write the failing test**

Add a contract test that ensures a completed tool run does not leave the chat stuck on approval text and has a fallback completion message when no model text arrives.

```ts
test('chat session panel can show a final tool completion message after approval resume', () => {
  const source = read('src/features/workflow-editor/components/agent/ChatSessionPanel.vue')
  const store = read('src/features/workflow-editor/stores/execution.store.ts')

  assert.match(store, /appendToolCompletionMessage/)
  assert.match(source, /formatToolCompletionMessage/)
  assert.doesNotMatch(source, /Approved .* Waiting for the agent response\\.\\.\\.[\\s\\S]*return/)
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`

Expected: FAIL until completion fallback is implemented.

- [x] **Step 3: Add completion fallback**

When `agent:tool-end` succeeds and the following `agent:end` contains no assistant text, append a localized assistant message:

```ts
const message = locale === 'pt'
  ? `Pronto, usei ${toolName}${pluginName ? ` do plugin ${pluginName}` : ''} com sucesso. Quer executar mais alguma acao?`
  : `Done, I used ${toolName}${pluginName ? ` from ${pluginName}` : ''} successfully. Do you want to run another action?`
```

- [x] **Step 4: Keep failures visible**

For failed tool runs, keep the failed status row and show the existing toast/error path. Do not generate a fake success message.

- [x] **Step 5: Run test to verify it passes**

Run: `node --test src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add client-vue/src/features/workflow-editor/stores/execution.store.ts client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts
git commit -m "feat: finish approved tool runs in chat"
```

### Task 6: Verification

**Files:**
- No new files.

- [x] **Step 1: Run focused backend tests**

Run: `npm test -- --runInBand server/src/core/modules/agent-runtime/__tests__/agent-graph-builder.contract.test.ts server/src/core/modules/agent-runtime/__tests__/agent-runner.contract.test.ts`

Expected: PASS.

- [x] **Step 2: Run focused frontend tests**

Run from `client-vue`: `node --test src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts src/features/workflow-editor/stores/__tests__/execution.store.contract.test.ts`

Expected: PASS.

- [x] **Step 3: Run type checks**

Run from `client-vue`: `npm run type-check`

Expected: PASS.

- [ ] **Step 4: Manual smoke test**

Open the editor, ask the agent to use Discord, confirm the chat shows a pre-tool message, approval buttons, animated running status after accept, success status after the Discord API response, and a final assistant success message. Repeat with a tool that does not require approval.

- [x] **Step 5: Commit verification notes if docs changed**

```bash
git status --short
```

Expected: only intentional files are modified.
