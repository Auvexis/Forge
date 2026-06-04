# Agent Intent Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a language-agnostic intent router before the deterministic tool planner so chat messages do not execute tools or show planning progress.

**Architecture:** Create a focused `AgentIntentRouter` module that asks the configured model for a strict JSON decision using only user text, compact chat context, and a minimal tool catalog. `AgentRunner` will call the router before `AgentPlanGenerator`; `chat` intent returns a direct assistant response, `tool_plan` continues through the existing plan executor.

**Tech Stack:** Node.js test runner, TypeScript, existing agent runtime model adapters, Vue contract tests.

---

## File Structure

- Create `server/src/core/modules/agent-runtime/intent/agent-intent-router.ts`
  - Owns intent types, prompt construction, validation, low-confidence fallback, invalid-output fallback, and direct chat answer fallback.
- Create `server/src/core/modules/agent-runtime/intent/agent-intent-router.test.ts`
  - Focused TDD tests for chat/tool intent, prompt privacy, fallback behavior, and multilingual examples.
- Modify `server/src/core/modules/agent-runtime/agent-runner.ts`
  - Calls router after resolving tools and before plan generation.
  - Removes keyword-only catalog routing as primary behavior.
  - Preserves deterministic catalog fast-path as optional cheap shortcut.
- Modify `server/src/core/modules/agent-runtime/agent-runner.test.ts`
  - Adds integration tests proving chat intent bypasses planning and tool intent still plans.
- Modify `server/src/core/modules/agent-runtime/plan/agent-plan-generator.test.ts`
  - Keeps existing test proving planner prompt does not include schemas.
- Modify `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
  - Adds/keeps contract that chat intent has no progress rows and Stop settles active progress rows.
- Create `feats-map/agent-intent-router-2026-06-04.md`
  - Tracks implementation tasks and verification per project rules.

---

## Task 1: Intent Router Core

**Files:**
- Create: `server/src/core/modules/agent-runtime/intent/agent-intent-router.ts`
- Test: `server/src/core/modules/agent-runtime/intent/agent-intent-router.test.ts`

- [ ] **Step 1: Write failing tests for router behavior**

Create `agent-intent-router.test.ts` with tests for:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routeAgentIntent, type AgentIntentModel } from "./agent-intent-router.ts";

describe("agent intent router", () => {
  it("routes greetings in any language to chat without tool planning", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => ({ mode: "chat", reason: "Greeting.", confidence: 0.95, answer: "Boa noite!" }),
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Boa noite!",
      contextMessages: [],
      tools: [],
    });

    assert.equal(decision.mode, "chat");
    assert.equal(decision.answer, "Boa noite!");
  });

  it("routes external action requests to tool_plan", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => ({ mode: "tool_plan", reason: "Needs Drive and Gmail.", confidence: 0.91 }),
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Send my CV from Drive to email@example.com",
      contextMessages: [],
      tools: [tool("google_drive_list_files", "List files", "Find files in Drive", "read")],
    });

    assert.equal(decision.mode, "tool_plan");
  });

  it("does not send schemas or plugin internals to the router prompt", async () => {
    let prompt = "";
    const model: AgentIntentModel = {
      routeIntent: async (input) => {
        prompt = input.messages.map((message) => message.content).join("\n");
        return { mode: "chat", reason: "Catalog question.", confidence: 0.9, answer: "Tools listed." };
      },
    };

    await routeAgentIntent({
      model,
      userMessage: "What can you do?",
      contextMessages: [{ role: "assistant", content: "Hello" }],
      tools: [tool("drive", "Drive", "List files", "read", { inputSchema: { properties: { query: { type: "string" } } } })],
    });

    assert.match(prompt, /drive/);
    assert.match(prompt, /List files/);
    assert.doesNotMatch(prompt, /inputSchema|properties|required|query|credential|manifest/i);
  });

  it("falls back to chat when router confidence is low", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => ({ mode: "tool_plan", reason: "Unsure.", confidence: 0.2 }),
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Maybe later",
      contextMessages: [],
      tools: [tool("drive", "Drive", "List files", "read")],
    });

    assert.equal(decision.mode, "chat");
  });

  it("falls back to chat when the router returns invalid output", async () => {
    const model: AgentIntentModel = {
      routeIntent: async () => ({ nope: true } as any),
    };

    const decision = await routeAgentIntent({
      model,
      userMessage: "Hola",
      contextMessages: [],
      tools: [],
    });

    assert.equal(decision.mode, "chat");
    assert.match(decision.answer ?? "", /Hola/);
  });
});
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/intent/agent-intent-router.test.ts
```

Expected: FAIL because `agent-intent-router.ts` does not exist.

- [ ] **Step 3: Implement router module**

Create `agent-intent-router.ts` with:

```ts
import type { AgentModelMessage } from "../model-adapters/agent-model-adapter.ts";
import type { AgentToolSideEffect } from "../agent-types.ts";

export type AgentIntentMode = "chat" | "tool_plan";

export interface AgentIntentDecision {
  mode: AgentIntentMode;
  reason: string;
  confidence: number;
  answer?: string;
}

export interface AgentIntentTool {
  name: string;
  description: string;
  instructions?: string;
  sideEffect?: AgentToolSideEffect;
}

export interface AgentIntentModel {
  routeIntent(input: { messages: AgentModelMessage[]; schema: Record<string, any> }): Promise<unknown>;
}

export async function routeAgentIntent(input: {
  model: AgentIntentModel;
  userMessage: string;
  contextMessages: AgentModelMessage[];
  tools: AgentIntentTool[];
}): Promise<AgentIntentDecision> {
  try {
    const raw = await input.model.routeIntent({
      messages: [
        { role: "system", content: buildIntentPrompt(input.tools) },
        ...input.contextMessages.slice(-6),
        { role: "user", content: input.userMessage },
      ],
      schema: agentIntentJsonSchema(),
    });
    return normalizeIntentDecision(raw, input.userMessage);
  } catch {
    return fallbackChatDecision(input.userMessage);
  }
}

function buildIntentPrompt(tools: AgentIntentTool[]): string {
  const catalog = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    instructions: tool.instructions ?? tool.description,
    sideEffect: tool.sideEffect,
  }));

  return [
    "Classify the user message as chat or tool_plan.",
    "Return strict JSON with mode, reason, confidence, and optional answer.",
    "Use chat for greetings, questions, explanations, or tool catalog questions.",
    "Use tool_plan only when the user asks to read, create, update, send, delete, download, upload, or otherwise operate with a tool.",
    "If unsure, choose chat.",
    JSON.stringify({ tools: catalog }),
  ].join("\n");
}
```

Also implement `normalizeIntentDecision`, `fallbackChatDecision`, and `agentIntentJsonSchema` exactly enough to satisfy tests.

- [ ] **Step 4: Run router tests and commit**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/intent/agent-intent-router.test.ts
```

Expected: PASS.

Commit:

```bash
git add server/src/core/modules/agent-runtime/intent/agent-intent-router.ts server/src/core/modules/agent-runtime/intent/agent-intent-router.test.ts
git commit -m "feat: add agent intent router"
```

---

## Task 2: Wire Router Into AgentRunner

**Files:**
- Modify: `server/src/core/modules/agent-runtime/agent-runner.ts`
- Test: `server/src/core/modules/agent-runtime/agent-runner.test.ts`

- [ ] **Step 1: Write failing integration tests**

Add tests:

```ts
it("routes chat intent without planning or tool execution", async () => {
  const modelCalls: string[] = [];
  const events: string[] = [];
  const runner = new AgentRunner({
    modelRegistry: {
      async createChatModel() {
        return {
          async routeIntent() {
            modelCalls.push("intent");
            return { mode: "chat", reason: "Greeting.", confidence: 0.98, answer: "Bonjour!" };
          },
          async invokeJson() {
            throw new Error("Planner should not run for chat intent.");
          },
        };
      },
    },
    toolRegistry: {
      listAvailableTools: () => [],
      resolveConfiguredTools: () => [toolDefinition("lookup")],
    },
    toolExecutor: async () => {
      throw new Error("Tool should not run for chat intent.");
    },
    emitEvent: (event) => events.push(event.type),
  });

  const result = await runner.run({
    ...runInput({ userMessage: "Bonjour" }),
    tools: [toolConfig()],
  });

  assert.equal(result.status, "success");
  assert.equal(result.output, "Bonjour!");
  assert.equal(result.toolCallCount, 0);
  assert.deepEqual(modelCalls, ["intent"]);
  assert.deepEqual(events.filter((event) => event === "agent:thinking" || event.startsWith("agent:plan")), []);
});

it("routes tool_plan intent into the deterministic planner", async () => {
  const modelCalls: string[] = [];
  const runner = new AgentRunner({
    modelRegistry: {
      async createChatModel() {
        return {
          async routeIntent() {
            modelCalls.push("intent");
            return { mode: "tool_plan", reason: "Needs lookup.", confidence: 0.88 };
          },
          async invokeJson() {
            modelCalls.push("plan");
            return { steps: [{ id: "lookup", toolName: "lookup", params: {}, reason: "Lookup." }] };
          },
          async generateFinalResponse() {
            modelCalls.push("final");
            return "Found it.";
          },
        };
      },
    },
    toolRegistry: {
      listAvailableTools: () => [],
      resolveConfiguredTools: () => [toolDefinition("lookup")],
    },
    toolExecutor: async () => ({ ok: true }),
  });

  const result = await runner.run({
    ...runInput({ userMessage: "Find it" }),
    tools: [toolConfig()],
  });

  assert.equal(result.status, "success");
  assert.equal(result.output, "Found it.");
  assert.deepEqual(modelCalls, ["intent", "plan", "final"]);
});
```

- [ ] **Step 2: Run tests and verify red**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/agent-runner.test.ts
```

Expected: FAIL because runner does not call `routeIntent`.

- [ ] **Step 3: Extend model adapter wrapper**

Modify `toPlanModel` in `agent-runner.ts` to expose:

```ts
routeIntent: async (input: { messages: any[]; schema: Record<string, any> }) => {
  if (typeof candidate.routeIntent === "function") return candidate.routeIntent(input);
  if (typeof candidate.invokeJson === "function") return candidate.invokeJson(input.messages, input.schema);
  if (typeof candidate.invoke === "function") {
    const response = await candidate.invoke(input.messages);
    const content = typeof response === "string" ? response : response?.content;
    return JSON.parse(content);
  }
  throw new AgentRuntimeError("Model does not support intent routing", "AGENT_MODEL_UNSUPPORTED", "Agent model cannot route intent", 500);
}
```

- [ ] **Step 4: Call router before plan runtime**

In `runPlanRuntime`, call `routeAgentIntent` before `generateAgentPlan`. If mode is `chat`, return:

```ts
{
  status: "success",
  output: decision.answer?.trim() || input.input.userMessage,
  toolCallCount: 0,
  iterationCount: 1,
  toolCalls: [],
}
```

If mode is `tool_plan`, continue existing plan flow.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/intent/agent-intent-router.test.ts
node --test src/core/modules/agent-runtime/agent-runner.test.ts
```

Expected: PASS.

Commit:

```bash
git add server/src/core/modules/agent-runtime/agent-runner.ts server/src/core/modules/agent-runtime/agent-runner.test.ts
git commit -m "feat: route agent intent before planning"
```

---

## Task 3: Route And Frontend Contract Verification

**Files:**
- Modify: `server/src/core/routes/agent-panel.routes.test.ts`
- Modify: `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- Create/Modify: `feats-map/agent-intent-router-2026-06-04.md`

- [ ] **Step 1: Add backend route regression**

Add a route-level test ensuring a chat-intent response streams text and no progress events. Use existing route test helpers and a fake model with `routeIntent`.

Expected assertions:

```ts
assert.doesNotMatch(streamText, /"type":"progress"/);
assert.match(streamText, /Bonjour/);
assert.match(streamText, /"type":"done"/);
```

- [ ] **Step 2: Add frontend contract assertion**

Add to `agentPanel.contract.test.ts`:

```ts
it("keeps chat intent responses visually plain without progress rows", () => {
  const chat = readFileSync("src/features/agent-panel/components/AgentChatView.vue", "utf8");
  const store = readFileSync("src/features/agent-panel/stores/agentPanel.store.ts", "utf8");

  assert.match(store, /event\.type === 'progress'/);
  assert.match(chat, /isAgentProgressContent/);
  assert.match(chat, /isShimmeringProgress/);
  assert.doesNotMatch(chat, /store\.sending[\s\S]*agent-chat-view__status-text--shimmer/);
});
```

- [ ] **Step 3: Add feats-map tracking**

Create `feats-map/agent-intent-router-2026-06-04.md` with checked items mirroring Tasks 1-3 and verification commands.

- [ ] **Step 4: Run verification**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/intent/agent-intent-router.test.ts
node --test src/core/modules/agent-runtime/agent-runner.test.ts
node --test src/core/routes/agent-panel.routes.test.ts
cd ../client-vue
node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts
npm run build
cd ../server
npm run build
cd ..
git diff --check -- server/src/core/modules/agent-runtime/intent/agent-intent-router.ts server/src/core/modules/agent-runtime/intent/agent-intent-router.test.ts server/src/core/modules/agent-runtime/agent-runner.ts server/src/core/modules/agent-runtime/agent-runner.test.ts server/src/core/routes/agent-panel.routes.test.ts client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts feats-map/agent-intent-router-2026-06-04.md
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

Commit:

```bash
git add server/src/core/routes/agent-panel.routes.test.ts client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts feats-map/agent-intent-router-2026-06-04.md
git commit -m "test: cover agent intent routing in panel"
```

---

## Self-Review

- Spec coverage: router before planner, strict JSON, low-confidence fallback, invalid-output fallback, no schemas in router prompt, no progress for chat, preserved tool planning path.
- Placeholder scan: no unresolved placeholder markers or file names.
- Type consistency: `AgentIntentDecision.mode` uses `chat | tool_plan`; runner tests use `routeIntent`; prompt catalog fields match spec.
