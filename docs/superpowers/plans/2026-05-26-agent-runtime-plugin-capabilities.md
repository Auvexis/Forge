# Agent Runtime Plugin Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove OpenAI/OpenRouter and memory-provider hardcoding from Sailor Core by making Agent Chat Model, Memory, and Tool availability manifest-driven through explicit plugin capabilities.

**Architecture:** Core owns only generic agent adapters and validation. Plugins remain generic and declare capabilities in `manifest.metadata.agentCapabilities`; Core reads those declarations through plugin manager/manifest adapters and never branches on specific plugin ids. Existing workflows using `provider: "openai" | "openrouter"` are accepted through a narrow compatibility migration path and saved forward into the new generic shape.

**Tech Stack:** TypeScript, Zod, AJV JSON Schema, Vue 3, Pinia, Node test runner, existing Sailor plugin loader/manager, existing LangChain OpenAI-compatible adapter.

---

## Hard Rules From `DEFAULT_PROMPT.md`

- Stay on branch `dev`.
- Create and maintain `feats-map/agent-runtime-plugin-capabilities.md`.
- Use TDD before implementation.
- Keep plugins isolated: plugins do not import Core, engines, or other plugins.
- Core/engine may communicate with plugins only through existing plugin manager/executor boundaries.
- Commit after each completed task.

## Current Problem

- `server/src/shared/models/workflow-types.ts` restricts `AiModelNode.provider` to `"openai" | "openrouter"`.
- `server/src/core/modules/agent-runtime/model-provider-registry.ts` registers OpenAI/OpenRouter directly.
- `server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts` is mostly generic, but its public options and fallback credential behavior still assume OpenAI/OpenRouter ids.
- `server/src/core/modules/workflows/workflow-validation.ts` rejects any model provider except OpenAI/OpenRouter.
- `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue` contains hardcoded Chat Model and Memory presets.
- `client-vue/src/features/workflow-editor/components/settings/editors/AiModelEditor.vue` contains a fixed provider select.
- Manifest validation currently supports method-level `agentTool`, but not plugin-level `agentCapabilities`.

## Target Contracts

### Manifest Metadata

Add optional plugin-level capability metadata:

```json
{
  "metadata": {
    "id": "openai",
    "name": "OpenAI",
    "agentCapabilities": {
      "chatModel": {
        "enabled": true,
        "adapter": "openai-compatible",
        "label": "OpenAI Chat Model",
        "description": "Use OpenAI-compatible chat completions.",
        "defaultModel": "gpt-4.1-mini",
        "defaultBaseUrl": "https://api.openai.com/v1",
        "credentialPluginId": "openai"
      },
      "memoryStore": {
        "enabled": false
      }
    }
  }
}
```

Rules:

- `agentCapabilities` is optional.
- `chatModel.enabled === true` requires `adapter`, `label`, `description`, and `defaultModel`.
- `chatModel.adapter` initially supports only `"openai-compatible"`.
- `chatModel.defaultBaseUrl` is optional URL.
- `chatModel.credentialPluginId` is optional and defaults to manifest `metadata.id`.
- `memoryStore.enabled === true` requires `adapter`, `label`, and `description`.
- `memoryStore.adapter` initially supports only `"sailor-internal"` and `"plugin-memory-store"`.
- Method-level `agentTool` remains unchanged.

### Workflow Node Shape

New Chat Model config:

```ts
export type AgentModelAdapter = "openai-compatible";

export interface AiModelNode extends WorkflowNodeBase {
  type: "ai-model";
  pluginId: string;
  adapter: AgentModelAdapter;
  model: string;
  temperature: number;
  maxTokens?: number;
  credentialId?: string;
  baseUrl?: string;
}
```

Temporary legacy input accepted:

```ts
{
  type: "ai-model",
  provider: "openai" | "openrouter",
  model: string
}
```

Legacy configs must normalize to:

```ts
{
  type: "ai-model",
  pluginId: provider,
  adapter: "openai-compatible",
  model,
  baseUrl
}
```

### Memory Node Shape

Keep Sailor internal memory first:

```ts
export interface AiMemoryNode extends WorkflowNodeBase {
  type: "ai-memory";
  scope: AgentMemoryScope;
  readEnabled: boolean;
  writeEnabled: boolean;
  maxRetrievedMemories: number;
  maxMemoryChars: number;
  pluginId?: string;
  adapter?: "sailor-internal" | "plugin-memory-store";
}
```

`plugin-memory-store` is discoverable but not wired into runtime until a later implementation task explicitly adds execution support. The first pass must not fake plugin memory execution.

---

## File Structure

### Backend Modify

- `server/src/core/modules/plugins/loader.ts`
  - Extend local AJV schema overlay with `metadata.agentCapabilities`.
- `server/src/core/modules/plugins/loader.test.ts`
  - Validate accepted/rejected capability JSON Schema cases.
- `server/src/plugins/_template/manifest.json`
  - Document disabled capability examples.
- `server/src/plugins/sailor/openai/manifest.json`
  - Declare `chatModel` capability with `openai-compatible`.
- `server/src/plugins/sailor/openrouter/manifest.json`
  - Declare `chatModel` capability with `openai-compatible`.
- `server/src/plugins/sailor/ollama/manifest.json`
  - Declare `chatModel` capability only if current runtime can support its OpenAI-compatible endpoint; otherwise leave disabled and add a note in template/docs.
- `server/src/shared/models/workflow-types.ts`
  - Replace provider union with `pluginId` + `adapter`.
- `server/src/shared/models/workflow-agent-types.test.ts`
  - Add contract coverage for generic model config.
- `server/src/core/modules/agent-runtime/agent-types.ts`
  - Mirror generic `AiModelNodeConfig`.
- `server/src/core/modules/agent-runtime/agent-validation.ts`
  - Validate generic adapter config and normalize legacy config.
- `server/src/core/modules/agent-runtime/agent-validation.test.ts`
  - Cover generic config, legacy config, and invalid adapter/pluginId.
- `server/src/core/modules/agent-runtime/model-provider-registry.ts`
  - Resolve providers by adapter and plugin manifest capability, not provider ids.
- `server/src/core/modules/agent-runtime/model-provider-registry.test.ts`
  - Prove Core does not hardcode OpenAI/OpenRouter ids.
- `server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts`
  - Rename semantics from provider id to plugin/capability input.
- `server/src/core/modules/workflows/workflow-validation.ts`
  - Accept generic `ai-model` nodes.
- `server/src/core/modules/workflows/workflow-validation.test.ts`
  - Reject missing `pluginId`, missing `adapter`, and unsupported adapters.

### Frontend Modify

- `client-vue/src/core/types/plugin.types.ts`
  - Add `PluginAgentCapabilities` types.
- `client-vue/src/core/types/workflow.types.ts`
  - Mirror generic AI model/memory node shape if present.
- `client-vue/src/features/agent-runtime/types/agent.types.ts`
  - Add frontend agent capability types if API contracts use them.
- `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
  - Replace hardcoded Chat Model presets with plugins filtered by `manifest.metadata.agentCapabilities.chatModel.enabled`.
  - Keep internal Sailor memory presets, then optionally list plugin memory capabilities separately.
- `client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`
  - Assert Chat Models are manifest-driven and OpenAI/OpenRouter literals are not required.
- `client-vue/src/features/workflow-editor/components/settings/editors/AiModelEditor.vue`
  - Remove fixed provider select and show plugin/capability identity as read-only context.
- `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts`
  - Assert model editor does not hardcode OpenAI/OpenRouter provider options.
- `client-vue/src/features/workflow-editor/components/settings/NodeInspectorModal.vue`
  - Continue resolving auth from `pluginId`; remove fallback from `provider`.

### Docs And Tracking

- `docs/agent-runtime.md`
  - Document manifest-driven capabilities and generic adapter boundary.
- `docs/superpowers/plans/2026-05-25-agent-tools-chat-trigger-memory.md`
  - Add follow-up note pointing to this plan.
- `feats-map/agent-runtime-plugin-capabilities.md`
  - Track tasks and verification.

---

## Implementation Tasks

### Task 1: Capability Schema Contracts

**Files:**
- Modify: `server/src/core/modules/plugins/loader.test.ts`
- Modify: `server/src/core/modules/plugins/loader.ts`
- Modify: `server/src/plugins/_template/manifest.json`

- [ ] **Step 1: Write failing manifest validation tests**

Add tests to `server/src/core/modules/plugins/loader.test.ts`:

```ts
it("accepts plugin-level agent chat model capability metadata", () => {
  const manifest = validManifest({
    metadata: {
      agentCapabilities: {
        chatModel: {
          enabled: true,
          adapter: "openai-compatible",
          label: "Generic Chat Model",
          description: "Use a generic OpenAI-compatible chat model.",
          defaultModel: "gpt-4.1-mini",
          defaultBaseUrl: "https://api.example.com/v1",
          credentialPluginId: "generic-ai",
        },
      },
    },
  });

  assert.deepEqual(validateManifest(manifest), []);
});

it("rejects enabled chat model capabilities without required metadata", () => {
  const manifest = validManifest({
    metadata: {
      agentCapabilities: {
        chatModel: {
          enabled: true,
          adapter: "openai-compatible",
        },
      },
    },
  });

  assert.match(validateManifest(manifest).join("\n"), /chatModel/);
  assert.match(validateManifest(manifest).join("\n"), /label|description|defaultModel/);
});

it("rejects unsupported agent model adapters", () => {
  const manifest = validManifest({
    metadata: {
      agentCapabilities: {
        chatModel: {
          enabled: true,
          adapter: "hardcoded-openai",
          label: "Bad Model",
          description: "This model uses an unsupported adapter.",
          defaultModel: "x",
        },
      },
    },
  });

  assert.match(validateManifest(manifest).join("\n"), /openai-compatible/);
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
cd server
node --test src/core/modules/plugins/loader.test.ts
```

Expected: FAIL because `agentCapabilities` is not allowed by the manifest JSON Schema overlay.

- [ ] **Step 3: Extend JSON Schema overlay**

In `buildSailorManifestSchema()` inside `server/src/core/modules/plugins/loader.ts`, add `schema.properties.metadata.properties.agentCapabilities` with this shape:

```ts
schema.properties.metadata.properties.agentCapabilities = {
  type: "object",
  additionalProperties: false,
  properties: {
    chatModel: {
      type: "object",
      required: ["enabled"],
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        adapter: { enum: ["openai-compatible"] },
        label: { type: "string", minLength: 2, maxLength: 120 },
        description: { type: "string", minLength: 20, maxLength: 1000 },
        defaultModel: { type: "string", minLength: 1, maxLength: 200 },
        defaultBaseUrl: { type: "string", format: "uri" },
        credentialPluginId: { type: "string", minLength: 1, maxLength: 120 },
      },
      if: {
        properties: { enabled: { const: true } },
        required: ["enabled"],
      },
      then: {
        required: ["adapter", "label", "description", "defaultModel"],
      },
    },
    memoryStore: {
      type: "object",
      required: ["enabled"],
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        adapter: { enum: ["sailor-internal", "plugin-memory-store"] },
        label: { type: "string", minLength: 2, maxLength: 120 },
        description: { type: "string", minLength: 20, maxLength: 1000 },
      },
      if: {
        properties: { enabled: { const: true } },
        required: ["enabled"],
      },
      then: {
        required: ["adapter", "label", "description"],
      },
    },
  },
};
```

- [ ] **Step 4: Update plugin template**

Add disabled examples to `server/src/plugins/_template/manifest.json` under `metadata`:

```json
"agentCapabilities": {
  "chatModel": {
    "enabled": false
  },
  "memoryStore": {
    "enabled": false
  }
}
```

- [ ] **Step 5: Verify**

Run:

```bash
cd server
node --test src/core/modules/plugins/loader.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Update task map and commit**

```bash
git add server/src/core/modules/plugins/loader.ts server/src/core/modules/plugins/loader.test.ts server/src/plugins/_template/manifest.json feats-map/agent-runtime-plugin-capabilities.md
git commit -m "feat: validate agent capability manifest metadata"
```

### Task 2: Plugin Capability Declarations

**Files:**
- Modify: `server/src/plugins/sailor/openai/manifest.json`
- Modify: `server/src/plugins/sailor/openrouter/manifest.json`
- Modify: `server/src/plugins/sailor/ollama/manifest.json` only if it is OpenAI-compatible today
- Modify: `server/src/core/modules/plugins/loader.test.ts`

- [ ] **Step 1: Add fixture test for internal AI provider manifests**

Add a test that loads/validates the OpenAI and OpenRouter manifests through `validateManifest`.

- [ ] **Step 2: Run and confirm current manifests pass without capability**

Run:

```bash
cd server
node --test src/core/modules/plugins/loader.test.ts
```

Expected: PASS before capability is required globally.

- [ ] **Step 3: Add OpenAI capability**

In `server/src/plugins/sailor/openai/manifest.json`, add:

```json
"agentCapabilities": {
  "chatModel": {
    "enabled": true,
    "adapter": "openai-compatible",
    "label": "OpenAI Chat Model",
    "description": "Use OpenAI-compatible chat completions as an Agent Chat Model.",
    "defaultModel": "gpt-4.1-mini",
    "defaultBaseUrl": "https://api.openai.com/v1",
    "credentialPluginId": "openai"
  }
}
```

- [ ] **Step 4: Add OpenRouter capability**

In `server/src/plugins/sailor/openrouter/manifest.json`, add:

```json
"agentCapabilities": {
  "chatModel": {
    "enabled": true,
    "adapter": "openai-compatible",
    "label": "OpenRouter Chat Model",
    "description": "Use OpenRouter's OpenAI-compatible API as an Agent Chat Model.",
    "defaultModel": "openai/gpt-4.1-mini",
    "defaultBaseUrl": "https://openrouter.ai/api/v1",
    "credentialPluginId": "openrouter"
  }
}
```

- [ ] **Step 5: Decide Ollama from actual manifest/runtime**

If `server/src/plugins/sailor/ollama/manifest.json` already points to an OpenAI-compatible local endpoint, add:

```json
"agentCapabilities": {
  "chatModel": {
    "enabled": true,
    "adapter": "openai-compatible",
    "label": "Ollama Chat Model",
    "description": "Use a local Ollama OpenAI-compatible endpoint as an Agent Chat Model.",
    "defaultModel": "llama3.1",
    "defaultBaseUrl": "http://localhost:11434/v1",
    "credentialPluginId": "ollama"
  }
}
```

If it is not currently compatible, leave it disabled.

- [ ] **Step 6: Verify**

Run:

```bash
cd server
node --test src/core/modules/plugins/loader.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 7: Update task map and commit**

```bash
git add server/src/plugins/sailor/openai/manifest.json server/src/plugins/sailor/openrouter/manifest.json server/src/plugins/sailor/ollama/manifest.json server/src/core/modules/plugins/loader.test.ts feats-map/agent-runtime-plugin-capabilities.md
git commit -m "feat: declare agent chat model capabilities"
```

### Task 3: Generic Backend AI Model Contract

**Files:**
- Modify: `server/src/shared/models/workflow-types.ts`
- Modify: `server/src/shared/models/workflow-agent-types.test.ts`
- Modify: `server/src/core/modules/agent-runtime/agent-types.ts`
- Modify: `server/src/core/modules/agent-runtime/agent-validation.ts`
- Modify: `server/src/core/modules/agent-runtime/agent-validation.test.ts`

- [ ] **Step 1: Write failing type/validation tests**

Tests must prove:

- valid model config uses `pluginId` and `adapter`;
- legacy config with `provider: "openai"` still validates through normalization;
- unsupported adapter fails;
- missing `pluginId` fails for new config.

- [ ] **Step 2: Run failing tests**

```bash
cd server
node --test src/shared/models/workflow-agent-types.test.ts src/core/modules/agent-runtime/agent-validation.test.ts
```

Expected: FAIL due old provider-only contract.

- [ ] **Step 3: Update shared/domain types**

Add:

```ts
export type AgentModelAdapter = "openai-compatible";
```

Replace `provider` in `AiModelNode` and `AiModelNodeConfig` with:

```ts
pluginId: string;
adapter: AgentModelAdapter;
```

Keep `model`, `temperature`, `maxTokens`, `credentialId`, and `baseUrl`.

- [ ] **Step 4: Add normalization helper**

In `agent-validation.ts`, add:

```ts
function normalizeLegacyAiModel(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const value = input as Record<string, unknown>;
  if (value.type !== "ai-model") return input;
  if (typeof value.pluginId === "string" && typeof value.adapter === "string") return input;
  if (value.provider === "openai" || value.provider === "openrouter") {
    return {
      ...value,
      pluginId: value.provider,
      adapter: "openai-compatible",
    };
  }
  return input;
}
```

Use it inside `validateAiModelConfig`.

- [ ] **Step 5: Verify**

```bash
cd server
node --test src/shared/models/workflow-agent-types.test.ts src/core/modules/agent-runtime/agent-validation.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Update task map and commit**

```bash
git add server/src/shared/models/workflow-types.ts server/src/shared/models/workflow-agent-types.test.ts server/src/core/modules/agent-runtime/agent-types.ts server/src/core/modules/agent-runtime/agent-validation.ts server/src/core/modules/agent-runtime/agent-validation.test.ts feats-map/agent-runtime-plugin-capabilities.md
git commit -m "feat: make ai model config plugin capability based"
```

### Task 4: Generic Model Provider Registry

**Files:**
- Modify: `server/src/core/modules/agent-runtime/model-provider-registry.ts`
- Modify: `server/src/core/modules/agent-runtime/model-provider-registry.test.ts`
- Modify: `server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts`

- [ ] **Step 1: Write failing registry tests**

Tests must assert:

- registry creates a model for arbitrary plugin id `generic-ai` when adapter is `openai-compatible`;
- credentials fall back to `credentialPluginId` or `pluginId`;
- no test requires provider id `"openai"` or `"openrouter"`;
- unknown adapter fails with `AGENT_MODEL_PROVIDER_UNKNOWN`.

- [ ] **Step 2: Run failing tests**

```bash
cd server
node --test src/core/modules/agent-runtime/model-provider-registry.test.ts
```

Expected: FAIL because registry registers fixed ids.

- [ ] **Step 3: Change registry to adapter map**

The registry should map:

```ts
const adapters = new Map<string, AgentModelAdapterProvider>();
adapters.set("openai-compatible", new OpenAiCompatibleProvider({ credentialResolver }));
```

`createChatModel(config)` must select by `config.adapter`, not `config.provider`.

- [ ] **Step 4: Change OpenAI-compatible provider input**

Provider must use:

```ts
const credentialLookupId = config.credentialId ?? config.pluginId;
const credentials = this.credentialResolver(credentialLookupId);
```

No `this.id`, no `"openrouter"` branch. `baseUrl` comes from normalized config/capability.

- [ ] **Step 5: Verify**

```bash
cd server
node --test src/core/modules/agent-runtime/model-provider-registry.test.ts src/core/modules/agent-runtime/agent-runner.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 6: Update task map and commit**

```bash
git add server/src/core/modules/agent-runtime/model-provider-registry.ts server/src/core/modules/agent-runtime/model-provider-registry.test.ts server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts feats-map/agent-runtime-plugin-capabilities.md
git commit -m "refactor: resolve agent models by adapter"
```

### Task 5: Workflow Validation Compatibility

**Files:**
- Modify: `server/src/core/modules/workflows/workflow-validation.ts`
- Modify: `server/src/core/modules/workflows/workflow-validation.test.ts`
- Modify: `server/src/core/modules/workflows/agent-config-node-execution.test.ts`
- Modify: `server/src/core/nodes/handlers/ai-agent.test.ts`

- [ ] **Step 1: Write failing workflow validation tests**

Add cases:

- generic `ai-model` with `pluginId` and `adapter` passes;
- legacy `provider: "openai"` passes for backward compatibility;
- `provider: "random"` fails with a migration-oriented message;
- missing `pluginId` in new config fails.

- [ ] **Step 2: Run failing tests**

```bash
cd server
node --test src/core/modules/workflows/workflow-validation.test.ts src/core/modules/workflows/agent-config-node-execution.test.ts src/core/nodes/handlers/ai-agent.test.ts
```

Expected: FAIL until validation accepts new shape.

- [ ] **Step 3: Update validation**

For `ai-model`, accept:

```ts
if ("provider" in node && (node.provider === "openai" || node.provider === "openrouter")) return null;
if (!node.pluginId || typeof node.pluginId !== "string") return `AI Model node "${nodeId}" must have pluginId`;
if (node.adapter !== "openai-compatible") return `AI Model node "${nodeId}" must have a supported adapter`;
```

- [ ] **Step 4: Verify**

```bash
cd server
node --test src/core/modules/workflows/workflow-validation.test.ts src/core/modules/workflows/agent-config-node-execution.test.ts src/core/nodes/handlers/ai-agent.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 5: Update task map and commit**

```bash
git add server/src/core/modules/workflows/workflow-validation.ts server/src/core/modules/workflows/workflow-validation.test.ts server/src/core/modules/workflows/agent-config-node-execution.test.ts server/src/core/nodes/handlers/ai-agent.test.ts feats-map/agent-runtime-plugin-capabilities.md
git commit -m "fix: validate generic ai model nodes"
```

### Task 6: Frontend Plugin Capability Types

**Files:**
- Modify: `client-vue/src/core/types/plugin.types.ts`
- Modify: `client-vue/src/core/types/workflow.types.ts`
- Modify: `client-vue/src/features/agent-runtime/types/agent.types.ts`

- [ ] **Step 1: Add type contract tests where existing type tests live**

If no type contract test exists, add assertions to the closest existing frontend contract test that reads source and checks for `agentCapabilities`, `chatModel`, `memoryStore`, `pluginId`, and `adapter`.

- [ ] **Step 2: Run failing contract tests**

```bash
cd client-vue
node --test src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts
```

Expected: FAIL until frontend code references capability types.

- [ ] **Step 3: Add frontend types**

Add:

```ts
export type AgentModelAdapter = 'openai-compatible'
export type AgentMemoryAdapter = 'sailor-internal' | 'plugin-memory-store'

export interface PluginAgentChatModelCapability {
  enabled: boolean
  adapter?: AgentModelAdapter
  label?: string
  description?: string
  defaultModel?: string
  defaultBaseUrl?: string
  credentialPluginId?: string
}

export interface PluginAgentMemoryStoreCapability {
  enabled: boolean
  adapter?: AgentMemoryAdapter
  label?: string
  description?: string
}

export interface PluginAgentCapabilities {
  chatModel?: PluginAgentChatModelCapability
  memoryStore?: PluginAgentMemoryStoreCapability
}
```

Add `agentCapabilities?: PluginAgentCapabilities` to `PluginMetadata`.

- [ ] **Step 4: Verify**

```bash
cd client-vue
npm run type-check
```

Expected: PASS after downstream changes or expected failures only in files covered by later tasks.

- [ ] **Step 5: Update task map and commit**

```bash
git add client-vue/src/core/types/plugin.types.ts client-vue/src/core/types/workflow.types.ts client-vue/src/features/agent-runtime/types/agent.types.ts client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts client-vue/src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts feats-map/agent-runtime-plugin-capabilities.md
git commit -m "feat: add frontend agent capability types"
```

### Task 7: Manifest-Driven Add Node Panel

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`

- [ ] **Step 1: Write failing panel contracts**

Contracts must assert:

- no `AGENT_MODEL_PRESETS` constant remains;
- no hardcoded `OpenAI Chat Model`/`OpenRouter Chat Model` array drives Chat Models;
- Chat Models filter uses `manifest.metadata.agentCapabilities.chatModel.enabled`;
- defaults include `pluginId`, `adapter`, `model`, and `baseUrl`;
- Tools still filter by method-level `agentTool.enabled`.

- [ ] **Step 2: Run failing tests**

```bash
cd client-vue
node --test src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Replace chat model presets**

Create computed:

```ts
const agentChatModelPlugins = computed(() =>
  filteredPlugins.value.filter((plugin) =>
    plugin.manifest.metadata.agentCapabilities?.chatModel?.enabled === true &&
    plugin.manifest.metadata.agentCapabilities.chatModel.adapter === 'openai-compatible',
  ),
)
```

When clicked, create:

```ts
const capability = plugin.manifest.metadata.agentCapabilities!.chatModel!
props.onAddLogicNode?.('ai-model' as WorkflowNodeType, {
  name: capability.label || `${plugin.manifest.metadata.name} Chat Model`,
  pluginId: capability.credentialPluginId || plugin.manifest.metadata.id,
  adapter: capability.adapter,
  model: capability.defaultModel,
  baseUrl: capability.defaultBaseUrl,
})
```

- [ ] **Step 4: Keep memory honest**

Keep internal memory presets as Sailor-owned presets. Only list plugin memory capability entries if `memoryStore.enabled === true`, and create nodes with `adapter: "plugin-memory-store"` but display disabled/help text until runtime support is implemented.

- [ ] **Step 5: Verify**

```bash
cd client-vue
node --test src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts
npm run type-check
npm run build-only
```

Expected: PASS.

- [ ] **Step 6: Update task map and commit**

```bash
git add client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts feats-map/agent-runtime-plugin-capabilities.md
git commit -m "feat: discover agent chat models from plugin manifests"
```

### Task 8: Generic AI Model Editor And Auth Resolution

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/AiModelEditor.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/NodeInspectorModal.vue`

- [ ] **Step 1: Write failing editor contracts**

Assert:

- `AiModelEditor.vue` has no fixed provider select options for OpenAI/OpenRouter;
- editor displays `pluginId` and `adapter` context;
- model/baseUrl remain editable;
- auth resolution in `NodeInspectorModal.vue` uses `node.data.pluginId` for `ai-model`.

- [ ] **Step 2: Run failing tests**

```bash
cd client-vue
node --test src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Update editor**

Remove provider select. Render read-only fields or compact note:

```vue
<EditorField label="Provider Plugin">
  <BaseInput :model-value="(node.data.pluginId as string) || ''" disabled />
</EditorField>

<EditorField label="Adapter">
  <BaseInput :model-value="(node.data.adapter as string) || 'openai-compatible'" disabled />
</EditorField>
```

- [ ] **Step 4: Update auth resolution**

For `ai-model`, resolve auth plugin id from:

```ts
node.data.pluginId
```

Remove provider fallback.

- [ ] **Step 5: Verify**

```bash
cd client-vue
node --test src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts
npm run type-check
npm run build-only
```

Expected: PASS.

- [ ] **Step 6: Update task map and commit**

```bash
git add client-vue/src/features/workflow-editor/components/settings/editors/AiModelEditor.vue client-vue/src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts client-vue/src/features/workflow-editor/components/settings/NodeInspectorModal.vue feats-map/agent-runtime-plugin-capabilities.md
git commit -m "fix: make ai model editor plugin capability based"
```

### Task 9: Documentation And Legacy Cleanup

**Files:**
- Modify: `docs/agent-runtime.md`
- Modify: `docs/superpowers/plans/2026-05-25-agent-tools-chat-trigger-memory.md`
- Modify: `feats-map/agent-runtime-plugin-capabilities.md`

- [ ] **Step 1: Document the boundary**

In `docs/agent-runtime.md`, add:

```md
Agent Chat Models are discovered from `manifest.metadata.agentCapabilities.chatModel`.
Core selects a generic adapter such as `openai-compatible`; it does not hardcode plugin ids like OpenAI or OpenRouter.
Plugins declare capability metadata but do not import or call agent runtime code.
```

- [ ] **Step 2: Add follow-up note to old plan**

Add a short note near Task 50:

```md
Follow-up plan: `docs/superpowers/plans/2026-05-26-agent-runtime-plugin-capabilities.md` removes provider-specific Core/UI assumptions and moves Chat Model discovery to plugin manifest capabilities.
```

- [ ] **Step 3: Search for forbidden hardcoding**

Run:

```bash
rg -n "provider: \"openai\"|provider: 'openai'|openrouter|OpenRouter|AGENT_MODEL_PRESETS|provider === \"openrouter\"|provider === 'openrouter'" server/src client-vue/src docs -S
```

Expected: remaining matches are only legacy tests, plugin manifests, docs explaining migration, or literal plugin data.

- [ ] **Step 4: Verify**

Run:

```bash
cd server
node --test src/core/modules/agent-runtime/*.test.ts src/core/modules/agent-runtime/**/*.test.ts src/core/modules/workflows/*.test.ts src/core/modules/plugins/loader.test.ts
npm run build
cd ../client-vue
node --test src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts
npm run type-check
npm run build-only
```

Expected: PASS.

- [ ] **Step 5: Update task map and commit**

```bash
git add docs/agent-runtime.md docs/superpowers/plans/2026-05-25-agent-tools-chat-trigger-memory.md feats-map/agent-runtime-plugin-capabilities.md
git commit -m "docs: document agent plugin capability boundary"
```

### Task 10: Full Verification

**Files:**
- Modify only files required by failed checks.
- Modify: `feats-map/agent-runtime-plugin-capabilities.md`

- [ ] **Step 1: Run backend agent and plugin suites**

```bash
cd server
node --test src/core/modules/plugins/loader.test.ts src/core/modules/agent-runtime/*.test.ts src/core/modules/agent-runtime/**/*.test.ts src/core/modules/workflows/agent-config-node-execution.test.ts src/core/nodes/handlers/ai-agent.test.ts src/core/routes/agent-chat*.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 2: Run frontend agent editor suites**

```bash
cd client-vue
node --test src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts src/features/workflow-editor/components/nodes/__tests__/agentNodes.contract.test.ts
npm run type-check
npm run build-only
```

Expected: PASS.

- [ ] **Step 3: Run audit**

```bash
cd server
npm audit --omit=dev --audit-level=high
```

Expected: exit 0.

- [ ] **Step 4: Manual smoke**

Smoke:

- Open Workflow Editor.
- Add AI Agent.
- Add Chat Model from the Agent `Chat Model*` handle.
- Confirm available chat models come from plugins with `agentCapabilities.chatModel.enabled`.
- Confirm no Chat Model option appears for plugins without that metadata.
- Configure OpenAI/OpenRouter credentials from Node Settings via `pluginId`.
- Send a chat message through active dev session.
- Confirm agent response arrives and provider credentials are not shown in logs/events/UI.

- [ ] **Step 5: Mark complete and commit**

```bash
git add feats-map/agent-runtime-plugin-capabilities.md
git commit -m "test: verify agent plugin capabilities"
```

---

## Safety Checklist

- [ ] Core does not branch on OpenAI/OpenRouter plugin ids for model creation.
- [ ] Core branches only on generic adapter names.
- [ ] Plugin manifest JSON Schema accepts `agentCapabilities`.
- [ ] Enabled capabilities require enough metadata for UI and runtime.
- [ ] Chat Model UI is manifest-driven.
- [ ] Method-level `agentTool` remains explicit opt-in.
- [ ] Existing workflows with OpenAI/OpenRouter provider config still run during migration.
- [ ] Model API keys are read from credential store only.
- [ ] Model API keys are never logged or serialized.
- [ ] Plugin memory capabilities are not advertised as executable unless runtime support exists.

## Self-Review

- Spec coverage: covers JSON Schema, backend contracts, runtime registry, workflow validation, frontend discovery/editor changes, docs, migration compatibility, and verification.
- Placeholder scan: no unresolved placeholder markers.
- Type consistency: uses `agentCapabilities`, `chatModel`, `memoryStore`, `pluginId`, `adapter`, and `openai-compatible` consistently.
- Scope check: this is one cohesive architecture correction; plugin-backed memory execution is explicitly deferred to avoid fake support.
