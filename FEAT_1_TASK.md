# Feature 1: Global Command Palette Tasks

## Goal

Build a global command palette that can navigate pages, fuzzy-search commands/entities, and execute safe quick actions for workflows, Universe Mode, production monitor, plugins, executions, settings, and clipboard utilities.

## Architecture Decision

Implement the command palette as a backend-owned command module plus a thin frontend UI.

The backend module defines available commands, resolves availability, performs fuzzy/search indexing, validates command payloads, and executes the real actions. The frontend renders the palette, asks for user confirmation when a command descriptor marks itself destructive, and dispatches `commandId + payload` to the backend. Frontend stores/components may still handle purely local UI state such as opening the palette, highlighting results, focusing inputs, routing after a successful navigation command, or copying text returned by the backend.

The backend command module may call core modules because it is part of the core. The ND8 boundary is: plugins cannot call core/engine modules, but core modules can orchestrate installed plugins through generic contracts. For plugin-related commands, the backend must inspect installed plugin contracts/capabilities/auth metadata and call generic APIs such as `PluginExecutor.execute(pluginId, methodName, params)` or OAuth hooks. The command module must never hardcode provider-specific behavior such as `if pluginId === "telegram"`.

Target backend shape:

```txt
server/src/core/modules/command-palette/
  command-types.ts
  command-registry.ts
  command-context.ts
  command-search.ts
  command-executor.ts
  providers/
    navigation.commands.ts
    workflows.commands.ts
    plugins.commands.ts
    executions.commands.ts
    app-settings.commands.ts
```

Target route shape:

```txt
server/src/core/routes/command-palette.routes.ts
GET  /command-palette/commands
GET  /command-palette/search?q=...
POST /command-palette/commands/:commandId/execute
```

## Implementation Boundaries

- Add: `server/src/core/modules/command-palette/`.
- Add: `server/src/core/routes/command-palette.routes.ts`.
- Add: `client-vue/src/features/command-palette/`.
- Add command feature CSS and import it from `client-vue/src/assets/styles/main.css`.
- Mount one global palette host from `client-vue/src/app/App.vue`, including while normal app chrome is visible.
- Avoid mounting the palette on public form routes unless explicitly enabled later.
- Prefer existing backend repositories/services/engines. Do not duplicate workflow/plugin logic in the frontend.
- Keep destructive action metadata backend-owned and confirmation frontend-rendered.
- Keep plugin-specific behavior inside plugin manifests/methods/hooks/capabilities. Core can consume those generic contracts; plugins cannot import or call core/engine modules.

## Task 0: Planning And Architecture Scan

- [x] Read `NEXT_FEATURES_TASKS.md`.
- [x] Inspect recent commits to understand the Universe Mode feature cadence and task-ledger pattern.
- [x] Inspect `server/src/core/modules/plugins`, `server/src/core/modules/workflows`, `server/src/core/nodes`, and route modules to verify engine/plugin boundaries.
- [x] Inspect `client-vue/src/app`, `client-vue/src/shared`, `client-vue/src/core/api`, `client-vue/src/features/workflow-editor`, and `client-vue/src/features/universe` to identify existing actions.
- [x] Create `FEAT_1_TASK.md`.
- Commit: `docs: plan command palette feature`

## Task 1: Backend Command Domain, Registry, And Contracts

- [x] Create `server/src/core/modules/command-palette/command-types.ts`.
- [x] Define stable types:
  - `CommandId` as string.
  - `CommandGroup` union: `navigation`, `settings`, `workflow`, `universe`, `production`, `plugin`, `execution`, `utility`.
  - `CommandAvailability` with `enabled`, optional `reason`, and optional `hidden`.
  - `CommandDescriptor` with `id`, `group`, `label`, `description`, `keywords`, `icon`, `destructive`, `payloadSchema`, and `availability`.
  - `CommandExecutionContext` with backend repositories/services, current route hint, optional active workflow id, and optional user/session metadata.
  - `CommandHandler` with `describe(context)` and `execute(context, payload)`.
  - `CommandExecutionResult` with `ok`, optional `message`, optional `navigation`, optional `clipboardText`, and optional `refreshHints`.
- [x] Create `server/src/core/modules/command-palette/command-registry.ts`.
- [x] Create `server/src/core/modules/command-palette/command-context.ts`.
- [x] Add duplicate-id detection and deterministic provider ordering.
- [x] Add unit-testable pure helpers for command normalization and availability filtering.
- [x] Keep the registry provider-agnostic and free of plugin-specific branching.
- [x] Mark this task complete here after implementation.
- Commit: `feat(command-palette): add backend command contracts`

## Task 2: Backend Search And Command Routes

- [x] Create `server/src/core/modules/command-palette/command-search.ts` with a deterministic scorer.
- [x] Support matching by label, group, keywords, route names, workflow names, plugin names, plugin method labels, and short ids.
- [x] Create `server/src/core/modules/command-palette/command-executor.ts`.
- [x] Create `server/src/core/routes/command-palette.routes.ts`.
- [x] Register the route module in `server/src/core/routes/index.ts` or `server/src/core/server.ts`, matching existing route patterns.
- [x] Implement `GET /command-palette/commands` to return available command descriptors.
- [x] Implement `GET /command-palette/search?q=...` to return ranked command descriptors.
- [x] Implement `POST /command-palette/commands/:commandId/execute` to execute commands through the registry.
- [x] Validate payloads with Zod or the existing backend validation approach before dispatching.
- [x] Return typed results that tell the frontend whether to navigate, copy to clipboard, show a toast, or refresh command data.
- [x] Do not execute plugin methods while indexing. Index manifests only.
- [x] Add graceful empty/error states when entity loading fails.
- [x] Mark this task complete here after implementation.
- Commit: `feat(command-palette): expose backend command api`

## Task 3: Backend Navigation, Settings, Universe, And Production Providers

- [ ] Create `server/src/core/modules/command-palette/providers/navigation.commands.ts`.
- [ ] Create `server/src/core/modules/command-palette/providers/app-settings.commands.ts`.
- [ ] Register navigation descriptors for Home/Workflows, Universe, Settings, and any current top-level app route.
- [ ] Register settings commands:
  - Open Settings.
  - Open Settings to a tab only if the frontend exposes a stable tab target that can be represented in `CommandExecutionResult.navigation` or `uiIntent`; otherwise register only the generic command and document the missing tab API in this file.
- [ ] Register Universe commands:
  - Enter Universe returns a navigation/ui intent for `/universe`.
  - Exit Universe returns a navigation/ui intent for `/workflows` when the client reports it is currently in Universe.
- [ ] Register Production Panel commands:
  - Open Production Panel returns a `uiIntent` consumed by the frontend.
  - Close Production Panel returns a `uiIntent` consumed by the frontend.
- [ ] Do not make the backend import frontend components. Use typed UI intents only.
- [ ] Mark this task complete here after implementation.
- Commit: `feat(command-palette): add app command providers`

## Task 4: Backend Workflow Commands

- [ ] Create `server/src/core/modules/command-palette/providers/workflows.commands.ts`.
- [ ] Add workflow provider commands backed by `WorkflowRepository`, `WorkflowEngine`, `WorkflowLifecycleManager`, `CancellationRegistry`, and existing route-safe behavior.
- [ ] Global workflow commands:
  - Create Workflow.
  - Open Workflow by fuzzy-searching workflow names/ids.
  - Import Workflow only if the frontend uploads/provides a parsed workflow payload and the backend validates it.
- [ ] Active workflow commands:
  - Save active workflow.
  - Rename active workflow from a validated payload.
  - Delete active workflow with confirmation.
  - Publish active workflow.
  - Unpublish active workflow.
  - Export active workflow by returning serialized workflow data.
  - Run active workflow.
  - Stop running workflow when an active execution id is supplied or can be resolved.
  - Open workflow settings by returning a `uiIntent`.
  - Open logs by returning a `uiIntent`.
- [ ] URL/copy commands:
  - Copy Workflow ID by returning `clipboardText`.
  - Copy Webhook URL when active trigger supports webhook/plugin webhook.
  - Copy Form URL when active trigger supports form.
- [ ] Preserve dirty workflow guards by requiring frontend to send current workflow revision/snapshot where needed.
- [ ] Avoid duplicating workflow construction logic by extracting a backend workflow factory/helper if needed.
- [ ] Mark this task complete here after implementation.
- Commit: `feat(command-palette): add workflow commands`

## Task 5: Backend Plugin Commands

- [ ] Create `server/src/core/modules/command-palette/providers/plugins.commands.ts`.
- [ ] Add plugin provider commands based on `PluginManager`, `CredentialStore`, generic auth contracts, plugin manifests, and optional plugin-declared capabilities.
- [ ] Re-state and enforce the ND8 rule in code comments/tests:
  - Plugins cannot import or call core/engine modules.
  - Core can inspect installed plugin contracts and call generic plugin APIs.
  - Core must not hardcode behavior for a specific plugin id/provider.
- [ ] Commands:
  - Open Plugin: return a navigation/ui intent to focus the plugin in Universe if available.
  - Connect Plugin: return OAuth URL for OAuth plugins or a `uiIntent` for API-key credential entry.
  - Disconnect Plugin: call generic disconnect endpoint/service for OAuth plugins after confirmation.
  - Re-authenticate Plugin: same generic OAuth connect flow, guarded by auth type.
- [ ] Install/Uninstall commands:
  - Register as disabled/not-yet-available if no generic install/uninstall API exists.
  - Do not create server endpoints until a generic plugin registry/install design is approved.
- [ ] Optional future shape: plugin manifests may declare generic `capabilities.paletteActions[]` that map to plugin methods. The core can expose those commands only by validating the capability and calling `PluginExecutor.execute`.
- [ ] Mark this task complete here after implementation.
- Commit: `feat(command-palette): add plugin commands`

## Task 6: Backend Execution, Logs, And Utility Commands

- [ ] Create `server/src/core/modules/command-palette/providers/executions.commands.ts`.
- [ ] Add execution commands through `WorkflowRepository` and `CancellationRegistry`.
- [ ] Commands:
  - Open Executions/Logs for active workflow by returning a `uiIntent`.
  - Clear Logs for active workflow with confirmation.
  - Stop Running execution when an execution is active.
  - Delete individual execution only if a generic server endpoint exists; otherwise register as unavailable and document the API gap here.
- [ ] Utility commands:
  - Copy Workflow ID by returning `clipboardText`.
  - Copy Webhook URL by returning `clipboardText`.
  - Copy Form URL by returning `clipboardText`.
  - Toggle Theme through app settings repository, not direct frontend mutation.
- [ ] Ensure clipboard data is generated server-side when it depends on workflow/settings state.
- [ ] Mark this task complete here after implementation.
- Commit: `feat(command-palette): add execution utility commands`

## Task 7: Frontend API Client, Store, And Palette UI

- [ ] Create `client-vue/src/core/api/command-palette.api.ts`.
- [ ] Add endpoints to `client-vue/src/core/api/endpoints.ts`.
- [ ] Create `client-vue/src/features/command-palette/types/command-palette.types.ts` matching the backend response contract.
- [ ] Create `client-vue/src/features/command-palette/stores/commandPalette.store.ts`.
- [ ] Store open state, query, highlighted index, loading/error state, command results, and recent commands.
- [ ] Create `client-vue/src/features/command-palette/components/CommandPaletteHost.vue`.
- [ ] Create focused components for search input, result list, result row, group label, and footer hints.
- [ ] Add keyboard shortcuts:
  - Open/close: `Cmd+K` and `Ctrl+K`.
  - Close: `Escape`.
  - Navigate results: `ArrowUp`, `ArrowDown`, `Home`, `End`.
  - Execute: `Enter`.
- [ ] Ignore normal text input conflicts, while still allowing palette navigation after it is open.
- [ ] Mount the host in `client-vue/src/app/App.vue`.
- [ ] Do not show the host on public routes unless future work explicitly opts in.
- [ ] Use existing base components/icons where practical.
- [ ] Mark this task complete here after implementation.
- Commit: `feat(command-palette): add frontend palette shell`

## Task 8: Frontend Dispatch, UI Intents, Feedback, And Failure Safety

- [ ] Execute commands only through `commandPaletteApi.execute(commandId, payload)`.
- [ ] Render backend-provided disabled/hidden/destructive state.
- [ ] Use `useConfirm` for commands marked destructive before dispatch.
- [ ] Apply backend `CommandExecutionResult`:
  - Navigate with router when `navigation` is present.
  - Open/close frontend panels when `uiIntent` is present.
  - Copy `clipboardText` with browser clipboard APIs.
  - Show backend-safe success/error messages through toasts.
  - Refresh command list when `refreshHints` request it.
- [ ] Prevent double execution while a command is running.
- [ ] Keep the palette open when an action needs correction or fails.
- [ ] Close the palette after successful navigation or successful non-destructive commands.
- [ ] Add audit-friendly error messages without leaking secrets, tokens, or raw credential values.
- [ ] Mark this task complete here after implementation.
- Commit: `feat(command-palette): wire command dispatch feedback`

## Task 9: Tests, Accessibility, Responsive Polish, And Verification

- [ ] Add backend unit tests for registry duplicate detection, availability filtering, search ranking, workflow command descriptors, plugin command capability checks, and execution dispatch.
- [ ] Add backend route tests for command list/search/execute error handling where existing test patterns allow it.
- [ ] Add ARIA dialog/listbox semantics and active descendant support.
- [ ] Verify focus trap, focus restore, and escape behavior.
- [ ] Verify desktop and mobile layouts with no overlapping text.
- [ ] Run `npm run build` in `server/`.
- [ ] Run `npm run build` in `client-vue/`.
- [ ] Start the app and test:
  - `Cmd/Ctrl+K` opens the palette.
  - Fuzzy search finds static commands, workflows, plugins, and plugin actions.
  - Navigation commands route correctly.
  - Palette does not appear on public form routes.
  - Workflow publish/unpublish/run/stop preserve current behavior.
  - Universe enter/exit restores app chrome.
  - Production panel open/close works.
  - Unavailable commands are disabled/hidden predictably.
- [ ] Mark this task complete here after implementation.
- Commit: `test(command-palette): verify command palette experience`

## Future Extension Notes

- A later plugin marketplace feature should add a generic install/uninstall API before palette install commands become executable.
- Settings tab targeting should be implemented as a stable settings store API before `Open Settings(<tab_name>)` is expanded.
- Palette providers should remain small backend files. New command groups should register through providers instead of editing the palette UI.
- Plugin-declared palette actions should be generic capability descriptors validated and executed by core; plugins still must not call core.
