# Agent Memory Runtime Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Tools Agent memory opt-in: stateless without a connected Memory node, SQLite-backed short-term memory with SQLite Memory, and plugin-backed long-term memory with PostgreSQL Agent Memory.

**Architecture:** Add a small server-side memory policy module as the single source of truth for adapter semantics. The AI Agent handler uses that policy to decide whether chat history may enter the model context. The Agent Runner uses the same policy to activate SQLite checkpoints only for short-term memory and PostgreSQL reads/writes only for plugin-backed long-term memory.

**Tech Stack:** TypeScript, Node test runner, Vue 3, SQLite LangGraph checkpointer, PostgreSQL plugin memory adapter.

---

## Runtime Rules

| Connected Memory node | Runtime mode | Dev Session | Published workflow |
| --- | --- | --- | --- |
| None | Stateless | Do not send previous chat messages to the model. Do not create SQLite checkpointer. Do not read or write long-term memory. | Same behavior. |
| SQLite Memory (`sailor-internal`) | Short-term | Use previous messages only when the trigger provides a Sailor `sessionId`. Create SQLite checkpointer only for that session. | Same behavior. |
| PostgreSQL Agent Memory (`plugin-memory-store`) | Long-term | Read and write plugin memory records using configured namespace scope. Do not implicitly inject chat transcript or create SQLite checkpointer. | Same behavior. |

Webhook, manual, polling, and plugin triggers without an explicit `sessionId` remain stateless when connected to SQLite Memory. This avoids guessing a cross-provider conversation identity from arbitrary payload fields. PostgreSQL Agent Memory remains available across executions through its configured `workflow`, `profile`, or `user` namespace.

Tool approval persistence is separate from conversational memory. Approval rows remain database-backed only when an approval is created.

## File Responsibilities

- `server/src/core/modules/agent-runtime/memory/agent-memory-mode.ts`
  - Resolve one memory mode from an optional Memory node config.
  - Keep adapter interpretation outside the runner and node handler.
- `server/src/core/modules/agent-runtime/agent-runner.ts`
  - Activate SQLite checkpointer only for short-term memory with a session.
  - Invoke plugin memory reads and writes only for long-term memory.
- `server/src/core/nodes/handlers/ai-agent.ts`
  - Forward trigger history only when SQLite short-term memory is connected.
- `client-vue/src/features/workflow-editor/components/settings/editors/AiMemoryEditor.vue`
  - Present SQLite as short-term session memory.
  - Present plugin-backed memory controls only where long-term configuration applies.
- `client-vue/src/features/workflow-editor/components/nodes/AiMemoryNode.vue`
  - Show short-term or long-term semantics in the compact node subtitle.

### Task 1: Add Runtime Memory Policy

**Files:**
- Create: `server/src/core/modules/agent-runtime/memory/agent-memory-mode.ts`
- Create: `server/src/core/modules/agent-runtime/memory/agent-memory-mode.test.ts`

- [x] **Step 1: Write failing tests for stateless, SQLite short-term, legacy SQLite, and PostgreSQL long-term modes**
- [x] **Step 2: Run `node --test src/core/modules/agent-runtime/memory/agent-memory-mode.test.ts` from `server/` and confirm RED**
- [x] **Step 3: Implement `resolveAgentMemoryMode`, `usesShortTermMemory`, and `usesLongTermMemory`**
- [x] **Step 4: Run the focused test and confirm GREEN**
- [x] **Step 5: Commit with `feat: define agent memory runtime modes`**

### Task 2: Make Agent Runner Memory Opt-In

**Files:**
- Modify: `server/src/core/modules/agent-runtime/agent-runner.ts`
- Modify: `server/src/core/modules/agent-runtime/agent-runner.test.ts`

- [x] **Step 1: Replace the automatic checkpointer test with failing tests proving no Memory is stateless and SQLite Memory activates checkpoints only with `sessionId`**
- [x] **Step 2: Add a failing test proving PostgreSQL long-term memory does not create a SQLite checkpointer**
- [x] **Step 3: Update long-term tests to prove only plugin-backed memory reads and writes records**
- [x] **Step 4: Run `node --test src/core/modules/agent-runtime/agent-runner.test.ts` from `server/` and confirm RED**
- [x] **Step 5: Update Agent Runner to apply the central memory mode policy**
- [x] **Step 6: Run the focused test and confirm GREEN**
- [x] **Step 7: Commit with `fix: make agent memory persistence opt in`**

### Task 3: Gate Chat Transcript Context Behind SQLite Memory

**Files:**
- Modify: `server/src/core/nodes/handlers/ai-agent.ts`
- Modify: `server/src/core/nodes/handlers/ai-agent.test.ts`

- [x] **Step 1: Add a failing handler test proving a workflow without Memory does not forward trigger history**
- [x] **Step 2: Add a failing handler test proving PostgreSQL Memory does not implicitly forward chat transcript**
- [x] **Step 3: Keep the existing SQLite handler coverage and make its adapter explicit**
- [x] **Step 4: Run `node --test src/core/nodes/handlers/ai-agent.test.ts` from `server/` and confirm RED**
- [x] **Step 5: Forward `contextMessages` only when the connected Memory config resolves to short-term**
- [x] **Step 6: Run the focused test and confirm GREEN**
- [x] **Step 7: Commit with `fix: gate agent chat history behind sqlite memory`**

### Task 4: Clarify Memory Semantics In The Editor

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/AiMemoryEditor.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/AiMemoryNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/agent/__tests__/AgentMemory.contract.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts`

- [x] **Step 1: Add failing contract tests for short-term and long-term editor branches**
- [x] **Step 2: Run focused frontend contract tests and confirm RED**
- [x] **Step 3: Show fixed session semantics for SQLite Memory and long-term scope/retrieval controls for PostgreSQL Memory**
- [x] **Step 4: Show `short-term memory` or `long-term memory` in the canvas node subtitle**
- [x] **Step 5: Run focused frontend contract tests and confirm GREEN**
- [x] **Step 6: Commit with `feat: clarify agent memory adapter semantics`**

### Task 5: Verify The Full Change

**Files:**
- Modify: `feats-map/agent-memory-runtime-semantics.md`

- [ ] **Step 1: Run server agent runtime tests**
- [ ] **Step 2: Run `npm run build` from `server/`**
- [ ] **Step 3: Run frontend contract tests**
- [ ] **Step 4: Run `npm run type-check` from `client-vue/`**
- [ ] **Step 5: Mark completed tasks in this file**
- [ ] **Step 6: Commit with `docs: close agent memory runtime semantics tasks`**
