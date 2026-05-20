# Plugin Trigger Configurable Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable standard and plugin-specific filters to every Plugin Trigger so users can decide what events to accept or ignore before a workflow runs.

**Architecture:** Plugins stay manifest-driven and isolated. Each plugin declares useful filter fields in `manifest.json`; the frontend renders them generically with `BaseVariableInput`; the core applies generic filtering to normalized payloads before executing workflows. Provider-specific hooks remain inside plugin folders.

**Tech Stack:** TypeScript, Fastify, Vue 3, existing manifest JSON schema, Node test runner, existing Sailor workflow engine.

---

## Rules

- Work on branch `dev`.
- Create/update this `feats-map/` file before code changes.
- TDD before feature implementation.
- Commit after completed task.
- Plugins cannot import core/engine or other plugins.
- Plugin UI must remain generic and manifest-driven.
- Trigger config inputs must use `BaseVariableInput.vue`, not `BaseInput.vue`.

## Design

Standard filters are ordinary trigger params with shared names. The core understands these fields:

- `channelId`
- `guildId`
- `userId`
- `resourceId`
- `resourceType`
- `eventAction`
- `textContains`
- `textRegex`
- `messageId`
- `emoji`
- `commandName`
- `ignoreBots`

Custom filters remain plugin-specific manifest parameters. If the core does not know a field, it stores it in `triggerParams` for plugin/runtime use and does not block execution.

Payload matching is conservative:

- Empty filter values are ignored.
- Exact ID filters compare string values.
- `textContains` is case-insensitive.
- `textRegex` uses safe regex construction; invalid regex fails closed and skips event.
- `ignoreBots=true` skips payloads with `bot`, `isBot`, `authorBot`, or `userIsBot` truthy.
- A filtered-out event returns `202 ignored` and does not execute workflow.

---

### Task 1: Core Filter Service

**Files:**
- Create: `server/src/core/modules/workflows/plugin-trigger-filter.ts`
- Create: `server/src/core/modules/workflows/plugin-trigger-filter.test.ts`
- Modify: `server/src/core/routes/plugin-events.routes.ts`
- Modify: `server/src/core/routes/plugin-events.routes.test.ts`

- [x] **Step 1: Write failing filter tests**

Add tests for exact ID match, text contains, regex, ignore bots, and invalid regex.

Run:

```bash
cd server
node --loader ts-node/esm --test src/core/modules/workflows/plugin-trigger-filter.test.ts
```

Expected: FAIL because `plugin-trigger-filter.ts` does not exist.

- [x] **Step 2: Implement filter service**

Create a pure function:

```ts
export function evaluatePluginTriggerFilters(
  params: Record<string, unknown>,
  payload: Record<string, unknown>,
): { accepted: true } | { accepted: false; reason: string }
```

- [x] **Step 3: Wire route**

In `plugin-events.routes.ts`, after normalization and before dedupe/execution:

```ts
const filterResult = evaluatePluginTriggerFilters(entry.trigger.triggerParams ?? {}, normalizedPayload);
if (!filterResult.accepted) return reply.code(202).send({ status: "ignored", reason: filterResult.reason });
```

- [x] **Step 4: Run tests**

```bash
cd server
node --loader ts-node/esm --test src/core/modules/workflows/plugin-trigger-filter.test.ts src/core/routes/plugin-events.routes.test.ts
npx tsc --noEmit
```

- [x] **Step 5: Commit**

```bash
git add server/src/core/modules/workflows/plugin-trigger-filter.ts server/src/core/modules/workflows/plugin-trigger-filter.test.ts server/src/core/routes/plugin-events.routes.ts server/src/core/routes/plugin-events.routes.test.ts feats-map/plugin-trigger-configurable-filters.md
git commit -m "feat: filter plugin trigger events before execution"
```

---

### Task 2: Frontend Generic Trigger Param Inputs

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/TriggerEditor.vue`
- Test: existing editor tests if practical in current test setup.

- [x] **Step 1: Verify current rendering**

Confirm the Plugin Trigger param renderer uses `BaseVariableInput` for text-like params and does not use `BaseInput`.

- [x] **Step 2: Add type-aware generic rendering**

Support:

- string/number/integer with `BaseVariableInput`
- boolean with `BaseVariableInput` and stable string values `true`/`false`
- enum/select with existing generic select if already used by local pattern

- [x] **Step 3: Preserve variable support**

For all editable param values, keep `BaseVariableInput` so users can use workflow variables.

- [x] **Step 4: Run frontend type/build check**

```bash
cd client-vue
npm run build
```

- [x] **Step 5: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/settings/editors/TriggerEditor.vue feats-map/plugin-trigger-configurable-filters.md
git commit -m "feat: render configurable plugin trigger filters"
```

---

### Task 3: Add Useful Filters To All Trigger Manifests

**Files:**
- Modify: `server/src/plugins/sailor/*/manifest.json` for the 14 trigger-capable plugins.
- Modify: `server/src/plugins/sailor/plugin-triggers-manifest.test.ts`

- [x] **Step 1: Write failing manifest assertions**

Assert Discord trigger params include:

- `channelId`
- `messageContains`
- `ignoreBots`
- `commandName` for slash commands
- `emoji` for reactions

Assert all 14 trigger plugins have at least one meaningful filter parameter.

- [x] **Step 2: Update Discord filters**

Add:

- `guildId`
- `channelId`
- `userId`
- `messageId`
- `messageContains`
- `messageRegex`
- `commandName`
- `emoji`
- `ignoreBots`

- [x] **Step 3: Update messaging filters**

Telegram and Slack get:

- `channelId`
- `userId`
- `messageContains`
- `messageRegex`
- `commandName`
- `ignoreBots`

- [x] **Step 4: Update productivity/content/data filters**

Add useful resource filters:

- Google/GitHub/Jira/Trello/Notion/YouTube: `resourceId`, `resourceType`, `eventAction`, plus provider-specific fields.
- PostgreSQL/Supabase: `schema`, `table`, `primaryKey`, `maxRows`, plus `eventAction`.

- [x] **Step 5: Run tests and commit**

```bash
cd server
node --loader ts-node/esm --test src/plugins/sailor/plugin-triggers-manifest.test.ts
npx tsc --noEmit
git add server/src/plugins/sailor feats-map/plugin-trigger-configurable-filters.md
git commit -m "feat: add configurable filters to plugin trigger manifests"
```

---

### Task 4: Verification

**Files:**
- No production changes expected.

- [ ] **Step 1: Run backend verification**

```bash
cd server
node --loader ts-node/esm --test src/core/modules/workflows/plugin-trigger-filter.test.ts src/core/routes/plugin-events.routes.test.ts src/plugins/sailor/plugin-triggers-manifest.test.ts src/plugins/sailor/telegram/triggers.test.ts src/plugins/sailor/slack/triggers.test.ts src/plugins/sailor/discord/triggers.test.ts
npx tsc --noEmit
```

- [ ] **Step 2: Run dev smoke**

```bash
cd server
$env:PORT=23999; npm run dev
```

Expected: server starts and loads 22 plugins.

- [ ] **Step 3: Commit task map if only checkbox changes remain**

```bash
git add feats-map/plugin-trigger-configurable-filters.md
git commit -m "chore: complete plugin trigger filter task map"
```
