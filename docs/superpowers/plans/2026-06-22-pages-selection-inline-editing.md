# Pages Selection and Inline Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make selected canvas elements clearly visible and directly editable without requiring the Inspector.

**Architecture:** `BlockRenderer` renders transient selection controls and inline text editing state, while `PageCanvas` and `PageEditor` forward mutations to the existing editor store. This preserves Tree, Inspector, selection, and undo synchronization without duplicating domain state.

**Tech Stack:** Vue 3, Pinia, TypeScript, CSS, Node test runner

---

### Task 1: Selection Frame and Controls

**Files:**
- Modify: `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- Modify: `client-vue/src/features/web-pages/components/PageCanvas.vue`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Test: `client-vue/src/features/web-pages/components/__tests__/PageSelection.contract.test.ts`

- [ ] Add a failing contract for blue selection styling, four visible handles, ID editing, and duplicate/delete actions.
- [ ] Run the focused contract and verify it fails on the missing controls.
- [ ] Render the ID badge, validated inline input, and action buttons in `BlockRenderer`.
- [ ] Forward rename, duplicate, and delete events through `PageCanvas` to existing store-backed editor handlers.
- [ ] Style the frame, handles, badge, input, and actions with blue selection tokens and clear contrast.
- [ ] Run the focused contract, update the task map, and commit.

### Task 2: Inline Text Editing

**Files:**
- Modify: `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- Modify: `client-vue/src/features/web-pages/components/PageCanvas.vue`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Test: `client-vue/src/features/web-pages/components/__tests__/PageSelection.contract.test.ts`

- [ ] Add a failing contract requiring contenteditable only for text, button, and link blocks.
- [ ] Run the focused contract and verify the expected failure.
- [ ] Add local edit state with double-click entry, focus, Enter/blur commit, and Escape cancel.
- [ ] Disable native block dragging while inline editing and emit a `props.text` patch on commit.
- [ ] Forward the patch to `editorStore.patchBlock` and keep non-text double-click Inspector behavior.
- [ ] Run focused tests, update the task map, and commit.

### Task 3: Verification

**Files:**
- Modify: `feats-map/improve-pages-selection-inline-editing-20260622.md`

- [ ] Run `node --test "src/features/web-pages/**/*.test.ts"` from `client-vue`.
- [ ] Run `npm run type-check` from `client-vue`.
- [ ] Fix only regressions caused by this feature, mark verification complete, and commit.
