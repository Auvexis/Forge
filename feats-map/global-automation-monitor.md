# Feature 5: Global automation monitor

## Rules
- [x] Read `DEFAULT_PROMPT.md`.
- [x] Inspect recent commits and current frontend/backend shape before changing code.
- [x] Use TDD for feature behavior before production code changes.
- [x] Commit after each completed task.

## Tasks
- [x] Add contract tests for the new global monitor shell, profile filter, workflow tabs, and realtime refresh behavior.
- [x] Replace the old `AppProductionMonitor.vue` with a new BaseModal-based global automation monitor.
- [x] Wire `monitoring.open`, production-panel command palette intents, and sidebar activity button to the new monitor.
- [x] Add publish/unpublish action to workflow editor toolbar.
- [x] Make Run menu label switch between `Publish Workflow` and `Unpublish Workflow` from workflow publish state.
- [ ] Run focused tests/type checks and update this task map.
