# Pages Toolbox, Selection, and Resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move page creation into the Explorer Toolbox and add a polished, resizable block selection frame while removing obsolete canvas controls.

**Architecture:** Page creation remains a page-store operation, with `PageEditor` translating Toolbox actions and BaseCanvas drop coordinates into ordered insertion. Block resizing is driven by `BlockRenderer`, calculated by a pure utility, and persisted through the existing editor-store patch and undo flow.

**Tech Stack:** Vue 3, Pinia, TypeScript, CSS, Node test runner

---

### Task 1: Remove Obsolete Canvas Controls

**Files:**
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Test: `client-vue/src/features/web-pages/components/__tests__/PageEditor.contract.test.ts`
- Test: `client-vue/src/features/web-pages/components/__tests__/BlockRenderer.contract.test.ts`

- [ ] Change the contracts to reject `PageFloatingAddToolbar`, the canvas Add Page control, and `web-page-block-toolbar`.
- [ ] Run the focused contracts and confirm they fail on the existing controls.
- [ ] Remove the controls, unused imports, positioning state, watchers, and obsolete toolbar CSS.
- [ ] Run the focused contracts and confirm they pass.
- [ ] Mark Task 1 complete in `feats-map/improve-pages-toolbox-selection-resize-20260621.md` and commit.

### Task 2: Add Page to the Toolbox

**Files:**
- Modify: `client-vue/src/features/web-pages/components/PageToolboxPanel.vue`
- Modify: `client-vue/src/features/web-pages/components/PageExplorerPanel.vue`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/stores/pages.store.ts`
- Test: `client-vue/src/features/web-pages/components/__tests__/PageExplorer.contract.test.ts`
- Test: `client-vue/src/features/web-pages/stores/__tests__/pages.store.test.ts`

- [ ] Add failing tests for the Page Toolbox item, click event, dedicated drag payload, and indexed store insertion.
- [ ] Run those tests and verify the expected failures.
- [ ] Add a Page Toolbox item that emits `add-page` on click and writes `application/x-sailor-page` on drag.
- [ ] Add `createPageAt(index)` to the page store, clamping the index and keeping the new summary at that position.
- [ ] Wire PageEditor to create at the end for clicks and derive the insertion index from the nearest BaseCanvas page shell for drops.
- [ ] Render and clear a page insertion indicator during dragover/drop.
- [ ] Run the focused tests, mark Task 2 complete, and commit.

### Task 3: Add Selection Frame and Resize Handles

**Files:**
- Create: `client-vue/src/features/web-pages/utils/blockResize.ts`
- Create: `client-vue/src/features/web-pages/utils/__tests__/blockResize.test.ts`
- Modify: `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- Modify: `client-vue/src/features/web-pages/components/PageCanvas.vue`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Test: `client-vue/src/features/web-pages/components/__tests__/PageSelection.contract.test.ts`

- [ ] Write failing unit tests for corner geometry, opposite-corner anchoring, image aspect locking, text font sizing, and minimum clamps.
- [ ] Write a failing contract for four handles, the live size indicator, and resize patch emission.
- [ ] Run the focused tests and verify the failures.
- [ ] Implement pure resize calculation returning a `PageBlockStyles` patch.
- [ ] Render four pointer handles and a live indicator for only the selected editable block.
- [ ] Capture pointer movement in BlockRenderer and emit the final style patch to PageEditor.
- [ ] Replace dashed animation CSS with a solid offset frame and square corner handles.
- [ ] Run focused tests, mark Task 3 complete, and commit.

### Task 4: Verify the Feature

**Files:**
- Modify: `feats-map/improve-pages-toolbox-selection-resize-20260621.md`

- [ ] Run all web-pages component and store tests with `node --test src/features/web-pages/**/*.test.ts` from `client-vue`.
- [ ] Run `npm run type-check` from `client-vue`.
- [ ] Fix only regressions caused by this feature and rerun both checks.
- [ ] Mark Task 4 complete and commit the final checklist update.
