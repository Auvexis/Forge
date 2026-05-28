# Agent Chat Token Streaming Implementation Plan

Goal: stream assistant text into editor chat while preserving Sailor Core/plugin boundaries.

Expanded scope: keep OpenAI and OpenRouter working, add a generic configurable chat-model adapter, and expose Ollama as a Chat Model provider for local and cloud usage.

## Rules

- [ ] Stay on branch `dev`.
- [ ] Use TDD before production changes.
- [ ] Keep plugins isolated from Core, engines, and other plugins.
- [ ] Core remains generic: no OpenAI/plugin-specific chat UI logic.
- [ ] Commit after each completed implementation task.
- [ ] Streaming must be progressive enhancement: fallback to current non-streaming path.

## Architecture

- Core emits generic agent events, not provider events.
- Providers may expose `stream()` through a generic model interface; Core does not know plugin ids.
- `openai-compatible` stays supported for existing OpenAI/OpenRouter nodes.
- New `generic` adapter is endpoint-configurable by manifest/node config, not hardcoded by plugin id.
- `generic` must only promise OpenAI-compatible chat semantics unless a future adapter explicitly defines another protocol.
- Ollama Chat Model support should use generic/OpenAI-compatible transport with local API-key-free mode and cloud API-key mode.
- First safe scope: text output, no configured tools, no JSON output. Tool and JSON agent runs keep existing `invoke()` path.
- Frontend updates one assistant message per execution using stream deltas, then finalizes on `agent:end`.

## Task Map

- [x] Task 1: Streaming Event Contract
- [x] Task 2: Generic Streamable Model Interface
- [x] Task 2A: Generic Configurable Chat Model Adapter
- [ ] Task 2B: Ollama Chat Model Capability
- [ ] Task 2C: Ollama Plugin Methods And Cloud Credentials
- [ ] Task 3: Agent Graph Text Streaming
- [ ] Task 4: Runtime Event Sanitizing And Dev Session Forwarding
- [ ] Task 5: Frontend Incremental Chat Message Rendering
- [ ] Task 6: Status And Error Semantics
- [ ] Task 7: Verification And Smoke

## Task 1: Streaming Event Contract

**Files**
- Modify: `server/src/core/modules/agent-runtime/agent-types.ts`
- Modify: `server/src/core/modules/workflows/event-bus.ts`
- Modify: `server/src/core/modules/workflows/dev-session/types.ts`
- Test: `server/src/core/modules/workflows/dev-session/session-event-bus.test.ts`

**Steps**
- [x] Add failing test proving `agent:output-delta` is accepted and forwarded by session SSE.
- [x] Add `agent:output-delta` to `AgentEventType`.
- [x] Ensure `WorkflowEvent` and `SessionEvent` accept the new type without provider-specific fields.
- [x] Run:
  - `cd server; node --test src/core/modules/workflows/dev-session/session-event-bus.test.ts`
- [x] Commit:
  - `git add server/src/core/modules/agent-runtime/agent-types.ts server/src/core/modules/workflows/event-bus.ts server/src/core/modules/workflows/dev-session/types.ts server/src/core/modules/workflows/dev-session/session-event-bus.test.ts`
  - `git commit -m "feat: add generic agent streaming event"`

## Task 2: Generic Streamable Model Interface

**Files**
- Modify: `server/src/core/modules/agent-runtime/agent-graph-builder.ts`
- Modify: `server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts`
- Test: `server/src/core/modules/agent-runtime/agent-graph-builder.test.ts`
- Test: `server/src/core/modules/agent-runtime/model-provider-registry.test.ts`

**Steps**
- [x] Add failing test with fake model exposing `stream(messages)` and assert graph can consume text chunks.
- [x] Define local generic shape:
  - `invoke(messages): Promise<unknown>`
  - optional `stream(messages): AsyncIterable<unknown>`
- [x] Add `extractStreamDelta(chunk)` helper supporting generic text chunk shapes:
  - string chunk
  - `{ content: string }`
  - LangChain chunk with string `content`
  - LangChain chunk with text content blocks
- [x] Ensure OpenAI-compatible provider still returns `ChatOpenAI` directly; no plugin id branches.
- [x] Run:
  - `cd server; node --test src/core/modules/agent-runtime/agent-graph-builder.test.ts src/core/modules/agent-runtime/model-provider-registry.test.ts`
- [x] Commit:
  - `git add server/src/core/modules/agent-runtime/agent-graph-builder.ts server/src/core/modules/agent-runtime/agent-graph-builder.test.ts server/src/core/modules/agent-runtime/model-provider-registry.test.ts`
  - `git commit -m "feat: add generic streamable model support"`

## Task 2A: Generic Configurable Chat Model Adapter

**Files**
- Modify: `server/src/core/modules/agent-runtime/agent-types.ts`
- Modify: `server/src/shared/models/workflow-types.ts`
- Modify: `server/src/core/modules/agent-runtime/agent-validation.ts`
- Modify: `server/src/core/modules/workflows/workflow-validation.ts`
- Modify: `server/src/core/modules/plugins/loader.ts`
- Modify: `server/src/core/modules/agent-runtime/model-provider-registry.ts`
- Modify: `server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts`
- Modify: `client-vue/src/core/types/plugin.types.ts`
- Modify: `client-vue/src/core/types/workflow.types.ts`
- Modify: `client-vue/src/features/agent-runtime/types/agent.types.ts`
- Test: `server/src/core/modules/agent-runtime/agent-validation.test.ts`
- Test: `server/src/core/modules/workflows/workflow-validation.test.ts`
- Test: `server/src/core/modules/plugins/loader.test.ts`
- Test: `server/src/core/modules/agent-runtime/model-provider-registry.test.ts`
- Test: `server/src/shared/models/workflow-agent-types.test.ts`
- Test: `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts`
- Test: `client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`

**Steps**
- [x] Add failing tests proving manifests can expose `adapter: "generic"` for `chatModel`.
- [x] Add failing tests proving AI Model nodes accept `adapter: "generic"`.
- [x] Define `AgentModelAdapter = "openai-compatible" | "generic"` across server/shared/client types.
- [x] Keep `openai-compatible` behavior unchanged.
- [x] Implement `generic` as configurable OpenAI-compatible chat transport:
  - requires `model`
  - accepts `baseUrl`
  - accepts optional `credentialId`
  - uses plugin credentials fallback
  - supports local API-key-free endpoints when manifest/node marks auth as optional
- [x] Add safe credential behavior:
  - if API key exists, pass it
  - if API key is missing and endpoint allows local/no-auth, use a non-secret placeholder only when the underlying client requires one
  - never serialize real credentials
- [x] Do not add plugin-id branches for OpenAI, OpenRouter, or Ollama.
- [x] Run:
  - `cd server; node --test src/core/modules/agent-runtime/agent-validation.test.ts src/core/modules/workflows/workflow-validation.test.ts src/core/modules/plugins/loader.test.ts src/core/modules/agent-runtime/model-provider-registry.test.ts src/shared/models/workflow-agent-types.test.ts`
  - `cd client-vue; node --test src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`
- [x] Commit:
  - `git add server/src/core/modules/agent-runtime/agent-types.ts server/src/shared/models/workflow-types.ts server/src/core/modules/agent-runtime/agent-validation.ts server/src/core/modules/workflows/workflow-validation.ts server/src/core/modules/plugins/loader.ts server/src/core/modules/agent-runtime/model-provider-registry.ts server/src/core/modules/agent-runtime/model-providers/openai-compatible-provider.ts client-vue/src/core/types/plugin.types.ts client-vue/src/core/types/workflow.types.ts client-vue/src/features/agent-runtime/types/agent.types.ts server/src/core/modules/agent-runtime/agent-validation.test.ts server/src/core/modules/workflows/workflow-validation.test.ts server/src/core/modules/plugins/loader.test.ts server/src/core/modules/agent-runtime/model-provider-registry.test.ts server/src/shared/models/workflow-agent-types.test.ts client-vue/src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`
  - `git commit -m "feat: add generic chat model adapter"`

## Task 2B: Ollama Chat Model Capability

**Files**
- Modify: `server/src/plugins/sailor/ollama/manifest.json`
- Modify: `server/src/plugins/sailor/ollama/index.ts`
- Test: `server/src/core/modules/plugins/loader.test.ts`
- Test: `server/src/plugins/sailor/ollama/methods.test.ts`
- Test: `client-vue/src/shared/icons/__tests__/pluginIconResolver.test.ts`

**Steps**
- [ ] Add failing loader test proving internal chat-model manifests include `openai`, `openrouter`, and `sailor-ollama`.
- [ ] Add `metadata.agentCapabilities.chatModel` to Ollama:
  - `enabled: true`
  - `adapter: "generic"`
  - `defaultModel`: local-friendly model such as `llama3.2`
  - `defaultBaseUrl`: `http://localhost:11434/v1`
  - `credentialPluginId`: `sailor-ollama`
- [ ] Update Ollama auth schema:
  - `host` default/placeholder supports `http://localhost:11434`
  - `model` remains required/defaultable
  - `api_key` optional for cloud or protected endpoints
  - `system` stays optional
- [ ] Ensure local Ollama works without API key.
- [ ] Ensure cloud/protected Ollama can use API key.
- [ ] Run:
  - `cd server; node --test src/core/modules/plugins/loader.test.ts src/plugins/sailor/ollama/methods.test.ts`
  - `cd client-vue; node --test src/shared/icons/__tests__/pluginIconResolver.test.ts`
- [ ] Commit:
  - `git add server/src/plugins/sailor/ollama/manifest.json server/src/plugins/sailor/ollama/index.ts server/src/core/modules/plugins/loader.test.ts server/src/plugins/sailor/ollama/methods.test.ts client-vue/src/shared/icons/__tests__/pluginIconResolver.test.ts`
  - `git commit -m "feat: expose ollama chat model capability"`

## Task 2C: Ollama Plugin Methods And Cloud Credentials

**Files**
- Modify: `server/src/plugins/sailor/ollama/methods.ts`
- Modify: `server/src/plugins/sailor/ollama/manifest.json`
- Test: `server/src/plugins/sailor/ollama/methods.test.ts`

**Steps**
- [ ] Add failing tests for Ollama local requests without `Authorization`.
- [ ] Add failing tests for Ollama cloud/protected requests with `Authorization: Bearer <api_key>`.
- [ ] Add/normalize helper methods:
  - `listModels` -> `GET /api/tags`
  - `chat` -> `POST /api/chat`
  - `generate` -> keep existing behavior, but normalize host/api key handling
  - optional `showModel` -> `POST /api/show`
- [ ] Keep plugin generic and isolated: no imports from Core, engines, or other plugins.
- [ ] Normalize host paths:
  - native Ollama methods use `/api/...`
  - Chat Model adapter uses `/v1/...`
- [ ] Add response schemas for new methods.
- [ ] Run:
  - `cd server; node --test src/plugins/sailor/ollama/methods.test.ts`
- [ ] Commit:
  - `git add server/src/plugins/sailor/ollama/methods.ts server/src/plugins/sailor/ollama/manifest.json server/src/plugins/sailor/ollama/methods.test.ts`
  - `git commit -m "feat: improve ollama plugin methods"`

## Task 3: Agent Graph Text Streaming

**Files**
- Modify: `server/src/core/modules/agent-runtime/agent-graph-builder.ts`
- Test: `server/src/core/modules/agent-runtime/agent-graph-builder.test.ts`
- Test: `server/src/core/modules/agent-runtime/agent-runner.test.ts`

**Steps**
- [ ] Add failing test: text agent with no tools emits two `agent:output-delta` events before `agent:end`.
- [ ] Add failing test: agent with tools uses existing non-streaming path.
- [ ] Add failing test: JSON output mode uses existing non-streaming path.
- [ ] Implement `canStreamTextResponse(agent, tools)`:
  - `agent.outputMode === "text"`
  - `tools.length === 0`
  - model has `stream`
- [ ] In stream path, accumulate deltas into final text, return same `AgentRunResult` shape.
- [ ] Keep existing `invoke()` path for tool calls and JSON output.
- [ ] Run:
  - `cd server; node --test src/core/modules/agent-runtime/agent-graph-builder.test.ts src/core/modules/agent-runtime/agent-runner.test.ts`
- [ ] Commit:
  - `git add server/src/core/modules/agent-runtime/agent-graph-builder.ts server/src/core/modules/agent-runtime/agent-graph-builder.test.ts server/src/core/modules/agent-runtime/agent-runner.test.ts`
  - `git commit -m "feat: stream text agent output"`

## Task 4: Runtime Event Sanitizing And Dev Session Forwarding

**Files**
- Modify: `server/src/core/modules/agent-runtime/agent-event-sanitizer.ts`
- Modify: `server/src/core/modules/workflows/dev-session/session-event-bus.ts`
- Test: `server/src/core/modules/agent-runtime/agent-security.test.ts`
- Test: `server/src/core/modules/workflows/dev-session/session-event-bus.test.ts`

**Steps**
- [ ] Add failing sanitizer test: `agent:output-delta` keeps text delta but strips secrets/large unsafe payloads.
- [ ] Add failing session bus test: delta event includes `executionId`, `nodeId`, `source: "chat"` when forwarded from a chat job.
- [ ] Use payload shape:
  - `{ delta: string }`
- [ ] Do not include provider metadata, raw chunks, credentials, or token logprobs.
- [ ] Run:
  - `cd server; node --test src/core/modules/agent-runtime/agent-security.test.ts src/core/modules/workflows/dev-session/session-event-bus.test.ts`
- [ ] Commit:
  - `git add server/src/core/modules/agent-runtime/agent-event-sanitizer.ts server/src/core/modules/workflows/dev-session/session-event-bus.ts server/src/core/modules/agent-runtime/agent-security.test.ts server/src/core/modules/workflows/dev-session/session-event-bus.test.ts`
  - `git commit -m "feat: safely forward agent stream deltas"`

## Task 5: Frontend Incremental Chat Message Rendering

**Files**
- Modify: `client-vue/src/features/workflow-editor/stores/execution.store.ts`
- Modify: `client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue`
- Test: `client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`

**Steps**
- [ ] Add failing contract test: store handles `case 'agent:output-delta'`.
- [ ] Add failing contract test: streamed deltas update one assistant message id per execution.
- [ ] Add `appendEditorChatMessageDelta(executionId, sessionId, delta, timestamp)`.
- [ ] Message id format:
  - `chat-assistant-stream:${executionId}:agent`
- [ ] On `agent:end`, replace/finalize the same message with final output, not duplicate it.
- [ ] Keep non-streaming fallback unchanged.
- [ ] Run:
  - `cd client-vue; node --test src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`
- [ ] Commit:
  - `git add client-vue/src/features/workflow-editor/stores/execution.store.ts client-vue/src/features/workflow-editor/components/agent/ChatSessionPanel.vue client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`
  - `git commit -m "feat: render streaming agent chat deltas"`

## Task 6: Status And Error Semantics

**Files**
- Modify: `client-vue/src/features/workflow-editor/stores/execution.store.ts`
- Test: `client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`

**Steps**
- [ ] Add failing test: Chat Model node becomes `running` on `agent:model-start`.
- [ ] Add failing test: Agent node stays `running` while deltas arrive.
- [ ] Add failing test: `agent:error` finalizes streamed assistant message as an error without fallback message.
- [ ] Ensure `job:success` never adds "not connected" fallback if any stream message exists for execution.
- [ ] Run:
  - `cd client-vue; node --test src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`
  - `cd client-vue; npm run type-check`
- [ ] Commit:
  - `git add client-vue/src/features/workflow-editor/stores/execution.store.ts client-vue/src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`
  - `git commit -m "fix: keep streaming chat status consistent"`

## Task 7: Verification And Smoke

**Files**
- Modify: `feats-map/agent-chat-token-streaming.md`

**Steps**
- [ ] Run backend focused tests:
  - `cd server; node --test src/core/modules/agent-runtime/agent-graph-builder.test.ts src/core/modules/agent-runtime/agent-runner.test.ts src/core/modules/agent-runtime/model-provider-registry.test.ts src/core/modules/workflows/dev-session/session-event-bus.test.ts`
- [ ] Run backend build:
  - `cd server; npm run build`
- [ ] Run frontend focused tests:
  - `cd client-vue; node --test src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts`
- [ ] Run frontend type/build:
  - `cd client-vue; npm run type-check`
  - `cd client-vue; npm run build-only`
- [ ] Manual smoke:
  - Start Sailor.
  - Open workflow with Chat Trigger -> AI Agent -> Chat Model.
  - Send `Ola`.
  - Confirm assistant text appears incrementally before final `agent:end`.
  - Confirm no duplicate final response.
  - Confirm Tools Agent with at least one tool still runs with current non-streaming behavior.
- [ ] Mark completed tasks in this file.
- [ ] Commit:
  - `git add feats-map/agent-chat-token-streaming.md`
  - `git commit -m "docs: track agent chat token streaming rollout"`

## Risks

- Streaming tool-call chunks can expose partial content that later becomes a tool call. Avoid in first pass.
- JSON streaming can show invalid partial JSON. Avoid in first pass.
- Provider-specific stream chunk formats vary. Normalize only generic text shapes and fallback otherwise.
- SSE backpressure is minimal for small chat deltas, but payload must stay sanitized and bounded.

## Done Criteria

- Chat text starts rendering before model completion for text-only Agent runs.
- No plugin imports Core or other plugins.
- Core has no OpenAI plugin id branches.
- Existing non-streaming agent paths still pass tests.
- No duplicate assistant response.
- Status resets correctly after success/error.
