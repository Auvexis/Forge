# Agent Chat Ollama And Multi Trigger Fixes

Goal: fix Ollama chat model configuration/runtime bugs and let the chat panel target the right Chat Trigger.

## Rules

- [x] Stay on branch `dev`.
- [ ] Use TDD before production changes where behavior changes.
- [ ] Keep plugins isolated from Core, engines, and other plugins.
- [ ] Core remains generic: no Ollama/OpenAI-specific UI logic in runtime paths.
- [ ] Commit completed task scope without touching unrelated dirty files.

## Tasks

- [x] Task 1: Ollama settings schema
  - Remove `model` from Ollama base settings.
  - Make `host` optional and default native methods to local Ollama when absent.
  - Move model selection into Ollama method parameters.

- [x] Task 2: AI Model node editor cleanup
  - Keep model/base URL on the Chat Model node clear as runtime values.
  - Remove visible Credential input.
  - Split Temperature and Max Tokens into labeled fields.

- [x] Task 3: Ollama runtime provider selection
  - Ensure `pluginId/adapter` takes precedence over legacy `provider`.
  - Stop new AI Model nodes from carrying legacy `provider: openai`.
  - Verify Ollama generic adapter does not request OpenAI credentials.

- [x] Task 4: Chat panel trigger selector
  - Build the panel from all workflow Chat Trigger nodes.
  - Add a compact selector using `BaseSelect`.
  - Send dev-session messages to the selected trigger node/slug.

- [x] Task 5: Verification
  - Run focused server tests.
  - Run focused client contract tests and type check where feasible.
