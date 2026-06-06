# OpenAI Adapter Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale OpenAI-compatible LangChain provider with a first-class OpenAI model adapter that works with the current Agent Runtime contract and improves JSON/tool decisions without depending on local GPU models.

**Architecture:** The runtime keeps a generic `AgentModelAdapter` contract. OpenAI gets its own adapter/provider files under `server/src/core/modules/agent-runtime/model-adapters/`, while plugin-specific OpenAI methods remain inside `server/src/plugins/sailor/openai/` and are not used as core runtime logic.

**Tech Stack:** TypeScript, Node fetch, Agent Runtime model adapter contract, OpenAI Responses/structured JSON HTTP API, Node test runner.

---

## Rules For This Plan

- Stay on branch `dev`.
- Do TDD before implementation.
- Touch only files required for this adapter rewrite.
- Do not add Drive/Gmail/YouTube/plugin-specific logic to Core.
- Do not break `ollama` or `generic` adapters.
- Do not log API keys, prompts with secrets, binary data, buffers, base64, blobs, or file contents.
- After each task passes, mark it complete here and commit.
- Work in batches of 3 tasks.

## Files

- Delete or replace: `server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts`
- Create: `server/src/core/modules/agent-runtime/model-adapters/openai-adapter.ts`
- Create: `server/src/core/modules/agent-runtime/model-adapters/openai-model-provider.ts`
- Create: `server/src/core/modules/agent-runtime/model-adapters/openai-adapter.test.ts`
- Modify: `server/src/core/modules/agent-runtime/model-provider-registry.ts`
- Modify: `server/src/core/modules/agent-runtime/model-provider-registry.test.ts`
- Modify if needed: `server/src/core/modules/agent-runtime/agent-validation.ts`
- Modify if needed: `server/src/core/modules/agent-runtime/agent-validation.test.ts`
- Modify if needed: `server/src/shared/models/workflow-types.ts`
- Modify if needed: `server/src/core/modules/plugins/loader.ts`

---

### Task 1: Remove Old Provider Boundary And Lock The Contract

**Files:**
- Modify: `server/src/core/modules/agent-runtime/model-provider-registry.test.ts`
- Modify if needed: `server/src/core/modules/agent-runtime/agent-validation.test.ts`
- Modify if needed: `server/src/core/modules/plugins/loader.test.ts`
- Inspect: `server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts`

- [x] **Step 1: Write failing registry tests for the new OpenAI provider boundary**

Add tests proving:

```ts
it("registers the first-class OpenAI model provider for openai-compatible configs", async () => {
  const registry = new AgentModelProviderRegistry({
    credentialResolver: () => ({ api_key: "sk-test" }),
    fetch: async () => new Response(JSON.stringify({ output_text: "ok" })),
  });

  const model = await registry.createChatModel({
    pluginId: "openai",
    adapter: "openai-compatible",
    model: "gpt-4.1-mini",
    temperature: 0.2,
    maxTokens: 512,
  });

  assert.equal(typeof (model as any).invoke, "function");
  assert.equal(typeof (model as any).invokeJson, "function");
  assert.equal(typeof (model as any).generateFinalResponse, "function");
});
```

Also assert that `generic` and `ollama` still resolve from the registry.

- [x] **Step 2: Run the focused tests and confirm red**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/model-provider-registry.test.ts
```

Expected: FAIL because the registry has no fetch-injected first-class OpenAI provider yet and still imports the old provider path.

- [x] **Step 3: Map the old provider removal**

Confirm these old behaviors are covered before deletion:

```text
openai-compatible resolves credentials by credentialId first, then pluginId.
openai-compatible supports config.model, config.temperature, config.maxTokens, config.baseUrl.
generic can still allow local no-auth baseUrl.
secrets are redacted or never exposed.
```

- [x] **Step 4: Commit Task 1 test contract**

Run:

```powershell
git add server/src/core/modules/agent-runtime/model-provider-registry.test.ts server/src/core/modules/agent-runtime/agent-validation.test.ts server/src/core/modules/plugins/loader.test.ts feats-map/openai-adapter-rewrite-2026-06-06.md
git commit -m "test: lock openai adapter rewrite contract"
```

---

### Task 2: Build The New OpenAI Adapter

**Files:**
- Create: `server/src/core/modules/agent-runtime/model-adapters/openai-adapter.ts`
- Create: `server/src/core/modules/agent-runtime/model-adapters/openai-adapter.test.ts`
- Create: `server/src/core/modules/agent-runtime/model-adapters/openai-model-provider.ts`
- Delete: `server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts`

- [x] **Step 1: Write adapter tests with mocked fetch**

Cover these cases in `openai-adapter.test.ts`:

```ts
it("sends text requests to the OpenAI Responses API without thinking fields", async () => {
  const calls: Array<{ url: string; body: any; headers: any }> = [];
  const adapter = new OpenAiAdapter({
    fetch: async (url, init) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body)),
        headers: init?.headers,
      });
      return new Response(JSON.stringify({ output_text: "hello" }), { status: 200 });
    },
  });

  const result = await adapter.invokeText({
    model: "gpt-4.1-mini",
    credentials: { api_key: "sk-test" },
    messages: [{ role: "user", content: "oi" }],
    thinkingEnabled: true,
  });

  assert.equal(result, "hello");
  assert.equal(calls[0].body.model, "gpt-4.1-mini");
  assert.equal("think" in calls[0].body, false);
  assert.equal("thinking" in calls[0].body, false);
});
```

Also test:

```text
invokeJson sends text.format json_schema when schema is provided.
invokeJson parses valid object JSON.
invokeJson throws AgentRuntimeError with public message "Model returned invalid JSON" on invalid JSON.
API errors include status but not API key.
baseUrl overrides default API base.
abortSignal is passed to fetch.
createChatModel returns invoke/invokeJson/generatePlan/repairPlanStep/generateFinalResponse wrappers.
```

- [x] **Step 2: Run adapter tests and confirm red**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/model-adapters/openai-adapter.test.ts
```

Expected: FAIL because `OpenAiAdapter` does not exist yet.

- [x] **Step 3: Implement `OpenAiAdapter`**

Implement the adapter with these boundaries:

```ts
export class OpenAiAdapter implements AgentModelAdapter {
  invokeText(input: AgentModelInvokeInput): Promise<string>;
  invokeJson<T extends object>(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<T>;
  generatePlan(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<AgentPlan>;
  repairPlanStep(input: AgentModelInvokeInput, schema?: Record<string, any>): Promise<AgentStepRepair>;
  generateFinalResponse(input: AgentModelInvokeInput): Promise<string>;
  createChatModel(input: Omit<AgentModelInvokeInput, "messages">): RuntimeChatModel;
}
```

Use:

```text
POST {baseUrl || https://api.openai.com}/v1/responses
Authorization: Bearer <api key>
input: converted runtime messages
text.format: json_schema for structured JSON calls
max_output_tokens from maxTokens
temperature only when provided and model supports it
```

Do not add any plugin-specific parameter repair here.

- [x] **Step 4: Implement `OpenAiModelProvider`**

Move credential resolution from the old provider into the new provider:

```ts
export class OpenAiModelProvider implements AgentModelProvider {
  public readonly adapter = "openai-compatible";

  async createChatModel(config: AiModelNodeConfig) {
    const credentials = resolve by credentialId first, then pluginId;
    const apiKey = credentials?.api_key ?? credentials?.apiKey ?? credentials?.token;
    if (!apiKey) throw AgentRuntimeError("AGENT_MODEL_CREDENTIAL_MISSING");
    return this.openai.createChatModel({ model, baseUrl, credentials, temperature, maxTokens });
  }
}
```

Keep `generic` support either through this provider with `adapter: "generic"` and `allowLocalNoAuth: true`, or through a separate tiny provider if that is cleaner.

- [x] **Step 5: Run tests and commit Task 2**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/model-adapters/openai-adapter.test.ts
node --test src/core/modules/agent-runtime/model-provider-registry.test.ts
```

Expected: PASS.

Commit:

```powershell
git add server/src/core/modules/agent-runtime/model-adapters/openai-adapter.ts server/src/core/modules/agent-runtime/model-adapters/openai-adapter.test.ts server/src/core/modules/agent-runtime/model-adapters/openai-model-provider.ts server/src/core/modules/agent-runtime/model-provider-registry.ts server/src/core/modules/agent-runtime/model-provider-registry.test.ts server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts feats-map/openai-adapter-rewrite-2026-06-06.md
git commit -m "feat: add first-class openai model adapter"
```

---

### Task 3: Wire OpenAI Through Runtime, Validation, And UI Contracts

**Files:**
- Modify: `server/src/core/modules/agent-runtime/model-provider-registry.ts`
- Modify if needed: `server/src/core/modules/agent-runtime/agent-validation.ts`
- Modify if needed: `server/src/core/modules/workflows/workflow-validation.ts`
- Modify if needed: `server/src/shared/models/workflow-types.ts`
- Modify if needed: `server/src/core/modules/plugins/loader.ts`
- Modify focused frontend config files only if OpenAI selection is broken.

- [x] **Step 1: Write integration/validation tests**

Add or update tests proving:

```text
Legacy provider "openai" still migrates to pluginId "openai" + adapter "openai-compatible".
OpenAI plugin manifest still exposes chatModel adapter "openai-compatible".
OpenRouter/generic compatibility is not broken.
Ollama still uses OllamaAdapter and keeps think false unless explicitly enabled.
Agent runtime can call invokeJson through the new OpenAI adapter shape.
```

- [x] **Step 2: Run focused tests and confirm failures**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/agent-validation.test.ts
node --test src/core/modules/workflows/workflow-validation.test.ts
node --test src/core/modules/plugins/loader.test.ts
node --test src/core/modules/agent-runtime/agent-runner.test.ts
```

Expected: only OpenAI rewrite-related failures.

- [x] **Step 3: Wire registry and validation**

Update imports so registry uses:

```ts
import { OpenAiModelProvider } from "./model-adapters/openai-model-provider.ts";
```

and no longer imports:

```ts
import { OpenAiCompatibleProvider } from "./model-providers/openai-compatible-provider.ts";
```

Keep accepted adapter names stable unless a separate migration is planned:

```ts
type AgentModelAdapter = "openai-compatible" | "generic" | "ollama";
```

- [x] **Step 4: Verify focused backend suite**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/model-adapters/openai-adapter.test.ts
node --test src/core/modules/agent-runtime/model-provider-registry.test.ts
node --test src/core/modules/agent-runtime/agent-validation.test.ts
node --test src/core/modules/workflows/workflow-validation.test.ts
node --test src/core/modules/plugins/loader.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit Task 3**

Run:

```powershell
git add server/src/core/modules/agent-runtime server/src/core/modules/workflows server/src/core/modules/plugins server/src/shared/models feats-map/openai-adapter-rewrite-2026-06-06.md
git commit -m "chore: wire openai adapter through agent runtime"
```

---

## Stop Point

After Task 3, stop and test manually in the Global Chat Agent with:

```text
Boa tarde, quais ferramentas voce tem acesso?
```

and:

```text
Procure meu arquivo no Drive, baixe e envie por email.
```

Expected result: stronger OpenAI models produce fewer invalid JSON decisions, but the loop runtime must still keep retries, schema validation, approval, file refs, and cleanup generic.

---

## Batch 2

### Task 4: Align OpenAI Request Shape With Responses API

**Files:**
- Modify: `server/src/core/modules/agent-runtime/model-adapters/openai-adapter.ts`
- Modify: `server/src/core/modules/agent-runtime/model-adapters/openai-adapter.test.ts`

- [x] **Step 1: Write failing tests for system instructions and tool history**

Add tests proving:

```text
system messages are merged into the Responses API `instructions` field.
tool messages are flattened into readable user input, not sent as role "tool".
assistant/user messages stay in request order.
```

- [x] **Step 2: Run adapter tests and confirm red**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/model-adapters/openai-adapter.test.ts
```

Expected: FAIL until the adapter emits `instructions` and normalized tool history.

- [x] **Step 3: Implement request normalization**

Keep this generic:

```text
No plugin-specific tool names.
No provider-specific prompt hacks outside the adapter.
No binary/file contents in request logs.
```

- [x] **Step 4: Run adapter tests**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/model-adapters/openai-adapter.test.ts
```

Expected: PASS.

---

### Task 5: Update OpenAI Plugin Capability Copy

**Files:**
- Modify: `server/src/plugins/sailor/openai/manifest.json`
- Modify: `server/src/core/modules/plugins/loader.test.ts`

- [x] **Step 1: Write/adjust manifest contract**

Assert the internal OpenAI chat model capability describes the Responses API, not old Chat Completions behavior.

- [x] **Step 2: Update manifest copy**

Change only metadata/capability copy. Do not change method behavior in this task.

- [x] **Step 3: Run plugin loader tests**

Run:

```powershell
cd server
node --test src/core/modules/plugins/loader.test.ts
```

Expected: PASS.

---

### Task 6: Final Backend Verification For Batch 2

**Files:**
- Modify: `feats-map/openai-adapter-rewrite-2026-06-06.md`

- [x] **Step 1: Run focused backend tests**

Run:

```powershell
cd server
node --test src/core/modules/agent-runtime/model-adapters/openai-adapter.test.ts src/core/modules/agent-runtime/model-provider-registry.test.ts src/core/modules/plugins/loader.test.ts
```

Expected: PASS.

- [x] **Step 2: Run TypeScript build**

Run:

```powershell
cd server
npm run build
```

Expected: PASS.

- [x] **Step 3: Mark Batch 2 complete and commit**

Run:

```powershell
git add feats-map/openai-adapter-rewrite-2026-06-06.md server/src/core/modules/agent-runtime/model-adapters/openai-adapter.ts server/src/core/modules/agent-runtime/model-adapters/openai-adapter.test.ts server/src/plugins/sailor/openai/manifest.json server/src/core/modules/plugins/loader.test.ts
git commit -m "fix: align openai adapter responses contract"
```
