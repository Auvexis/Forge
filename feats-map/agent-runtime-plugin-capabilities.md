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
- [ ] Task 5: Workflow Validation Compatibility
- [ ] Task 6: Frontend Plugin Capability Types
- [ ] Task 7: Manifest-Driven Add Node Panel
- [ ] Task 8: Generic AI Model Editor And Auth Resolution
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
- [ ] Backend workflow validation tests pass.
- [ ] Frontend add-node panel contracts pass.
- [ ] Frontend AI editor contracts pass.
- [ ] Server build passes. `cd server; npm run build` completed successfully after Task 2. After Task 4, build is still blocked by remaining provider-based references in unowned Task 5 files/tests: `agent-runtime/agent-runner.test.ts`, `workflows/agent-config-node-execution.test.ts`, `workflows/workflow-validation.ts`, `nodes/handlers/ai-agent.test.ts`, `nodes/handlers/ai-agent.ts`, `nodes/handlers/ai-model.ts`, and `routes/agent-chat-workflow.integration.test.ts`.
- [ ] Client type-check and build pass.
- [ ] Manual smoke confirms Chat Models are discovered from plugin manifest metadata.
