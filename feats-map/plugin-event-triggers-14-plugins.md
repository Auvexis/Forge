# Plugin Event Triggers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add useful Plugin Trigger/Event Trigger support for 14 integration plugins so Sailor can build bots, agents, and automations from real external events.

**Architecture:** Keep plugins generic and isolated. Plugins only declare trigger manifests and expose trigger setup/teardown adapters through their own folder; the core workflow lifecycle owns registration, persistence, execution dispatch, auth lookup, validation, rate limits, and listener routing. Shared contracts live in `server/src/shared` and mirrored frontend types.

**Tech Stack:** TypeScript, Fastify, existing workflow engine, plugin manifests, plugin lifecycle, Node test runner/Vitest pattern already used in `server/` and `client-vue/`.

---

## Rules From DEFAULT_PROMPT.md

- Plugins cannot know anything outside their own folder.
- Plugins cannot call `core/engines` or other plugins.
- Plugins must stay generic and manifest-driven.
- Core/Engine talks to plugins through engines/lifecycle boundaries.
- Use TDD before implementation, except tiny safe corrections.
- Create/maintain this file before implementation.
- Mark each task done when completed and commit after each completed task.

## Scope

Implement Plugin Trigger support for:

- `telegram`
- `discord`
- `slack`
- `google-gmail`
- `google-calendar`
- `google-drive`
- `google-sheets`
- `github`
- `jira`
- `trello`
- `notion`
- `sailor-postgresql`
- `sailor-supabase`
- `google-youtube`

Out of scope for this plan:

- `openai`, `openrouter`, `sailor-ollama`: model/action providers, not event sources.
- `sailor-crypto`, `sailor-date-time`, `sailor-file`, `sailor-wait`, `sailor-compare-datasets`: utility/action plugins, not event sources.

## Target Events

| Plugin | Events |
| --- | --- |
| Telegram | `onMessage`, `onCommand`, `onCallbackQuery` |
| Discord | `onMessage`, `onSlashCommand`, `onReaction` |
| Slack | `onMessage`, `onMention`, `onAppHomeOpened` |
| Google Gmail | `onNewEmail`, `onEmailMatchingFilter`, `onAttachmentReceived` |
| Google Calendar | `onEventCreated`, `onEventStartingSoon`, `onEventUpdated` |
| Google Drive | `onFileCreated`, `onFileUpdated`, `onFolderChanged` |
| Google Sheets | `onRowAdded`, `onRowUpdated`, `onSheetChanged` |
| GitHub | `onIssueOpened`, `onPullRequestOpened`, `onPullRequestReview`, `onWorkflowFailed` |
| Jira | `onIssueCreated`, `onIssueUpdated`, `onStatusChanged` |
| Trello | `onCardCreated`, `onCardMoved`, `onCommentAdded` |
| Notion | `onPageCreated`, `onDatabaseItemCreated`, `onDatabaseItemUpdated` |
| PostgreSQL | `onRowInserted`, `onRowUpdated`, `onQueryMatch` |
| Supabase | `onRowInserted`, `onRowUpdated`, `onAuthUserCreated` |
| YouTube | `onNewVideo`, `onNewComment`, `onChannelUpdate` |

## File Ownership

- Shared trigger contracts:
  - `server/src/shared/models/plugin-types.ts`
  - `client-vue/src/core/types/plugin.types.ts`
- Workflow trigger lifecycle:
  - `server/src/core/modules/workflows/plugin-lifecycle.ts`
  - `server/src/core/modules/workflows/plugin-trigger-runtime.ts`
  - `server/src/core/modules/workflows/plugin-trigger-runtime.test.ts`
- Generic webhook/event receiver:
  - `server/src/core/routes/plugin-events.routes.ts`
  - `server/src/core/routes/plugin-events.routes.test.ts`
  - `server/src/core/server.ts`
- Manifest validation:
  - `server/src/core/modules/plugins/plugin-manifest-preview.ts`
  - `server/src/core/modules/plugins/plugin-manifest-preview.test.ts`
  - `server/src/core/modules/plugins/plugin-registry.ts`
  - `server/src/core/modules/plugins/plugin-registry.test.ts`
- Frontend trigger editor:
  - `client-vue/src/features/workflow-editor/components/settings/editors/TriggerEditor.vue`
  - `client-vue/src/features/workflow-editor/components/settings/editors/VariableTree.vue`
  - Existing related tests under `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/`
- Plugin manifests and local trigger adapters:
  - `server/src/plugins/sailor/<plugin>/manifest.json`
  - `server/src/plugins/sailor/<plugin>/triggers.ts`
  - `server/src/plugins/sailor/<plugin>/triggers.test.ts`
  - `server/src/plugins/sailor/<plugin>/index.ts`

## Shared Design

All trigger manifests should support:

```ts
export interface PluginTriggerManifest {
  metadata: {
    label: string;
    description: string;
  };
  delivery: {
    mode: "webhook" | "polling" | "realtime";
    requiresPublicUrl?: boolean;
    recommendedPollSeconds?: number;
  };
  parameters?: JSONSchemaObject;
  payloadSchema: JSONSchemaResponse;
}
```

Runtime boundary:

```ts
export interface PluginTriggerRegistration {
  workflowId: string;
  triggerNodeId: string;
  pluginId: string;
  triggerName: string;
  webhookPath: string;
  triggerParams: Record<string, unknown>;
}

export interface PluginTriggerRuntime {
  setupTrigger?(registration: PluginTriggerRegistration): Promise<void>;
  teardownTrigger?(registration: PluginTriggerRegistration): Promise<void>;
  normalizeEvent?(triggerName: string, rawPayload: unknown): Promise<Record<string, unknown>>;
}
```

Core dispatch rule:

```ts
// Core receives external payload, validates registered workflow trigger,
// asks plugin to normalize payload if available, then starts workflow.
await executeWorkflow(workflow, { payload: normalizedPayload }, executionId);
```

Security baseline:

- Verify webhook signature when provider supports it.
- Reject unknown plugin/trigger/workflow combinations.
- Never expose credentials to frontend.
- Never let plugin call workflow engine directly.
- Store listener state in core/profile scoped storage, not inside plugin folders.
- Add dedupe key support for provider retry events.
- Add minimal rate limiting on public event routes.

---

### Task 1: Add Shared Trigger Contract

**Files:**
- Modify: `server/src/shared/models/plugin-types.ts`
- Modify: `client-vue/src/core/types/plugin.types.ts`
- Test: `server/src/core/modules/plugins/plugin-manifest-preview.test.ts`

- [x] **Step 1: Write failing contract tests**

Add tests that validate a trigger with `delivery` and `payloadSchema` is accepted, and malformed triggers are rejected.

Run:

```bash
cd server
npm test -- plugin-manifest-preview.test.ts
```

Expected: FAIL because trigger validation does not require the new contract yet.

- [x] **Step 2: Implement shared types**

Add `delivery` and `payloadSchema` to server/client trigger interfaces. Keep this generic; no provider-specific fields in shared types.

- [x] **Step 3: Implement manifest validation**

Validation must reject:

- missing `metadata.label`
- missing `delivery.mode`
- invalid delivery mode
- missing `payloadSchema`

- [x] **Step 4: Run tests**

```bash
cd server
npm test -- plugin-manifest-preview.test.ts plugin-registry.test.ts
```

- [x] **Step 5: Commit**

```bash
git add server/src/shared/models/plugin-types.ts client-vue/src/core/types/plugin.types.ts server/src/core/modules/plugins
git commit -m "feat: add plugin trigger manifest contract"
```

---

### Task 2: Add Core Plugin Trigger Runtime

**Files:**
- Create: `server/src/core/modules/workflows/plugin-trigger-runtime.ts`
- Create: `server/src/core/modules/workflows/plugin-trigger-runtime.test.ts`
- Modify: `server/src/core/modules/workflows/plugin-lifecycle.ts`

- [x] **Step 1: Write failing runtime tests**

Cover:

- setup calls only selected plugin
- teardown calls only selected plugin
- missing plugin throws safe error
- missing trigger throws safe error
- plugin receives only generic registration data

- [x] **Step 2: Implement runtime service**

Create a small service with SRP:

- resolve plugin by `pluginId`
- validate trigger exists in manifest
- call plugin trigger lifecycle
- never execute workflow directly

- [x] **Step 3: Wire publish/unpublish lifecycle**

On workflow publish, setup active plugin triggers. On unpublish, teardown active plugin triggers.

- [x] **Step 4: Run tests**

```bash
cd server
npm test -- plugin-trigger-runtime.test.ts
```

- [x] **Step 5: Commit**

```bash
git add server/src/core/modules/workflows
git commit -m "feat: add plugin trigger runtime"
```

---

### Task 3: Add Generic Plugin Event Receiver

**Files:**
- Create: `server/src/core/routes/plugin-events.routes.ts`
- Create: `server/src/core/routes/plugin-events.routes.test.ts`
- Modify: `server/src/core/server.ts`

- [x] **Step 1: Write failing route tests**

Cover:

- valid event starts workflow
- invalid trigger path returns 404
- invalid signature returns 401 when signature is configured
- duplicate event id does not execute twice
- normalized payload is stored as last trigger payload

- [x] **Step 2: Implement route**

Add route:

```text
POST /plugin-events/:workflowId/:triggerNodeId/:pluginId/:triggerName
```

Route responsibility only:

- authenticate event
- find workflow trigger
- call normalization boundary
- dispatch workflow
- return provider-safe response

- [x] **Step 3: Add dedupe helper**

Dedupe by provider event id when available:

```ts
const dedupeKey = `${pluginId}:${triggerName}:${eventId}`;
```

Keep storage core-owned.

- [x] **Step 4: Run tests**

```bash
cd server
npm test -- plugin-events.routes.test.ts workflows.routes.test.ts
```

- [x] **Step 5: Commit**

```bash
git add server/src/core/routes/plugin-events.routes.ts server/src/core/routes/plugin-events.routes.test.ts server/src/core/server.ts
git commit -m "feat: add generic plugin event receiver"
```

---

### Task 4: Frontend Trigger Editor Support

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/TriggerEditor.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/VariableTree.vue`
- Test: `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/triggerEditorPluginTriggers.test.ts`
- Test: `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/variableTreeInference.test.ts`

- [ ] **Step 1: Write failing UI tests**

Cover:

- only plugins with triggers appear
- trigger parameters render from manifest schema
- payload variables appear from `payloadSchema`
- public URL warning appears only for webhook triggers requiring public URL

- [ ] **Step 2: Implement UI from manifest**

No hardcoded plugin-specific UI. Render fields from `parameters`, variables from `payloadSchema`.

- [ ] **Step 3: Run frontend tests**

```bash
cd client-vue
npm test -- triggerEditorPluginTriggers.test.ts variableTreeInference.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/settings/editors
git commit -m "feat: render plugin event triggers in workflow editor"
```

---

### Task 5: Messaging Triggers

**Plugins:**
- `telegram`
- `discord`
- `slack`

**Files:**
- Modify: `server/src/plugins/sailor/telegram/manifest.json`
- Create/Modify: `server/src/plugins/sailor/telegram/triggers.ts`
- Test: `server/src/plugins/sailor/telegram/triggers.test.ts`
- Modify: `server/src/plugins/sailor/discord/manifest.json`
- Create: `server/src/plugins/sailor/discord/triggers.ts`
- Test: `server/src/plugins/sailor/discord/triggers.test.ts`
- Modify: `server/src/plugins/sailor/slack/manifest.json`
- Create: `server/src/plugins/sailor/slack/triggers.ts`
- Test: `server/src/plugins/sailor/slack/triggers.test.ts`

- [ ] **Step 1: Write failing payload normalization tests**

Expected normalized payload fields:

```ts
{
  eventId: string,
  messageId?: string,
  channelId?: string,
  userId?: string,
  text?: string,
  command?: string,
  raw: unknown
}
```

- [ ] **Step 2: Add manifest triggers**

Telegram:

- `onMessage`
- `onCommand`
- `onCallbackQuery`

Discord:

- `onMessage`
- `onSlashCommand`
- `onReaction`

Slack:

- `onMessage`
- `onMention`
- `onAppHomeOpened`

- [ ] **Step 3: Add trigger adapters**

Each adapter owns only provider-specific setup/teardown/normalization. No workflow engine imports.

- [ ] **Step 4: Run tests**

```bash
cd server
npm test -- telegram/triggers.test.ts discord/triggers.test.ts slack/triggers.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/src/plugins/sailor/telegram server/src/plugins/sailor/discord server/src/plugins/sailor/slack
git commit -m "feat: add messaging plugin triggers"
```

---

### Task 6: Google Workspace Triggers

**Plugins:**
- `google-gmail`
- `google-calendar`
- `google-drive`
- `google-sheets`
- `google-youtube`

**Files:**
- Modify/Create trigger files under each plugin folder.
- Tests beside each plugin trigger file.

- [ ] **Step 1: Write failing tests for all Google trigger manifests**

Events:

- Gmail: `onNewEmail`, `onEmailMatchingFilter`, `onAttachmentReceived`
- Calendar: `onEventCreated`, `onEventStartingSoon`, `onEventUpdated`
- Drive: `onFileCreated`, `onFileUpdated`, `onFolderChanged`
- Sheets: `onRowAdded`, `onRowUpdated`, `onSheetChanged`
- YouTube: `onNewVideo`, `onNewComment`, `onChannelUpdate`

- [ ] **Step 2: Add shared Google trigger helper inside Google plugin boundaries only when local**

If helper is needed, place it where ownership is clear:

```text
server/src/plugins/sailor/google-*/triggers.ts
```

Do not create cross-plugin imports between Google plugins.

- [ ] **Step 3: Use delivery modes correctly**

- Gmail/Drive/Calendar/YouTube: webhook or polling depending existing auth/provider support.
- Sheets: polling first unless a webhook channel already exists in codebase.
- Calendar `onEventStartingSoon`: polling/scheduler owned by core runtime, plugin only declares params.

- [ ] **Step 4: Run tests**

```bash
cd server
npm test -- google-gmail google-calendar google-drive google-sheets google-youtube
```

- [ ] **Step 5: Commit**

```bash
git add server/src/plugins/sailor/google-gmail server/src/plugins/sailor/google-calendar server/src/plugins/sailor/google-drive server/src/plugins/sailor/google-sheets server/src/plugins/sailor/google-youtube
git commit -m "feat: add google workspace plugin triggers"
```

---

### Task 7: Dev/Productivity Triggers

**Plugins:**
- `github`
- `jira`
- `trello`
- `notion`

**Files:**
- Modify/Create trigger files under each plugin folder.
- Tests beside each plugin trigger file.

- [ ] **Step 1: Write failing tests for manifests and normalization**

Events:

- GitHub: `onIssueOpened`, `onPullRequestOpened`, `onPullRequestReview`, `onWorkflowFailed`
- Jira: `onIssueCreated`, `onIssueUpdated`, `onStatusChanged`
- Trello: `onCardCreated`, `onCardMoved`, `onCommentAdded`
- Notion: `onPageCreated`, `onDatabaseItemCreated`, `onDatabaseItemUpdated`

- [ ] **Step 2: Implement provider-specific signature validation hooks**

Plugin adapter can expose normalization and signature metadata. Core performs route rejection.

- [ ] **Step 3: Add manifest schemas**

Common parameters:

- repo/project/board/database selector
- event filter
- optional branch/status/list filter

- [ ] **Step 4: Run tests**

```bash
cd server
npm test -- github jira trello notion
```

- [ ] **Step 5: Commit**

```bash
git add server/src/plugins/sailor/github server/src/plugins/sailor/jira server/src/plugins/sailor/trello server/src/plugins/sailor/notion
git commit -m "feat: add dev productivity plugin triggers"
```

---

### Task 8: Database Triggers

**Plugins:**
- `sailor-postgresql`
- `sailor-supabase`

**Files:**
- Modify: `server/src/plugins/sailor/postgresql/manifest.json`
- Create: `server/src/plugins/sailor/postgresql/triggers.ts`
- Test: `server/src/plugins/sailor/postgresql/triggers.test.ts`
- Modify: `server/src/plugins/sailor/supabase/manifest.json`
- Create: `server/src/plugins/sailor/supabase/triggers.ts`
- Test: `server/src/plugins/sailor/supabase/triggers.test.ts`

- [ ] **Step 1: Write failing tests**

Events:

- PostgreSQL: `onRowInserted`, `onRowUpdated`, `onQueryMatch`
- Supabase: `onRowInserted`, `onRowUpdated`, `onAuthUserCreated`

- [ ] **Step 2: Add safety limits**

Required params:

- table/schema allowlist
- poll interval or realtime channel
- max rows per run
- primary key column

- [ ] **Step 3: Implement normalization**

Payload:

```ts
{
  eventId: string,
  table?: string,
  schema?: string,
  operation: "insert" | "update" | "query_match" | "auth_user_created",
  row?: Record<string, unknown>,
  oldRow?: Record<string, unknown>,
  raw: unknown
}
```

- [ ] **Step 4: Run tests**

```bash
cd server
npm test -- postgresql/triggers.test.ts supabase/triggers.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/src/plugins/sailor/postgresql server/src/plugins/sailor/supabase
git commit -m "feat: add database plugin triggers"
```

---

### Task 9: End-to-End Trigger Publish Flow

**Files:**
- Test: `server/src/core/routes/workflows.routes.test.ts`
- Test: `server/src/core/routes/plugin-events.routes.test.ts`
- Test: `client-vue/src/features/workflow-editor/components/settings/editors/__tests__/triggerRuntimeUrls.test.ts`

- [ ] **Step 1: Write failing E2E-style tests**

Cover:

- create workflow with plugin trigger
- save assigns webhook path
- publish calls setup
- incoming event executes workflow
- unpublish calls teardown

- [ ] **Step 2: Fix lifecycle gaps**

Only adjust core lifecycle/routing. Do not add plugin-specific branching.

- [ ] **Step 3: Run tests**

```bash
cd server
npm test -- workflows.routes.test.ts plugin-events.routes.test.ts
cd ../client-vue
npm test -- triggerRuntimeUrls.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add server/src/core client-vue/src/features/workflow-editor/components/settings/editors
git commit -m "feat: support plugin trigger publish flow"
```

---

### Task 10: Security, Observability, and Docs

**Files:**
- Create: `docs/plugin-event-triggers.md`
- Modify: relevant runtime tests
- Modify: plugin template if present:
  - `server/src/plugins/_template/manifest.json`
  - `server/src/plugins/_template/index.ts`

- [ ] **Step 1: Document plugin trigger contract**

Include:

- manifest shape
- setup/teardown boundary
- normalization boundary
- security requirements
- examples for webhook, polling, realtime

- [ ] **Step 2: Add logs without secrets**

Log:

- trigger setup success/failure
- teardown success/failure
- event rejected reason
- event accepted execution id

Never log credentials or full raw payload by default.

- [ ] **Step 3: Update template plugin**

Template should show one disabled/example trigger contract without provider-specific behavior.

- [ ] **Step 4: Run full verification**

```bash
cd server
npm test
cd ../client-vue
npm test
```

- [ ] **Step 5: Commit**

```bash
git add docs/plugin-event-triggers.md server/src/plugins/_template server/src/core
git commit -m "docs: document plugin event trigger contract"
```

---

## Implementation Order

1. Task 1: shared contract.
2. Task 2: core runtime.
3. Task 3: generic receiver.
4. Task 4: frontend editor.
5. Task 5: messaging plugins.
6. Task 7: dev/productivity plugins.
7. Task 8: database plugins.
8. Task 6: Google plugins.
9. Task 9: E2E publish flow.
10. Task 10: docs/security/template.

## Acceptance Criteria

- All 14 plugins expose useful trigger manifests.
- Plugin Trigger editor remains generic.
- No plugin imports core workflow engine.
- No plugin imports another plugin.
- Publishing workflow sets up the trigger.
- Unpublishing workflow tears down the trigger.
- Incoming external event executes the right workflow once.
- Payload variables appear in editor from `payloadSchema`.
- Tests cover contract, lifecycle, route, UI, and each plugin family.

## Risk Notes

- Provider webhooks often require public URLs. Local development needs clear UI warning and test/listen mode.
- Polling triggers can become expensive. Use explicit interval, max rows/items, and dedupe.
- Database triggers are powerful and risky. Require allowlists and row limits.
- Signature validation differs per provider. Keep provider parsing isolated, but route rejection core-owned.
