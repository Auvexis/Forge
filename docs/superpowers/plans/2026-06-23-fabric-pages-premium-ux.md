# Fabric Pages Premium UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first premium editor layer to Fabric Pages with a richer selection box, tabbed inspector, contextual controls, a dedicated assets panel, and tighter motion polish.

**Architecture:** Keep the current Pages feature boundaries. Add small focused components where the editor needs new surfaces, and keep resize/selection behavior inside `BlockRenderer.vue` so page rendering remains centralized.

**Tech Stack:** Vue 3, TypeScript, existing Fabric base components, contract tests with `node:test`, Vue type-check.

---

### Task 1: Premium Selection Box

**Files:**
- Modify: `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Test: `client-vue/src/features/web-pages/components/__tests__/PageSelection.contract.test.ts`

- [ ] Add a contextual mini toolbar inside selected blocks.
- [ ] Show a persistent size chip while selected and a lock-ratio chip while resizing.
- [ ] Keep existing duplicate, delete, inspect, rename, and resize behavior.
- [ ] Run `node --test src/features/web-pages/components/__tests__/PageSelection.contract.test.ts`.

### Task 2: Tabbed Inspector

**Files:**
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Test: `client-vue/src/features/web-pages/components/__tests__/BlockInspector.contract.test.ts`

- [ ] Add `Content`, `Style`, and `Advanced` segmented tabs for block inspection.
- [ ] Keep body and page inspector behavior unchanged.
- [ ] Render one inspector panel at a time to reduce visual weight.
- [ ] Run `node --test src/features/web-pages/components/__tests__/BlockInspector.contract.test.ts`.

### Task 3: Dedicated Assets Panel

**Files:**
- Create: `client-vue/src/features/web-pages/components/SiteAssetsPanel.vue`
- Modify: `client-vue/src/features/web-pages/components/PageExplorerPanel.vue`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Test: `client-vue/src/features/web-pages/components/__tests__/PageExplorer.contract.test.ts`

- [ ] Add an `Assets` explorer tab beside ToolBox, Tree, and Code.
- [ ] Show uploaded assets as compact thumbnail cards with path and size.
- [ ] Keep upload and delete actions wired through the existing site store events.
- [ ] Run `node --test src/features/web-pages/components/__tests__/PageExplorer.contract.test.ts`.

### Task 4: Polish Verification

**Files:**
- Modify: `feats-map/premium-fabric-pages-ux-20260623.md`

- [ ] Run focused contract tests for selection, inspector, and explorer.
- [ ] Run `npm run type-check`.
- [ ] Commit only the premium UX files.
