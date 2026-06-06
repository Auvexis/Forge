# Workflow Editor Dev Chat, Workflow Git, and Plugin Categories

Goal: improve workflow editor dev chat, add profile-scoped workflow git snapshots, fix Add Node and plugin theme icon issues, and align SDK/CLI manifests.

Rules:
- Use branch dev in `sailor`.
- Do not reset unrelated dirty files.
- Use TDD for behavior changes, except tiny CSS-only fixes.
- Commit after each completed task with only files from that task.

Tasks:
- [x] Task 1: Add profile data workflow git snapshot service in server.
- [x] Task 2: Replace Workflow Editor chat bottom panel with Global Agent Chat modal scoped to Dev Session workflow agents.
- [x] Task 3: Disable Workflow Editor status bar Chat button outside Dev Session.
- [x] Task 4: Add Chat Trigger "Open in Chat" action gated by Dev Session and preselect target agent.
- [ ] Task 5: Fix AddNodePanel methods view scrolling after selecting a plugin.
- [ ] Task 6: Fix VariableTree plugin icons to use theme-aware icon resolution.
- [ ] Task 7: Add predefined plugin categories to SDK schema/types, update CLI template/prompts, and update server dependency.
- [ ] Task 8: Group Add Node Panel plugins by category with category filter and collapse/expand controls.
- [ ] Task 9: Run focused tests/build checks and record any blocked publish/install steps.

Design:
- Workflow git snapshots live under each profile data directory, inside `data/workflows-git/<workflowId>`, and are driven by the workflow repository/service layer instead of plugins.
- The Global Agent Chat modal gets a `dev-session` scope with `workflowId`, optional `triggerNodeId`, and optional `agentNodeId`. The existing global chat components stay reusable.
- Published/global agent listing remains unchanged. Dev Session listing is a separate backend scope that lists agents from the active workflow even when the workflow is draft/unpublished.
- Plugin categories are fixed string values in SDK/CLI/server manifests while still falling back to `Other` in frontend for legacy manifests.
