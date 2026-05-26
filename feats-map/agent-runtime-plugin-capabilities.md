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
- [ ] Task 3: Generic Backend AI Model Contract
- [ ] Task 4: Generic Model Provider Registry
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
- [ ] Backend agent runtime tests pass.
- [ ] Backend workflow validation tests pass.
- [ ] Frontend add-node panel contracts pass.
- [ ] Frontend AI editor contracts pass.
- [x] Server build passes. `cd server; npm run build` completed successfully after Task 2.
- [ ] Client type-check and build pass.
- [ ] Manual smoke confirms Chat Models are discovered from plugin manifest metadata.
