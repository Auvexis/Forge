# Sailor Pages Canva Editor UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve Sailor Pages from a single structural page editor into a Canva-like multi-page site editor with selectable body/page metadata, better drag prediction, collapsible panels, richer element tree, and page/site switching.

**Architecture:** Keep the backend `pages` module as the authority for persisted page HTML documents. Add frontend editor state for selected target (`body`, `page`, or block), drag preview intent, collapsed side panels, and page switching. Multi-page support is implemented as multiple `SailorPage` records per profile/site for now; each page remains one published HTML file, and the canvas displays the active page plus an add-page control below it.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vite, existing Sailor shared components, Fastify Pages API, Node test runner.

---

## Product Decisions

- Body inspector appears only when the user clicks the page body/canvas.
- Page metadata inspector appears when the user selects the page from the page strip or page header.
- A block inspector appears only when a block is selected.
- Left panel contains the element tree only, but the tree gets real editor functionality: expand/collapse, depth guides, icons, labels, visibility/selection affordances, drag handles, and row actions.
- Right panel contains blocks and the inspector for the current selection.
- Drag/drop must show a visible predicted placement before the user releases the mouse.
- Side panels can collapse and reopen without losing selection.
- Dropdown actions use:
  - `client-vue/src/shared/components/overlay/Dropdown/AppDropdownMenu.vue`
  - `client-vue/src/shared/components/overlay/Dropdown/AppDropdownItem.vue`
  - `client-vue/src/shared/components/overlay/Dropdown/AppDropdownDivider.vue`
- Page/site switcher modal uses:
  - `client-vue/src/shared/components/base/BaseModal.vue`
- Multi-page behavior follows Canva's mental model:
  - Each page is its own HTML document.
  - The editor can switch between pages.
  - The canvas shows an add-page button below the current page.
  - Page metadata and body styles live in the inspector when that page/body is selected.

## Existing Constraints

- Stay on branch `dev`.
- Before implementation, keep a task map in `feats-map/`.
- Use TDD for risky logic/contracts; simple visual polish can use focused contract tests and manual smoke.
- Use existing shared/base components only.
- Use token variables from `client-vue/src/assets/styles/tokens.css`; feature CSS stays in `client-vue/src/features/web-pages/pages.css`.
- Do not touch unrelated dirty files.
- Do not create a new branch.

## File Structure

### Frontend Modify

- `client-vue/src/features/web-pages/types/page.types.ts`
  - Add editor-facing selection types if colocated types are not split.
- `client-vue/src/features/web-pages/stores/pages.store.ts`
  - Add active page switching helpers and create-page-below flow.
- `client-vue/src/features/web-pages/stores/page-editor.store.ts`
  - Add selected target, collapsed tree ids, and drag intent.
- `client-vue/src/features/web-pages/utils/blockTree.ts`
  - Add flatten/tree metadata helpers for the improved tree.
- `client-vue/src/features/web-pages/components/PageEditor.vue`
  - Orchestrate selected target, collapsible panels, dropdown actions, modal, and multi-page canvas controls.
- `client-vue/src/features/web-pages/components/PageCanvas.vue`
  - Make body selectable and show root/page drop prediction.
- `client-vue/src/features/web-pages/components/BlockRenderer.vue`
  - Show per-block drop prediction and emit drag-over intent.
- `client-vue/src/features/web-pages/components/BlockTreePanel.vue`
  - Upgrade tree UI and interactions.
- `client-vue/src/features/web-pages/components/BlockStylePanel.vue`
  - Reuse for body style only when body selected.
- `client-vue/src/features/web-pages/components/BlockContentPanel.vue`
  - Keep block content only.
- `client-vue/src/features/web-pages/pages.css`
  - Add panel collapsed states, tree polish, drag indicators, page controls, and modal preview styles.

### Frontend Create

- `client-vue/src/features/web-pages/components/PageMetadataPanel.vue`
  - Edits title, slug, and future metadata fields in the inspector.
- `client-vue/src/features/web-pages/components/PageSwitcherModal.vue`
  - Shows page preview cards and names inside `BaseModal`.
- `client-vue/src/features/web-pages/components/PageEditorActionsMenu.vue`
  - Dropdown wrapper for editor-level actions.
- `client-vue/src/features/web-pages/components/__tests__/PageSelection.contract.test.ts`
  - Contracts for selecting body/page/block and inspector behavior.
- `client-vue/src/features/web-pages/components/__tests__/PageDragPredict.contract.test.ts`
  - Contracts for drag intent/prediction classes and events.
- `client-vue/src/features/web-pages/components/__tests__/PagePanels.contract.test.ts`
  - Contracts for panel collapse and dropdown actions.
- `client-vue/src/features/web-pages/components/__tests__/PageSwitcher.contract.test.ts`
  - Contracts for modal switcher and page preview cards.
- `client-vue/src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts`
  - Contracts for richer tree interactions.

### Backend Modify

- No backend schema change is required for this round if each page remains one existing `SailorPage` record.
- Backend changes are allowed only if frontend discovers a missing API field required for page metadata.

---

## Implementation Tasks

### Task 1: Selection Model for Page, Body, and Blocks

**Files:**
- Modify: `client-vue/src/features/web-pages/stores/page-editor.store.ts`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/components/PageCanvas.vue`
- Create: `client-vue/src/features/web-pages/components/PageMetadataPanel.vue`
- Create: `client-vue/src/features/web-pages/components/__tests__/PageSelection.contract.test.ts`

- [ ] **Step 1: Write failing selection contract**

Create `PageSelection.contract.test.ts` asserting:
- `PageCanvas.vue` emits `select-body`.
- `PageEditor.vue` tracks a selected target type.
- Body style panel is rendered only when selected target is `body`.
- Block inspector is rendered only when selected target is `block`.
- `PageMetadataPanel.vue` exists and is used when selected target is `page`.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PageSelection.contract.test.ts
```

Expected: fail because body/page selection does not exist yet.

- [ ] **Step 2: Implement selected target state**

In `page-editor.store.ts`, add:

```ts
export type PageEditorSelection =
  | { type: 'page' }
  | { type: 'body' }
  | { type: 'block'; blockId: string }
  | { type: 'none' }
```

Store behavior:
- `selectPage()` sets `{ type: 'page' }`.
- `selectBody()` sets `{ type: 'body' }`.
- `selectBlock(blockId)` sets `{ type: 'block', blockId }` and preserves existing `selectedBlockId`.
- `clearSelection()` sets `{ type: 'none' }`.

- [ ] **Step 3: Wire body and page selection**

In `PageCanvas.vue`:
- Add `@click.self` on the body wrapper.
- Emit `select-body`.

In `PageEditor.vue`:
- Add a page header/handle above the canvas page.
- Clicking the page handle selects page metadata.
- Render:
  - `PageMetadataPanel` for `page`.
  - `BlockStylePanel` with `bodyStyleBlock` for `body`.
  - block panels for `block`.
  - simple empty state for `none`.

- [ ] **Step 4: Verify**

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PageSelection.contract.test.ts src/features/web-pages/components/__tests__/PageEditor.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add client-vue/src/features/web-pages/stores/page-editor.store.ts client-vue/src/features/web-pages/components/PageEditor.vue client-vue/src/features/web-pages/components/PageCanvas.vue client-vue/src/features/web-pages/components/PageMetadataPanel.vue client-vue/src/features/web-pages/components/__tests__/PageSelection.contract.test.ts
git commit -m "feat: add page and body selection in pages editor"
```

### Task 2: Drag Prediction Indicators

**Files:**
- Modify: `client-vue/src/features/web-pages/stores/page-editor.store.ts`
- Modify: `client-vue/src/features/web-pages/components/PageCanvas.vue`
- Modify: `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Create: `client-vue/src/features/web-pages/components/__tests__/PageDragPredict.contract.test.ts`

- [ ] **Step 1: Write failing drag prediction contract**

Create tests asserting:
- `page-editor.store.ts` exposes `dragIntent`.
- `BlockRenderer.vue` emits drag-over placement intent with `targetId` and `position`.
- `PageCanvas.vue` clears drag intent on drag leave/drop.
- CSS includes classes for `web-page-drop-indicator`, `web-page-block--drop-before`, `web-page-block--drop-after`, and `web-page-block--drop-inside`.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PageDragPredict.contract.test.ts
```

Expected: fail because prediction state/classes are missing.

- [ ] **Step 2: Add drag intent state**

In `page-editor.store.ts`, add:

```ts
export interface PageDragIntent {
  targetId: string | 'root'
  position: 'before' | 'inside' | 'after'
}
```

Store behavior:
- `setDragIntent(intent)` stores current predicted placement.
- `clearDragIntent()` clears it.
- Drop handlers clear intent after move/insert.

- [ ] **Step 3: Render indicators**

In `BlockRenderer.vue`:
- Emit `drag-intent` during dragover.
- Apply classes based on current intent.
- For `inside`, show an inset outline.
- For `before`/`after`, show a horizontal insertion line.

In `PageCanvas.vue`:
- Show root indicator when dropping into empty canvas or below the last block.
- Clear prediction on `dragleave` and `drop`.

- [ ] **Step 4: Verify**

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PageDragPredict.contract.test.ts src/features/web-pages/components/__tests__/BlockLibrary.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add client-vue/src/features/web-pages/stores/page-editor.store.ts client-vue/src/features/web-pages/components/PageCanvas.vue client-vue/src/features/web-pages/components/BlockRenderer.vue client-vue/src/features/web-pages/pages.css client-vue/src/features/web-pages/components/__tests__/PageDragPredict.contract.test.ts
git commit -m "feat: add drag prediction indicators to pages editor"
```

### Task 3: Collapsible Left and Right Panels

**Files:**
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Create: `client-vue/src/features/web-pages/components/__tests__/PagePanels.contract.test.ts`

- [ ] **Step 1: Write failing panel contract**

Create tests asserting:
- `PageEditor.vue` has `isLeftPanelOpen` and `isRightPanelOpen`.
- There are toggle buttons for left and right panels.
- `AppPanel` receives dynamic `is-open`.
- Collapsed state does not clear selected block/target.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PagePanels.contract.test.ts
```

Expected: fail because panels are always open.

- [ ] **Step 2: Implement panel toggles**

In `PageEditor.vue`:
- Add `ref(true)` state for both panels.
- Add small icon-only `BaseButton` toggles near canvas edges.
- Bind `:is-open="isLeftPanelOpen"` and `:is-open="isRightPanelOpen"`.
- Keep editor store selection untouched when panels close.

- [ ] **Step 3: Style collapsed affordances**

In `pages.css`:
- Add compact edge buttons.
- Keep canvas centered when one or both panels are collapsed.
- Use existing token variables only.

- [ ] **Step 4: Verify**

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PagePanels.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add client-vue/src/features/web-pages/components/PageEditor.vue client-vue/src/features/web-pages/pages.css client-vue/src/features/web-pages/components/__tests__/PagePanels.contract.test.ts
git commit -m "feat: add collapsible panels to pages editor"
```

### Task 4: Rich Element Tree Panel

**Files:**
- Modify: `client-vue/src/features/web-pages/components/BlockTreePanel.vue`
- Modify: `client-vue/src/features/web-pages/utils/blockTree.ts`
- Modify: `client-vue/src/features/web-pages/stores/page-editor.store.ts`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Create: `client-vue/src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts`

- [ ] **Step 1: Write failing tree contract**

Create tests asserting:
- Tree rows show tag icon/label, human name, and child count.
- Container rows can expand/collapse.
- Tree exposes drag handles.
- Tree supports row actions slot or menu trigger.
- Tree has depth guides and selected state classes.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts
```

Expected: fail because current tree is minimal.

- [ ] **Step 2: Add tree state**

In `page-editor.store.ts`:
- Add `collapsedBlockIds: Set<string>` or serializable object map.
- Add `toggleBlockCollapsed(blockId)`.
- Add `isBlockCollapsed(blockId)`.

In `blockTree.ts`:
- Add helper `blockDisplayName(block)`.
- Add helper `blockChildCount(block)`.

- [ ] **Step 3: Implement richer tree UI**

In `BlockTreePanel.vue`:
- Use semantic tree rows with:
  - collapse chevron for containers.
  - tag icon via `LucideIcon`.
  - tag pill or muted tag text.
  - display name.
  - child count.
  - drag handle.
  - row action dropdown trigger placeholder.
- Render children only when not collapsed.
- Keep left panel strictly tree-only.

- [ ] **Step 4: Verify**

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts src/features/web-pages/components/__tests__/PageEditor.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add client-vue/src/features/web-pages/components/BlockTreePanel.vue client-vue/src/features/web-pages/utils/blockTree.ts client-vue/src/features/web-pages/stores/page-editor.store.ts client-vue/src/features/web-pages/pages.css client-vue/src/features/web-pages/components/__tests__/BlockTreePanel.contract.test.ts
git commit -m "feat: improve sailor pages element tree"
```

### Task 5: Editor Dropdown Actions Menu

**Files:**
- Create: `client-vue/src/features/web-pages/components/PageEditorActionsMenu.vue`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Modify: `client-vue/src/features/web-pages/components/__tests__/PagePanels.contract.test.ts`

- [ ] **Step 1: Extend failing menu contract**

Update `PagePanels.contract.test.ts` to assert:
- `PageEditorActionsMenu.vue` imports `AppDropdownMenu`, `AppDropdownItem`, and `AppDropdownDivider`.
- Menu exposes actions for switch page/site, duplicate page, rename page, and delete page.
- `PageEditor.vue` renders the menu in the top actions area.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PagePanels.contract.test.ts
```

Expected: fail because actions menu does not exist.

- [ ] **Step 2: Implement dropdown component**

Create `PageEditorActionsMenu.vue`:
- Trigger is an icon-only button.
- Items:
  - `Switch page`
  - divider
  - `Rename page`
  - `Duplicate page`
  - divider
  - `Delete page` as danger
- Emit events only; no API calls inside component.

- [ ] **Step 3: Wire events in editor**

In `PageEditor.vue`:
- `Switch page` opens page switcher modal in Task 6.
- `Rename page` selects page metadata.
- `Duplicate page` can be disabled until Task 8 if not implemented yet, but item must be present and explicitly disabled.
- `Delete page` can use existing store delete flow if available; otherwise disabled until Task 8.

- [ ] **Step 4: Verify**

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PagePanels.contract.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add client-vue/src/features/web-pages/components/PageEditorActionsMenu.vue client-vue/src/features/web-pages/components/PageEditor.vue client-vue/src/features/web-pages/pages.css client-vue/src/features/web-pages/components/__tests__/PagePanels.contract.test.ts
git commit -m "feat: add pages editor actions dropdown"
```

### Task 6: Page Switcher Modal with Previews

**Files:**
- Create: `client-vue/src/features/web-pages/components/PageSwitcherModal.vue`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/stores/pages.store.ts`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Create: `client-vue/src/features/web-pages/components/__tests__/PageSwitcher.contract.test.ts`

- [ ] **Step 1: Write failing switcher contract**

Create tests asserting:
- `PageSwitcherModal.vue` imports `BaseModal`.
- Modal renders page cards from `pagesStore.pages`.
- Each option shows page name and a preview area.
- Selecting a card emits the page id.
- `PageEditor.vue` opens the modal from dropdown action.
- `pages.store.ts` exposes `switchPage(pageId)`.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PageSwitcher.contract.test.ts
```

Expected: fail because switcher does not exist.

- [ ] **Step 2: Implement store switch helper**

In `pages.store.ts`:
- Add `switchPage(pageId)` that calls `openPage(pageId)`.
- If current page is dirty, keep behavior conservative: do not auto-save. Return a rejected error or set `error` with message `Save current page before switching.`.
- Task 8 can improve this with confirm flow.

- [ ] **Step 3: Implement modal**

In `PageSwitcherModal.vue`:
- Use `BaseModal`.
- Header: `Switch page`.
- Cards show:
  - page title.
  - slug.
  - miniature preview placeholder generated from summary only.
  - active page marker.
- Emit `select(pageId)`.
- Close on `close`.

- [ ] **Step 4: Wire modal**

In `PageEditor.vue`:
- Load list if empty when opening switcher.
- Call `pagesStore.switchPage(pageId)`.
- After success, update editor blocks through existing active page watcher.

- [ ] **Step 5: Verify**

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PageSwitcher.contract.test.ts src/features/web-pages/stores/__tests__/pages.store.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add client-vue/src/features/web-pages/components/PageSwitcherModal.vue client-vue/src/features/web-pages/components/PageEditor.vue client-vue/src/features/web-pages/stores/pages.store.ts client-vue/src/features/web-pages/pages.css client-vue/src/features/web-pages/components/__tests__/PageSwitcher.contract.test.ts client-vue/src/features/web-pages/stores/__tests__/pages.store.test.ts
git commit -m "feat: add pages switcher modal"
```

### Task 7: Canva-Like Add Page Below Canvas

**Files:**
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/stores/pages.store.ts`
- Modify: `client-vue/src/features/web-pages/pages.css`
- Modify: `client-vue/src/features/web-pages/components/__tests__/PageSwitcher.contract.test.ts`

- [ ] **Step 1: Extend failing add-page contract**

Update `PageSwitcher.contract.test.ts` to assert:
- `PageEditor.vue` renders an add-page button below the canvas page.
- Button calls `pagesStore.createPage`.
- New page starts empty and switches active page after creation.
- Button does not insert a block into the current page.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PageSwitcher.contract.test.ts
```

Expected: fail because add-page below canvas does not exist.

- [ ] **Step 2: Add store helper**

In `pages.store.ts`, add:

```ts
async function createPageAfterActive() {
  const baseTitle = activePage.value ? `${activePage.value.title} copy` : 'Untitled page'
  const page = await createPage({ title: baseTitle, blocks: [] })
  setSavedPage(page)
  return page
}
```

Use a better title if product copy prefers `Page 2`, `Page 3`, etc.

- [ ] **Step 3: Add canvas button**

In `PageEditor.vue`:
- Render a full-width add-page button below `PageCanvas`.
- Use `BaseButton`.
- On click:
  - If current page is dirty, save first through `savePage()`.
  - Create page.
  - Select page metadata.

- [ ] **Step 4: Style like canvas page control**

In `pages.css`:
- Button sits below white page body.
- It reads as a page-level control, not a block control.
- It remains visible when side panels collapse.

- [ ] **Step 5: Verify**

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PageSwitcher.contract.test.ts src/features/web-pages/stores/__tests__/pages.store.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add client-vue/src/features/web-pages/components/PageEditor.vue client-vue/src/features/web-pages/stores/pages.store.ts client-vue/src/features/web-pages/pages.css client-vue/src/features/web-pages/components/__tests__/PageSwitcher.contract.test.ts client-vue/src/features/web-pages/stores/__tests__/pages.store.test.ts
git commit -m "feat: add canva-style page creation in canvas"
```

### Task 8: Page Metadata Editing and Safer Page Actions

**Files:**
- Modify: `client-vue/src/features/web-pages/components/PageMetadataPanel.vue`
- Modify: `client-vue/src/features/web-pages/components/PageEditorActionsMenu.vue`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify: `client-vue/src/features/web-pages/stores/pages.store.ts`
- Modify: `client-vue/src/features/web-pages/components/__tests__/PageSelection.contract.test.ts`
- Modify: `client-vue/src/features/web-pages/components/__tests__/PagePanels.contract.test.ts`

- [ ] **Step 1: Extend metadata/action contracts**

Update tests asserting:
- `PageMetadataPanel.vue` uses `BaseInput` for title and slug.
- Metadata patches update `pagesStore.activePage`.
- Rename action selects page metadata.
- Duplicate page action creates a new page with copied blocks/body styles.
- Delete page action deletes active page and opens another available page or returns to list state.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PageSelection.contract.test.ts src/features/web-pages/components/__tests__/PagePanels.contract.test.ts
```

Expected: fail until metadata/actions are wired.

- [ ] **Step 2: Implement metadata panel**

In `PageMetadataPanel.vue`:
- Props: `page`.
- Emits: `patch`.
- Fields:
  - title.
  - slug.
- No API calls in component.

- [ ] **Step 3: Implement duplicate/delete helpers**

In `pages.store.ts`:
- `duplicateActivePage()` creates a page with copied `blocks` and `bodyStyles`.
- `deleteActivePageAndChooseNext()` deletes active page, then opens the next summary if available.

- [ ] **Step 4: Wire editor menu**

In `PageEditor.vue`:
- Rename selects page target.
- Duplicate calls store helper, selects page target.
- Delete uses existing confirmation pattern if an app confirm panel is already available in this feature; otherwise use a minimal guarded action and add confirm in a later pass.

- [ ] **Step 5: Verify**

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PageSelection.contract.test.ts src/features/web-pages/components/__tests__/PagePanels.contract.test.ts src/features/web-pages/stores/__tests__/pages.store.test.ts
npm run type-check
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add client-vue/src/features/web-pages/components/PageMetadataPanel.vue client-vue/src/features/web-pages/components/PageEditorActionsMenu.vue client-vue/src/features/web-pages/components/PageEditor.vue client-vue/src/features/web-pages/stores/pages.store.ts client-vue/src/features/web-pages/components/__tests__/PageSelection.contract.test.ts client-vue/src/features/web-pages/components/__tests__/PagePanels.contract.test.ts client-vue/src/features/web-pages/stores/__tests__/pages.store.test.ts
git commit -m "feat: add page metadata and page actions"
```

### Task 9: Full Verification and Important Manual Smoke

**Files:**
- Modify only files required by failed checks.

- [ ] **Step 1: Run frontend Pages contracts**

```bash
cd client-vue
node --test src/core/api/pages.api.contract.test.ts src/features/web-pages/**/*.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run backend Pages tests**

```bash
cd server
node --test src/core/modules/pages/*.test.ts src/core/routes/pages*.test.ts
```

Expected: all pass.

- [ ] **Step 3: Run type check**

```bash
cd client-vue
npm run type-check
```

Expected: pass.

- [ ] **Step 4: Run build**

```bash
cd client-vue
npm run build-only
```

Expected: pass. Existing chunk-size warnings are acceptable if exit code is 0.

- [ ] **Step 5: Manual smoke important flows**

Start local app if needed:

```bash
cd server
npm run dev
cd ../client-vue
npm run dev
```

Smoke:
- Open a page editor.
- Click body and confirm body inspector appears.
- Click page handle and confirm metadata inspector appears.
- Click block and confirm block inspector appears.
- Drag a new block over canvas and confirm prediction indicator appears.
- Drag an existing block before/after/inside another block and confirm prediction indicator appears.
- Collapse/open left panel.
- Collapse/open right panel.
- Open dropdown and page switcher modal.
- Create a page below the canvas and confirm active page switches.
- Save and preview.

- [ ] **Step 6: Commit stabilization**

```bash
git add <only files changed by fixes>
git commit -m "fix: stabilize sailor pages canva editor ux"
```

---

## Completion Checklist

- [ ] Body inspector appears only after body click.
- [ ] Page metadata inspector appears after page selection.
- [ ] Block inspector appears after block selection.
- [ ] Drag prediction is visible for new blocks and existing blocks.
- [ ] Drop before/after/inside still works.
- [ ] Left panel can collapse and remains tree-only.
- [ ] Right panel can collapse and contains blocks plus inspector.
- [ ] Tree has collapse/expand, labels, icons, child counts, drag handles, and row affordances.
- [ ] Dropdown actions use the existing dropdown components.
- [ ] Switcher uses `BaseModal`.
- [ ] Switcher shows page preview cards and names.
- [ ] Add-page button appears below canvas and creates a new empty page.
- [ ] Metadata/body/block changes save through existing Pages API.
- [ ] Focused tests pass.
- [ ] Type-check passes.
- [ ] Build passes.

## Scope Not Included

- True site entity/table separate from pages.
- Nested public routing between pages.
- Browser E2E for every drag edge case.
- Real screenshot thumbnail generation.
- Advanced SEO fields beyond title/slug unless added during metadata task.
- Collaborative editing.

