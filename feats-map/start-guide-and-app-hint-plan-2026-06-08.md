# Start Guide And App Hint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable profile-scoped tutorial system, a global guide book opened from the sidebar Docs action, and replace sidebar-only hints with a generic hover hint system usable by `BaseButton` and any UI element.

**Architecture:** `StartGuide` is a global overlay controlled by a shared composable/store. Components call `useStartGuide().openIfNeeded('feature-id')`, and progress is stored only in `localStorage` using the current Sailor profile id. `GuideBookComponent` reads the same tutorial registry, groups guides by category, and lets users manually open any guide. `AppHint` is a generic hover preview wrapper; `BaseButton` accepts a typed `hint` prop as a convenience.

**Tech Stack:** Vue 3, Pinia, TypeScript, existing localStorage helper pattern, Node test contracts.

---

## File Map

- Create: `client-vue/src/shared/start-guide/startGuide.types.ts`
  - Owns tutorial types: language, preview, step text, step, definition, progress.
- Create: `client-vue/src/shared/start-guide/startGuide.registry.ts`
  - Central map of feature tutorials with `category` metadata. Imports preview assets from `src/assets/start-guides/...`.
- Create: `client-vue/src/shared/start-guide/startGuideProgress.ts`
  - Reads/writes/removes profile-scoped localStorage progress keys.
- Create: `client-vue/src/shared/start-guide/startGuideController.store.ts`
  - Pinia controller for active guide, active step, selected language, skip, complete, close.
- Create: `client-vue/src/shared/start-guide/useStartGuide.ts`
  - Public API: `openIfNeeded(id)`, `open(id)`, `skip()`, `complete()`, `reset(id)`.
- Create: `client-vue/src/shared/start-guide/StartGuide.vue`
  - Pure UI for guide steps, preview media, language text, prev/next/skip/done.
- Create: `client-vue/src/shared/start-guide/StartGuideHost.vue`
  - Global host mounted once in `App.vue`.
- Create: `client-vue/src/shared/start-guide/GuideBookComponent.vue`
  - Global guide browser opened from the Docs sidebar action. Groups tutorials by category and opens guides manually.
- Create: `client-vue/src/shared/start-guide/GuideBookHost.vue`
  - Global host mounted once in `App.vue`.
- Create: `client-vue/src/shared/start-guide/__tests__/guideBook.contract.test.ts`
  - Contract tests for registry categories, guide grouping, and Docs sidebar integration.
- Modify: `server/src/core/modules/command-palette/providers/navigation.commands.ts`
  - Adds `guide-book.open` command.
- Modify: `server/src/core/modules/command-palette/providers/app.commands.test.ts`
  - Verifies the Guide Book command is searchable and returns the typed UI intent.
- Create: `client-vue/src/shared/start-guide/__tests__/startGuideProgress.test.ts`
  - Contract tests for localStorage keying, version behavior, skip/complete/reset.
- Create: `client-vue/src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Contract tests for API shape and integration points.
- Create: `client-vue/src/shared/components/hints/AppHint.types.ts`
  - Owns generic hint types.
- Create: `client-vue/src/shared/components/hints/AppHint.vue`
  - Generic hover preview wrapper for any element.
- Create: `client-vue/src/shared/components/hints/__tests__/appHint.contract.test.ts`
  - Contract tests for Teleport, position props, image/gif rendering, viewport updates.
- Modify: `client-vue/src/shared/components/base/BaseButton.vue`
  - Accepts `hint?: ButtonHint` and wraps button with `AppHint` when present.
- Modify: `client-vue/src/shared/components/layout/appSidebarNavigation.ts`
  - Add optional `hintId?: string` to nav/activity items. Keep navigation metadata only.
- Create: `client-vue/src/shared/components/layout/sidebarHints.ts`
  - Central hint registry for sidebar items.
- Modify: `client-vue/src/app/App.vue`
  - Mount `StartGuideHost`; replace `SidebarHint` usage with `AppHint`.
- Delete: `client-vue/src/shared/components/layout/SidebarHint.vue`
  - Removed after sidebar migration.
- Modify: `client-vue/src/shared/components/layout/__tests__/sidebarHint.contract.test.ts`
  - Remove or replace with AppHint/sidebar registry tests.
- Modify: `client-vue/src/shared/components/layout/__tests__/appSidebarNavigation.test.ts`
  - Assert `hintId` stays lightweight and navigation file does not import media.

---

## Tasks

### Task 1: Start Guide Types And Progress Contracts

**Files:**
- Create: `client-vue/src/shared/start-guide/startGuide.types.ts`
- Create: `client-vue/src/shared/start-guide/startGuideProgress.ts`
- Create: `client-vue/src/shared/start-guide/__tests__/startGuideProgress.test.ts`

- [ ] **Step 1: Write failing progress tests**
  - Test key format: `sailor:start-guide:v1:<profileId>:<featureId>`.
  - Test `completed` and `skipped` are persisted.
  - Test missing profile id returns no progress and writes nothing.
  - Test version mismatch is treated as not completed.
  - Test `resetStartGuideProgress(profileId, featureId)` removes the key.

- [ ] **Step 2: Run failing test**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideProgress.test.ts`
  - Expected: fail because files do not exist yet.

- [ ] **Step 3: Implement types and localStorage helpers**
  - Add `StartGuideLang`, `StartGuideStepText`, `StartGuideStep`, `StartGuideDefinition`, `StartGuideProgress`.
  - Add category metadata to `StartGuideDefinition`:
    - `category: string`
    - `categoryLabel?: string`
  - Category is used only by `GuideBookComponent`; tutorial auto-open behavior must not depend on category.
  - Add helpers:
    - `startGuideStorageKey(profileId, featureId)`
    - `readStartGuideProgress(profileId, featureId)`
    - `writeStartGuideProgress(profileId, progress)`
    - `hasCompletedStartGuide(profileId, definition)`
    - `resetStartGuideProgress(profileId, featureId)`

- [ ] **Step 4: Run test**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideProgress.test.ts`
  - Expected: pass.

- [ ] **Step 5: Commit**
  - Commit message: `feat: add start guide progress storage`

### Task 2: Start Guide Registry And Controller

**Files:**
- Create: `client-vue/src/shared/start-guide/startGuide.registry.ts`
- Create: `client-vue/src/shared/start-guide/startGuideController.store.ts`
- Create: `client-vue/src/shared/start-guide/useStartGuide.ts`
- Create: `client-vue/src/shared/start-guide/__tests__/startGuideController.contract.test.ts`

- [ ] **Step 1: Write failing controller contract tests**
  - Assert `useStartGuide` exposes `openIfNeeded`, `open`, `skip`, `complete`, `reset`.
  - Assert `openIfNeeded('plugin-creator')` uses registry lookup.
  - Assert `openIfNeeded` reads `useProfileStore().currentProfile?.id`.
  - Assert completed/skipped progress blocks auto-open.
  - Assert `open(id)` bypasses completed/skipped progress for manual replay.

- [ ] **Step 2: Run failing test**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Expected: fail because controller files do not exist yet.

- [ ] **Step 3: Implement registry**
  - Add at least one starter entry:
    - `featureId: 'plugin-creator'`
    - `version: 1`
    - `category: 'plugins'`
    - `categoryLabel: 'Plugins'`
    - `defaultLang: 'en'`
    - `autoOpen: true`
    - `steps` with `en`, `pt`, `es` text.
  - Use placeholder preview imports only if assets already exist; otherwise omit preview until real media is added.

- [ ] **Step 4: Implement controller store and composable**
  - Store active definition, active step index, active lang, and open state.
  - `openIfNeeded(id)` gets current profile id and skips when progress status is `completed` or `skipped` for the same version.
  - `skip()` writes `status: 'skipped'`.
  - `complete()` writes `status: 'completed'`.
  - `reset(id)` removes localStorage progress for current profile.

- [ ] **Step 5: Run test**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Expected: pass.

- [ ] **Step 6: Commit**
  - Commit message: `feat: add start guide controller`

### Task 3: Start Guide UI And Global Host

**Files:**
- Create: `client-vue/src/shared/start-guide/StartGuide.vue`
- Create: `client-vue/src/shared/start-guide/StartGuideHost.vue`
- Modify: `client-vue/src/app/App.vue`

- [ ] **Step 1: Write failing UI contract test**
  - Add source contract asserting `StartGuideHost` is mounted in `App.vue`.
  - Assert `StartGuide.vue` supports `image`, `gif`, and `video` preview branches.
  - Assert prev/next/done/skip buttons call controller methods.

- [ ] **Step 2: Run failing test**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Expected: fail because UI files do not exist yet.

- [ ] **Step 3: Implement `StartGuide.vue`**
  - Render modal with preview area.
  - Render localized title/description from current step language, falling back to `defaultLang`.
  - Use button labels from step text with defaults:
    - `Back`
    - `Next`
    - `Done`
    - `Skip`
  - Keep layout compact and readable.

- [ ] **Step 4: Implement `StartGuideHost.vue`**
  - Reads controller state.
  - Teleports modal to body.
  - Renders nothing when no guide is active.

- [ ] **Step 5: Mount host in `App.vue`**
  - Add `<StartGuideHost />` in the non-public overlay area.

- [ ] **Step 6: Run tests and type-check**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Run: `cd client-vue; npm run type-check`
  - Expected: pass.

- [ ] **Step 7: Commit**
  - Commit message: `feat: add start guide UI host`

### Task 4: Generic App Hint

**Files:**
- Create: `client-vue/src/shared/components/hints/AppHint.types.ts`
- Create: `client-vue/src/shared/components/hints/AppHint.vue`
- Create: `client-vue/src/shared/components/hints/__tests__/appHint.contract.test.ts`

- [ ] **Step 1: Write failing AppHint tests**
  - Assert `AppHint.types.ts` exports `HintPosition` and `AppHintContent`.
  - Assert `AppHint.vue` teleports to body.
  - Assert it accepts `position: 'left' | 'top' | 'right' | 'bottom'`.
  - Assert it supports `image` and `gif`.
  - Assert it updates position on resize/scroll and uses `ResizeObserver`.

- [ ] **Step 2: Run failing test**
  - Run: `cd client-vue; node --test src/shared/components/hints/__tests__/appHint.contract.test.ts`
  - Expected: fail because hint files do not exist yet.

- [ ] **Step 3: Implement `AppHint.types.ts`**
  - Add:
    - `HintPosition`
    - `AppHintContent`
    - `ButtonHint` alias if needed by `BaseButton`.

- [ ] **Step 4: Implement `AppHint.vue`**
  - Wrap default slot.
  - On hover, show preview card after short delay.
  - Position according to `hint.position ?? 'right'`.
  - Clamp to viewport.
  - Render `gif` or `image`; prefer `gif` when both exist.
  - Render title and description.

- [ ] **Step 5: Run test**
  - Run: `cd client-vue; node --test src/shared/components/hints/__tests__/appHint.contract.test.ts`
  - Expected: pass.

- [ ] **Step 6: Commit**
  - Commit message: `feat: add generic app hint`

### Task 5: BaseButton Hint Prop

**Files:**
- Modify: `client-vue/src/shared/components/base/BaseButton.vue`
- Create or modify: `client-vue/src/shared/components/base/__tests__/baseButtonHint.contract.test.ts`

- [ ] **Step 1: Write failing BaseButton hint contract**
  - Assert `BaseButton.vue` imports `AppHint`.
  - Assert props include `hint?: ButtonHint`.
  - Assert button is wrapped in `AppHint` only when hint exists.
  - Assert existing attrs still bind to the real `<button>`.

- [ ] **Step 2: Run failing test**
  - Run: `cd client-vue; node --test src/shared/components/base/__tests__/baseButtonHint.contract.test.ts`
  - Expected: fail because `BaseButton` has no hint prop yet.

- [ ] **Step 3: Refactor BaseButton template safely**
  - Move current button markup into a single internal template.
  - Render with `AppHint` when `hint` exists.
  - Render bare button when no hint exists.
  - Preserve `inheritAttrs: false` and `v-bind="$attrs"` on the real button.

- [ ] **Step 4: Run tests**
  - Run: `cd client-vue; node --test src/shared/components/base/__tests__/baseButtonHint.contract.test.ts`
  - Run: `cd client-vue; npm run type-check`
  - Expected: pass.

- [ ] **Step 5: Commit**
  - Commit message: `feat: support hints on base button`

### Task 6: Migrate Sidebar From SidebarHint To AppHint

**Files:**
- Create: `client-vue/src/shared/components/layout/sidebarHints.ts`
- Modify: `client-vue/src/shared/components/layout/appSidebarNavigation.ts`
- Modify: `client-vue/src/app/App.vue`
- Modify: `server/src/core/modules/command-palette/providers/navigation.commands.ts`
- Modify: `server/src/core/modules/command-palette/providers/app.commands.test.ts`
- Delete: `client-vue/src/shared/components/layout/SidebarHint.vue`
- Modify: `client-vue/src/shared/components/layout/__tests__/sidebarHint.contract.test.ts`
- Modify: `client-vue/src/shared/components/layout/__tests__/appSidebarNavigation.test.ts`

- [ ] **Step 1: Write failing sidebar contracts**
  - Assert `SidebarHint.vue` is no longer imported by `App.vue`.
  - Assert `App.vue` imports `AppHint`.
  - Assert `appSidebarNavigation.ts` supports `hintId?: string`.
  - Assert `appSidebarNavigation.ts` does not import `.gif`, `.png`, `.jpg`, or `.webp`.
  - Assert `sidebarHints.ts` exports hints for current sidebar ids.

- [ ] **Step 2: Run failing tests**
  - Run: `cd client-vue; node --test src/shared/components/layout/__tests__/appSidebarNavigation.test.ts src/shared/components/layout/__tests__/sidebarHint.contract.test.ts`
  - Expected: fail because migration is not done yet.

- [ ] **Step 3: Create `sidebarHints.ts`**
  - Add hints for:
    - `workflows`
    - `pages`
    - `agents`
    - `monitoring`
    - `universe`
    - `plugin-external-installer`
    - `search`
    - `monitor`
    - `docs`
    - `settings`
  - Start with text-only hints. Add media later through imports when assets exist.

- [ ] **Step 4: Add `hintId` to sidebar navigation types and items**
  - Add `hintId?: string` to `SidebarNavItem` and `SidebarActivityItem`.
  - Set each item `hintId` equal to its id unless a different id is needed.

- [ ] **Step 5: Replace `SidebarHint` usage in `App.vue`**
  - Use:
    - `<AppHint :hint="sidebarHintById[item.hintId ?? item.id]">`
    - `<AppHint :hint="sidebarHintById.search">`
  - Keep router-link/button behavior unchanged.

- [ ] **Step 6: Delete `SidebarHint.vue`**
  - Remove old component after all imports are gone.

- [ ] **Step 7: Run tests and type-check**
  - Run: `cd client-vue; node --test src/shared/components/layout/__tests__/appSidebarNavigation.test.ts src/shared/components/layout/__tests__/sidebarHint.contract.test.ts`
  - Run: `cd client-vue; npm run type-check`
  - Expected: pass.

- [ ] **Step 8: Commit**
  - Commit message: `refactor: replace sidebar hints with app hints`

### Task 7: Guide Book Component And Docs Sidebar Action

**Files:**
- Create: `client-vue/src/shared/start-guide/GuideBookComponent.vue`
- Create: `client-vue/src/shared/start-guide/GuideBookHost.vue`
- Create: `client-vue/src/shared/start-guide/__tests__/guideBook.contract.test.ts`
- Modify: `client-vue/src/shared/start-guide/startGuide.types.ts`
- Modify: `client-vue/src/shared/start-guide/startGuide.registry.ts`
- Modify: `client-vue/src/shared/start-guide/startGuideController.store.ts`
- Modify: `client-vue/src/shared/start-guide/useStartGuide.ts`
- Modify: `client-vue/src/shared/components/layout/appSidebarNavigation.ts`
- Modify: `client-vue/src/app/App.vue`

- [ ] **Step 1: Write failing GuideBook contracts**
  - Assert `StartGuideDefinition` includes `category`.
  - Assert every guide in `startGuideRegistry` has a non-empty `category`.
  - Assert `GuideBookComponent.vue` groups guides by category.
  - Assert `GuideBookComponent.vue` calls `useStartGuide().open(id)` to manually replay a guide.
  - Assert the sidebar Docs item uses an app intent instead of external docs URL:
    - `intent: { type: 'guide-book.open' }`
  - Assert `App.vue` handles `guide-book.open` and mounts `GuideBookHost`.
  - Assert command palette registers `guide-book.open`.
  - Assert command palette execution returns:
    - `uiIntent: { type: 'guide-book.open' }`

- [ ] **Step 2: Run failing test**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/guideBook.contract.test.ts src/shared/components/layout/__tests__/appSidebarNavigation.test.ts`
  - Run: `cd server; node --test --import ts-node/register src/core/modules/command-palette/providers/app.commands.test.ts`
  - Expected: fail because GuideBook files and Docs intent do not exist yet.

- [ ] **Step 3: Add GuideBook state to controller**
  - Add `isGuideBookOpen`.
  - Add `openGuideBook()`.
  - Add `closeGuideBook()`.
  - Keep guide book state separate from active tutorial modal state.

- [ ] **Step 4: Implement `GuideBookComponent.vue`**
  - Read all entries from `startGuideRegistry`.
  - Group by `category`.
  - Display `categoryLabel ?? category`.
  - Show guide title using first step title for the current/default language.
  - Show a short description using first step description for the current/default language.
  - Each guide row has an open action that calls `useStartGuide().open(featureId)`.
  - Do not write progress when opening from the guide book. Progress changes only when user skips or completes the tutorial modal.

- [ ] **Step 5: Implement `GuideBookHost.vue`**
  - Teleport to body.
  - Render `GuideBookComponent` only when `isGuideBookOpen` is true.
  - Close on close button/backdrop.

- [ ] **Step 6: Convert Docs sidebar item to GuideBook opener**
  - In `appSidebarNavigation.ts`, add `intent?: SidebarNavIntent` to `SidebarActivityItem`.
  - In `appSidebarNavigation.ts`, change activity item `docs` description to guide book copy.
  - Add `intent: { type: 'guide-book.open' }` to `docs`.
  - In `App.vue`, replace the external docs anchor with a button that dispatches/handles the guide book intent.
  - Mount `<GuideBookHost />` in the non-public overlay area.

- [ ] **Step 7: Add command palette Guide Book command**
  - In `navigation.commands.ts`, add a command:
    - id: `guide-book.open`
    - group: `navigation`
    - label: `Open Guide Book`
    - icon: `book-open`
    - keywords: `guide`, `tutorial`, `docs`, `help`, `start guide`
    - uiIntent: `{ type: 'guide-book.open' }`

- [ ] **Step 8: Run tests and type-check**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/guideBook.contract.test.ts src/shared/components/layout/__tests__/appSidebarNavigation.test.ts`
  - Run: `cd server; node --test --import ts-node/register src/core/modules/command-palette/providers/app.commands.test.ts`
  - Run: `cd client-vue; npm run type-check`
  - Expected: pass.

- [ ] **Step 9: Commit**
  - Commit message: `feat: add guide book for tutorials`

### Task 8: Wire One Real Auto-Open Tutorial

**Files:**
- Modify one target component after choosing first feature, recommended:
  - `client-vue/src/features/plugins/components/ExternalPluginInstaller.vue`
- Modify: `client-vue/src/shared/start-guide/startGuide.registry.ts`
- Create assets folder if media exists:
  - `client-vue/src/assets/start-guides/plugin-external-installer/`

- [ ] **Step 1: Write failing integration contract**
  - Assert selected feature component imports `useStartGuide`.
  - Assert it calls `openIfNeeded('plugin-external-installer')` in `onMounted`.
  - Assert registry has `plugin-external-installer`.

- [ ] **Step 2: Run failing test**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Expected: fail because no feature calls it yet.

- [ ] **Step 3: Add registry entry**
  - Add `plugin-external-installer` with `en`, `pt`, `es` text.
  - Set `category: 'plugins'` and `categoryLabel: 'Plugins'`.
  - Use text-only previews unless real assets are available.

- [ ] **Step 4: Call tutorial utility in target component**
  - Add:
    - `const startGuide = useStartGuide()`
    - `onMounted(() => startGuide.openIfNeeded('plugin-external-installer'))`
  - Do not add database calls.

- [ ] **Step 5: Run tests and type-check**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Run: `cd client-vue; npm run type-check`
  - Expected: pass.

- [ ] **Step 6: Commit**
  - Commit message: `feat: auto-open plugin installer guide`

### Task 9: Full Verification

**Files:**
- No new files expected.

- [ ] **Step 1: Run frontend checks**
  - Run: `cd client-vue; npm run type-check`
  - Expected: pass.

- [ ] **Step 2: Run frontend build**
  - Run: `cd client-vue; npm run build`
  - Expected: pass.

- [ ] **Step 3: Run targeted tests**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideProgress.test.ts src/shared/start-guide/__tests__/startGuideController.contract.test.ts src/shared/start-guide/__tests__/guideBook.contract.test.ts`
  - Run: `cd client-vue; node --test src/shared/components/hints/__tests__/appHint.contract.test.ts src/shared/components/base/__tests__/baseButtonHint.contract.test.ts`
  - Run: `cd client-vue; node --test src/shared/components/layout/__tests__/appSidebarNavigation.test.ts src/shared/components/layout/__tests__/sidebarHint.contract.test.ts`
  - Run: `cd server; node --test --import ts-node/register src/core/modules/command-palette/providers/app.commands.test.ts`
  - Expected: pass.

- [ ] **Step 4: Manual browser QA**
  - Start dev server.
  - Enter a profile.
  - Open target feature.
  - Confirm tutorial auto-opens only once.
  - Click Skip and reload; confirm it does not reopen.
  - Reset with `useStartGuide().reset(id)` during dev or clear localStorage; confirm it reopens.
  - Hover sidebar items; confirm hints appear and stay inside viewport.
  - Hover a `BaseButton` with `hint`; confirm generic hint appears.
  - Click Docs in sidebar; confirm GuideBook opens.
  - Open Command Palette and run `Open Guide Book`; confirm GuideBook opens.
  - Confirm GuideBook groups guides by category.
  - Open a guide from GuideBook; confirm it replays even when completed/skipped.

- [ ] **Step 5: Commit verification/doc cleanup if needed**
  - Commit message if files changed: `test: verify start guide and app hint`

### Task 10: Start Guide Language And Rich Component Previews

**Files:**
- Modify: `client-vue/src/shared/start-guide/startGuide.types.ts`
- Modify: `client-vue/src/shared/start-guide/startGuideController.store.ts`
- Modify: `client-vue/src/shared/start-guide/StartGuide.vue`
- Create: `client-vue/src/shared/start-guide/startGuidePreviewComponents.ts`
- Create: `client-vue/src/shared/start-guide/previews/UtilityNodesGuidePreview.vue`
- Modify: `client-vue/src/shared/start-guide/startGuide.registry.ts`
- Modify: `client-vue/src/shared/start-guide/__tests__/startGuideController.contract.test.ts`

- [x] **Step 1: Write failing contracts**
  - Assert `StartGuidePreview` supports `type: 'component'`.
  - Assert component previews use a registry key instead of importing heavy Vue components into every guide definition.
  - Assert `StartGuide.vue` renders a dynamic component for component previews.
  - Assert `StartGuide.vue` exposes a language control for `en`, `pt`, and `es`.
  - Assert controller exposes `setLang(lang)`.
  - Assert modal width/spacing is larger than the first implementation.

- [x] **Step 2: Run failing test**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Expected: fail because component previews/language control do not exist yet.

- [x] **Step 3: Implement preview component support**
  - Add typed component preview:
    - `type: 'component'`
    - `component: StartGuidePreviewComponentId`
    - `props?: Record<string, unknown>`
  - Add `startGuidePreviewComponents.ts` as the only file that maps component ids to Vue components.
  - Keep registry entries clean: guides reference component ids, not imported components.

- [x] **Step 4: Add language selector**
  - Add `setLang(lang)` in controller.
  - Render a compact language selector in `StartGuide.vue`.
  - Keep fallback to `defaultLang` when translated step text is missing.

- [x] **Step 5: Improve modal sizing and spacing**
  - Increase modal width and preview height.
  - Add more breathing room in content and actions.
  - Keep responsive constraints for mobile.

- [x] **Step 6: Add first rich preview example**
  - Create `UtilityNodesGuidePreview.vue` with an interactive list of core utility nodes.
  - Each item opens an internal dialog with localized description.
  - Add one registry entry or step using `type: 'component'` to prove the API.

- [x] **Step 7: Run tests, type-check, build**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Run: `cd client-vue; npm run type-check`
  - Run: `cd client-vue; npm run build`
  - Expected: pass.

- [ ] **Step 8: Commit**
  - Commit message: `feat: enhance start guide previews and language`

### Task 11: Fix Start Guide Language Control And Utility Node Visual Fidelity

**Files:**
- Modify: `client-vue/src/shared/start-guide/StartGuide.vue`
- Modify: `client-vue/src/shared/start-guide/previews/UtilityNodesGuidePreview.vue`
- Modify: `client-vue/src/shared/start-guide/__tests__/startGuideController.contract.test.ts`

- [x] **Step 1: Write failing contracts**
  - Assert language selection uses direct buttons instead of dropdown inside modal.
  - Assert each language button calls `controller.setLang(lang)`.
  - Assert utility nodes render real Lucide icons, not color dots.
  - Assert utility nodes include the same core utility presets shown by the workflow add-node panel.
  - Assert each utility node owns an explicit color/accent.

- [x] **Step 2: Run failing test**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Expected: fail until the UI uses direct language buttons and node icons.

- [x] **Step 3: Replace dropdown language selector**
  - Remove `BaseDropdownSelect` from `StartGuide.vue`.
  - Render a segmented language control with `EN`, `PT`, `ES`.
  - Keep the same controller API: `controller.setLang(lang)`.

- [x] **Step 4: Improve utility node preview**
  - Import `LucideIcon`.
  - Replace dots with the node icon.
  - Add all core utility nodes from the add-node panel presets.
  - Keep each node color explicit and visual.

- [x] **Step 5: Run verification**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Run: `cd client-vue; npm run type-check`
  - Expected: pass.

- [ ] **Step 6: Commit**
  - Commit message: `fix: improve start guide language and utility nodes`

---

## Self-Review

- Spec coverage:
  - Profile + localStorage only: covered in Tasks 1 and 2.
  - Auto-open tutorial utility: covered in Tasks 2 and 7.
  - Global host architecture: covered in Task 3.
  - Central tutorial registry: covered in Tasks 2 and 7.
  - Generic hint replacing SidebarHint: covered in Tasks 4 and 6.
  - `BaseButton` hint prop: covered in Task 5.
  - No media in navigation file: covered in Task 6.
  - Docs sidebar opens GuideBook: covered in Task 7.
  - Command Palette opens GuideBook: covered in Task 7.
  - Guide categories for pages/components with multiple guides: covered in Tasks 1, 2, 7, and 8.
- Placeholder scan:
  - No open-ended implementation placeholders. Text-only preview is explicit until real media assets exist.
- Type consistency:
  - `StartGuideDefinition`, `StartGuideProgress`, `AppHintContent`, `ButtonHint`, and `GuideBookComponent` are used consistently across tasks.
