# Dev Session Trigger And Agent Runtime Completeness

## Goal

Restore Dev Session trigger forwarding, make agent config nodes expose correct runtime state, support multiple connected tools visually, preserve execution state until manual clear, and document supported agent inputs.

## Tasks

### Task 1: Dev Session Trigger Forwarding

- [x] Reproduce plugin trigger 404 and inspect webhook/form/plugin forwarding paths.
- [x] Add failing tests for Dev Session public forwarding URLs.
- [x] Fix plugin/webhook forwarding through the core Dev Session engine.
- [x] Run focused trigger tests.
- [x] Commit Task 1.

### Task 2: Multi-tool Status

- [x] Add failing frontend contract for tool status routing by called tool node.
- [x] Update connected agent tool status patching for the matching tool node.
- [x] Run focused frontend tests.
- [x] Commit Task 2.

### Task 3: Agent Config Input And Output

- [ ] Inspect current execution context and node state propagation.
- [ ] Add failing tests for agent config node input/output snapshots.
- [ ] Expose input/output on Chat Model, Memory, and called Tool nodes.
- [ ] Run focused backend/frontend tests.
- [ ] Commit Task 3.

### Task 4: Agent Template Context

- [ ] Inspect interpolation support for agent system prompt and tool instruction/defaults.
- [ ] Add failing tests for supported variable/env interpolation.
- [ ] Implement missing interpolation through core workflow context only.
- [ ] Document supported trigger types for AI Agent nodes.
- [ ] Commit Task 4.

### Task 5: Manual Clear Only

- [x] Add failing tests that completed node states do not auto-reset.
- [x] Remove automatic status reset after success/failure.
- [x] Keep toolbar Clear Execution as the explicit reset path.
- [x] Run focused tests and type-checks.
- [x] Commit Task 5.
