# Agent Runtime Plugin Capabilities

Plan source: `docs/superpowers/plans/2026-05-26-agent-runtime-plugin-capabilities.md`

Goal: make Agent Chat Model, Memory, and Tool availability manifest-driven, removing OpenAI/OpenRouter and provider-specific logic from Sailor Core/UI.

## Rules

- [x] Stay on branch `dev`.
- [x] Keep plugins isolated from Core/engines/other plugins.
- [x] Use TDD before implementation.
- [x] Update manifest JSON Schema.
- [x] Commit after each completed implementation task.

## Task Map

- [x] Task 1: Capability Schema Contracts
- [x] Task 2: Plugin Capability Declarations
- [x] Task 3: Generic Backend AI Model Contract
- [x] Task 4: Generic Model Provider Registry
- [x] Task 5: Workflow Validation Compatibility
- [x] Task 6: Frontend Plugin Capability Types
- [x] Task 7: Manifest-Driven Add Node Panel
- [x] Task 8: Generic AI Model Editor And Auth Resolution
- [ ] Task 9: Documentation And Legacy Cleanup
- [ ] Task 10: Full Verification

## Architecture Decisions

- [x] Method tools remain method-level: `method.agentTool`.
- [x] Chat Model and Memory are plugin-level capabilities: `manifest.metadata.agentCapabilities`.
- [x] Core knows generic adapters, not plugin ids.
- [x] First adapter: `openai-compatible`.
- [x] Legacy `provider: "openai" | "openrouter"` configs get normalized during migration.
- [x] Plugin-backed memory execution is deferred unless runtime support is actually implemented.

## Verification Notes

- [x] Backend plugin loader schema tests pass. `cd server; node --test src/core/modules/plugins/loader.test.ts` passed with 15/15 tests after adding internal OpenAI/OpenRouter manifest capability assertions.
- [x] Backend agent runtime tests pass. `cd server; node --test src/shared/models/workflow-agent-types.test.ts src/core/modules/agent-runtime/agent-validation.test.ts` passed with 15/15 tests after Task 3.
- [x] Backend model provider registry tests pass. `cd server; node --test src/core/modules/agent-runtime/model-provider-registry.test.ts` failed before Task 4 implementation because registry still resolved `config.provider`; after Task 4, `cd server; node --test src/core/modules/agent-runtime/model-provider-registry.test.ts src/core/modules/agent-runtime/agent-runner.test.ts` passed with 16/16 tests.
- [x] Backend workflow validation tests pass. `cd server; node --test src/core/modules/workflows/workflow-validation.test.ts src/core/modules/workflows/agent-config-node-execution.test.ts src/core/nodes/handlers/ai-agent.test.ts` passed with 20/20 tests after Task 5.
- [x] Backend agent compatibility suite passes. `cd server; node --test src/core/modules/agent-runtime/agent-validation.test.ts src/core/modules/agent-runtime/model-provider-registry.test.ts src/core/modules/agent-runtime/agent-runner.test.ts src/core/routes/agent-chat-workflow.integration.test.ts` passed with 30/30 tests after Task 5.
- [x] Frontend add-node panel contracts pass. Task 7 rerun: `cd client-vue; node --test src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts` passed with 7/7 tests after replacing Chat Model presets with manifest capability discovery and aligning the agent tool grid contract.
- [x] Frontend AI editor contracts pass. Task 6 added source-contract coverage for `agentCapabilities`, `chatModel`, `memoryStore`, `AgentModelAdapter`, `pluginId`, and `adapter`; the new contract failed before type implementation and passed afterward.
- [x] Server build passes. `cd server; npm run build` completed successfully after Task 5. Adjacent backend fixtures updated for the new `AiModel` shape: `server/src/core/modules/agent-runtime/agent-runner.test.ts` and `server/src/core/routes/agent-chat-workflow.integration.test.ts`.
- [x] Client type-check passes. `cd client-vue; npm run type-check` completed successfully after Task 6.
- [x] Client build passes. `cd client-vue; npm run build-only` completed successfully after Task 7.
- [x] Generic AI Model editor contracts pass. `cd client-vue; node --test src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts` failed first while the editor still exposed provider-specific UI and the inspector still resolved auth from provider fallback; after Task 8 it passed with 10/10 tests.
- [x] Client type-check passes after Task 8. `cd client-vue; npm run type-check` completed successfully after replacing provider selection with plugin capability identity fields.
- [x] Client build passes after Task 8. `cd client-vue; npm run build-only` completed successfully after the generic AI Model editor and auth resolution changes.
- [x] Chat Model quick-add is discovered from `manifest.metadata.agentCapabilities.chatModel`.
- [x] Agent Tool quick-add filters methods by `agentTool.enabled`.
- [ ] Manual smoke confirms Chat Models are discovered from plugin manifest metadata.
