# Tools Agent Input UX And Plugin Bot Filter Fixes

## Goal

Fix Tools Agent child-node runtime snapshots, remove redundant editor controls, improve handle label layering, and make `Ignore Bots` work consistently for messaging plugin triggers.

## Architecture

- Keep Chat Model, Memory, and Tool nodes as configuration nodes. They must not execute as independent workflow steps.
- Emit one initial `agent:config-snapshot` event from the Tools Agent with the inherited runtime input.
- In the frontend execution store, apply that snapshot to every connected Chat Model, Memory, and Tool node. More specific events continue to replace it with model messages, memory queries, and tool arguments.
- Keep side-effect and approval policy metadata in backend contracts for security. Remove only redundant user-facing controls and badges.
- Normalize messaging plugin bot metadata to the shared `isBot` field already understood by the core filter.

## Tasks

### Task 1: Emit Initial Agent Config Snapshots

- [x] Add failing backend tests for `agent:config-snapshot`.
- [x] Add the event type and emit inherited input before model execution.
- [x] Forward the event through Dev Session SSE.
- [x] Add failing frontend contract tests for patching all connected config nodes.
- [x] Patch all connected config nodes from the snapshot.
- [x] Run focused tests.
- [ ] Commit with `fix: propagate agent input snapshots to config nodes`.

### Task 2: Simplify Tools Agent Editors

- [ ] Add failing frontend contracts for removed Approval Policy and Side Effect controls.
- [ ] Add failing frontend contracts for labeled vertical Execution Limits.
- [ ] Add failing frontend contract for config handle labels above Quick Add.
- [ ] Remove Approval Policy UI from Tools Agent editor.
- [ ] Render labeled Max Iterations and Max Tool Calls inputs vertically.
- [ ] Remove Side Effect selector and node badge from Tool UI.
- [ ] Raise handle-label z-index above Quick Add.
- [ ] Run focused frontend tests and type-check.
- [ ] Commit with `feat: simplify tools agent configuration ux`.

### Task 3: Fix Messaging Trigger Ignore Bots

- [ ] Add failing normalizer tests for Discord, Telegram, and Slack `isBot`.
- [ ] Normalize Discord `author.bot`, Telegram `from.is_bot`, and Slack bot metadata to `isBot`.
- [ ] Add core filter regression coverage for normalized `isBot`.
- [ ] Run messaging trigger and core filter tests.
- [ ] Commit with `fix: normalize messaging trigger bot metadata`.

### Task 4: Verify

- [ ] Run server agent, workflow, plugin trigger, and messaging plugin tests.
- [ ] Run `npm run build` from `server/`.
- [ ] Run frontend workflow editor contract tests.
- [ ] Run `npm run type-check` from `client-vue/`.
- [ ] Run `git diff --check`.
- [ ] Mark tasks completed.
- [ ] Commit with `docs: close tools agent and bot filter tasks`.
