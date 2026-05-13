# ND8 Google-Style Workflow Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, Google Docs/Sheets-inspired workflow editor dock for ND8 with real File/Edit/View/Select/Go/Run/Help menus, a second-row action toolbar, and ND8-specific visual identity.

**Architecture:** Replace the current single-row `WorkflowEditorDock.vue` with a focused editor chrome made of small components: a document header row, a menu bar, a contextual action toolbar, and reusable menu/action definitions. Keep workflow behavior in `WorkflowEditorPage.vue` and stores; keep the dock mostly presentational and event-driven. Add dedicated CSS variables for this dock so it does not leak styling into existing app surfaces.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, existing ND8 base components, Lucide icons, CSS custom properties, current command-palette/ui intent patterns, `vue-tsc`, Vite.

---

## Product Direction

The new dock should feel familiar like Google Docs/Sheets, but it must be recognizably ND8:

- Google-inspired: document title at top-left, menu row, compact tool row, grouped controls, visible save/autosave state, right-side collaboration/status-style actions.
- ND8-specific: workflow/run semantics, variables, execution logs, canvas zoom, node editing, publish state, active/draft workflow state, command palette integration.
- Not n8n/Zapier/Make: avoid sidebar-heavy automation-builder chrome; this should feel like a precise workflow document editor.
- No fake menus: every visible menu item must either trigger a real existing action, be disabled with a clear label, or be omitted from the first release.
- Use actual commands where possible: save, export, create, import, undo, redo, open variables, settings, logs, run, stop, zoom, fit view, add node, publish controls.

---

## File Structure

### Create

- `client-vue/src/features/workflow-editor/components/ui/chrome/WorkflowEditorChrome.vue`
  - Top-level replacement for `WorkflowEditorDock.vue`.
  - Owns layout composition only.
  - Emits the same workflow actions plus any new menu action events.

- `client-vue/src/features/workflow-editor/components/ui/chrome/WorkflowChromeHeader.vue`
  - First row: app/file icon, workflow name dropdown, optional star/favorite action as a disabled first-pass command, save/cloud status, primary right-side actions.

- `client-vue/src/features/workflow-editor/components/ui/chrome/WorkflowChromeMenuBar.vue`
  - Menu row: File, Edit, View, Select, Go, Run, Help.
  - Uses menu model data and emits command ids.

- `client-vue/src/features/workflow-editor/components/ui/chrome/WorkflowChromeToolbar.vue`
  - Second row: search/menu trigger, undo/redo, zoom, add node, variables, settings, logs, run/stop, save/autosave, publish.

- `client-vue/src/features/workflow-editor/components/ui/chrome/workflowChromeActions.ts`
  - Central typed command/menu definitions.
  - Keeps labels, icons, disabled logic keys, and event ids out of template markup.

- `client-vue/src/features/workflow-editor/components/ui/chrome/workflowChrome.types.ts`
  - Shared prop/action types for chrome components.

- `client-vue/src/features/workflow-editor/styles/workflow-editor-chrome.css`
  - Dedicated ND8 chrome tokens and component classes.
  - No generic `.button`, `.menu`, or global utility overrides.

- `client-vue/src/features/workflow-editor/components/ui/chrome/__tests__/workflowChromeActions.test.ts`
  - Node test for menu/action definitions.

### Modify

- `client-vue/src/app/pages/WorkflowEditorPage.vue`
  - Swap `WorkflowEditorDock` for `WorkflowEditorChrome`.
  - Wire emitted events to existing handlers and stores.

- `client-vue/src/assets/styles/main.css`
  - Import `workflow-editor-chrome.css` after `editor-dock.css` during transition.

- `client-vue/src/features/workflow-editor/components/ui/WorkflowEditorDock.vue`
  - Keep during transition for rollback.
  - Remove only after the new chrome is stable and explicitly approved.

- `client-vue/src/features/workflow-editor/components/Nod8WorkflowCanvas.vue`
  - Expose any canvas commands needed by the chrome that are not currently available via `canvasRef`, such as fit view or zoom commands, only if required.

---

## Menu Model

Initial menus must map to real workflow-editor actions:

### File

- New Workflow: existing create workflow behavior from current dropdown.
- Open Workflow: open workflow dropdown/search.
- Import JSON: existing import flow.
- Export JSON: existing export flow.
- Save: existing `save`.
- Close Editor: existing close flow.

### Edit

- Undo: existing `workflowStore.undo()`.
- Redo: existing `workflowStore.redo()`.
- Duplicate Selection: disabled in first pass unless canvas selection duplicate is implemented.
- Delete Selection: disabled in first pass unless canvas selection delete is safely exposed.

### View

- Zoom Out: existing Vue Flow zoom command if exposed.
- Zoom In: existing Vue Flow zoom command if exposed.
- Reset Zoom: existing Vue Flow zoom-to-100 command if exposed.
- Fit View: existing Vue Flow fit view if exposed.
- Logs: existing logs panel toggle.

### Select

- Select All Nodes: disabled in first pass unless Vue Flow selection API is safely exposed.
- Clear Selection: disabled in first pass unless Vue Flow selection API is safely exposed.

### Go

- Add Node: existing `canvasRef?.openAddNodePanel()`.
- Variables: existing variables modal.
- Workflow Settings: existing settings modal.
- Command Palette: dispatch existing command palette open shortcut behavior only if a programmatic entrypoint exists.

### Run

- Run Workflow: existing `canvasRef?.handleRun()`.
- Stop Run: existing `canvasRef?.handleStop()`.
- Publish/Unpublish: existing `WorkflowPublishButton`.

### Help

- Keyboard Shortcuts: disabled in first pass unless existing UI exists.
- ND8 Docs: disabled in first pass unless product docs route exists.
- About Workflow Editor: disabled in first pass unless existing about/help panel exists.

---

## Visual System

Create a dedicated token block in `workflow-editor-chrome.css`:

```css
:root {
  --nd8-chrome-height-header: 38px;
  --nd8-chrome-height-toolbar: 38px;
  --nd8-chrome-bg: color-mix(in srgb, var(--nod8-bg-surface) 94%, white 6%);
  --nd8-chrome-bg-muted: color-mix(in srgb, var(--nod8-bg-surface) 88%, white 12%);
  --nd8-chrome-border: var(--nod8-border);
  --nd8-chrome-text: var(--nod8-text-primary);
  --nd8-chrome-text-muted: var(--nod8-text-muted);
  --nd8-chrome-accent: var(--nod8-accent);
  --nd8-chrome-radius: 8px;
  --nd8-chrome-control-h: 28px;
  --nd8-chrome-icon: 15px;
  --nd8-chrome-gap: 6px;
}
```

Rules:

- Use ND8 prefixes: `.wec-*` classes and `--nd8-chrome-*` variables.
- Keep row heights stable.
- Buttons must be icon-first, compact, and grouped with separators.
- Text cannot wrap inside toolbar controls.
- The workflow name must truncate cleanly.
- The second row must scroll horizontally only as a last resort on narrow widths.
- Avoid purple-only or blue-only palette. Use neutral surface, cyan/green run accents, amber dirty/save accents, and subtle ND8 accent highlights.

---

## Tasks

### Task 1: Create Typed Chrome Action Model

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/ui/chrome/workflowChrome.types.ts`
- Create: `client-vue/src/features/workflow-editor/components/ui/chrome/workflowChromeActions.ts`
- Create: `client-vue/src/features/workflow-editor/components/ui/chrome/__tests__/workflowChromeActions.test.ts`

- [ ] **Step 1: Write the failing action model test**

Create `workflowChromeActions.test.ts`:

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { workflowChromeMenus, workflowChromeToolbarGroups } from '../workflowChromeActions.ts'

describe('workflow chrome actions', () => {
  it('defines only supported top-level menus in the intended order', () => {
    assert.deepEqual(
      workflowChromeMenus.map((menu) => menu.id),
      ['file', 'edit', 'view', 'select', 'go', 'run', 'help'],
    )
  })

  it('does not expose empty menus', () => {
    assert.equal(workflowChromeMenus.every((menu) => menu.items.length > 0), true)
  })

  it('defines the primary toolbar groups in workflow editing order', () => {
    assert.deepEqual(
      workflowChromeToolbarGroups.map((group) => group.id),
      ['history', 'canvas', 'insert', 'workflow', 'execution', 'save'],
    )
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd client-vue
node --experimental-strip-types --test src/features/workflow-editor/components/ui/chrome/__tests__/workflowChromeActions.test.ts
```

Expected: FAIL because `workflowChromeActions.ts` does not exist.

- [ ] **Step 3: Add the shared types**

Create `workflowChrome.types.ts`:

```ts
export type WorkflowChromeCommandId =
  | 'file.new'
  | 'file.open'
  | 'file.import'
  | 'file.export'
  | 'file.save'
  | 'file.close'
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.duplicate-selection'
  | 'edit.delete-selection'
  | 'view.zoom-out'
  | 'view.zoom-in'
  | 'view.zoom-reset'
  | 'view.fit'
  | 'view.logs'
  | 'select.all'
  | 'select.clear'
  | 'go.add-node'
  | 'go.variables'
  | 'go.settings'
  | 'go.command-palette'
  | 'run.workflow'
  | 'run.stop'
  | 'run.publish'
  | 'help.shortcuts'
  | 'help.docs'
  | 'help.about'

export interface WorkflowChromeMenuItem {
  id: WorkflowChromeCommandId
  label: string
  icon?: string
  disabledReason?: string
}

export interface WorkflowChromeMenu {
  id: 'file' | 'edit' | 'view' | 'select' | 'go' | 'run' | 'help'
  label: string
  items: WorkflowChromeMenuItem[]
}

export interface WorkflowChromeToolbarAction {
  id: WorkflowChromeCommandId
  label: string
  icon: string
  kind?: 'button' | 'primary' | 'danger' | 'toggle'
}

export interface WorkflowChromeToolbarGroup {
  id: 'history' | 'canvas' | 'insert' | 'workflow' | 'execution' | 'save'
  actions: WorkflowChromeToolbarAction[]
}
```

- [ ] **Step 4: Add the action definitions**

Create `workflowChromeActions.ts`:

```ts
import type { WorkflowChromeMenu, WorkflowChromeToolbarGroup } from './workflowChrome.types'

export const workflowChromeMenus: WorkflowChromeMenu[] = [
  {
    id: 'file',
    label: 'File',
    items: [
      { id: 'file.new', label: 'New Workflow', icon: 'plus-circle' },
      { id: 'file.open', label: 'Open Workflow', icon: 'folder-open' },
      { id: 'file.import', label: 'Import JSON', icon: 'cloud-upload' },
      { id: 'file.export', label: 'Export JSON', icon: 'download' },
      { id: 'file.save', label: 'Save', icon: 'save' },
      { id: 'file.close', label: 'Close Editor', icon: 'x' },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'edit.undo', label: 'Undo', icon: 'undo-2' },
      { id: 'edit.redo', label: 'Redo', icon: 'redo-2' },
      { id: 'edit.duplicate-selection', label: 'Duplicate Selection', icon: 'copy', disabledReason: 'Selection duplication is not wired yet' },
      { id: 'edit.delete-selection', label: 'Delete Selection', icon: 'trash-2', disabledReason: 'Selection deletion is not wired yet' },
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      { id: 'view.zoom-out', label: 'Zoom Out', icon: 'zoom-out' },
      { id: 'view.zoom-in', label: 'Zoom In', icon: 'zoom-in' },
      { id: 'view.zoom-reset', label: 'Reset Zoom', icon: 'scan' },
      { id: 'view.fit', label: 'Fit View', icon: 'maximize' },
      { id: 'view.logs', label: 'Logs', icon: 'scroll-text' },
    ],
  },
  {
    id: 'select',
    label: 'Select',
    items: [
      { id: 'select.all', label: 'Select All Nodes', icon: 'mouse-pointer-square-dashed', disabledReason: 'Select all is not wired yet' },
      { id: 'select.clear', label: 'Clear Selection', icon: 'eraser', disabledReason: 'Clear selection is not wired yet' },
    ],
  },
  {
    id: 'go',
    label: 'Go',
    items: [
      { id: 'go.add-node', label: 'Add Node', icon: 'plus' },
      { id: 'go.variables', label: 'Variables', icon: 'tags' },
      { id: 'go.settings', label: 'Workflow Settings', icon: 'settings' },
      { id: 'go.command-palette', label: 'Command Palette', icon: 'command', disabledReason: 'Programmatic palette opening needs a shared entrypoint' },
    ],
  },
  {
    id: 'run',
    label: 'Run',
    items: [
      { id: 'run.workflow', label: 'Run Workflow', icon: 'play' },
      { id: 'run.stop', label: 'Stop Run', icon: 'square' },
      { id: 'run.publish', label: 'Publish Controls', icon: 'radio' },
    ],
  },
  {
    id: 'help',
    label: 'Help',
    items: [
      { id: 'help.shortcuts', label: 'Keyboard Shortcuts', icon: 'keyboard', disabledReason: 'Shortcuts panel is not built yet' },
      { id: 'help.docs', label: 'ND8 Docs', icon: 'book-open', disabledReason: 'Docs route is not available yet' },
      { id: 'help.about', label: 'About Workflow Editor', icon: 'info', disabledReason: 'About panel is not available yet' },
    ],
  },
]

export const workflowChromeToolbarGroups: WorkflowChromeToolbarGroup[] = [
  {
    id: 'history',
    actions: [
      { id: 'edit.undo', label: 'Undo', icon: 'undo-2' },
      { id: 'edit.redo', label: 'Redo', icon: 'redo-2' },
    ],
  },
  {
    id: 'canvas',
    actions: [
      { id: 'view.zoom-out', label: 'Zoom out', icon: 'zoom-out' },
      { id: 'view.zoom-reset', label: 'Reset zoom', icon: 'scan' },
      { id: 'view.zoom-in', label: 'Zoom in', icon: 'zoom-in' },
      { id: 'view.fit', label: 'Fit view', icon: 'maximize' },
    ],
  },
  {
    id: 'insert',
    actions: [{ id: 'go.add-node', label: 'Add node', icon: 'plus', kind: 'button' }],
  },
  {
    id: 'workflow',
    actions: [
      { id: 'go.variables', label: 'Variables', icon: 'tags' },
      { id: 'go.settings', label: 'Settings', icon: 'settings' },
      { id: 'view.logs', label: 'Logs', icon: 'scroll-text' },
    ],
  },
  {
    id: 'execution',
    actions: [
      { id: 'run.workflow', label: 'Run', icon: 'play', kind: 'primary' },
      { id: 'run.stop', label: 'Stop', icon: 'square', kind: 'danger' },
    ],
  },
  {
    id: 'save',
    actions: [{ id: 'file.save', label: 'Save', icon: 'save' }],
  },
]
```

- [ ] **Step 5: Run the test and verify GREEN**

Run:

```bash
cd client-vue
node --experimental-strip-types --test src/features/workflow-editor/components/ui/chrome/__tests__/workflowChromeActions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/ui/chrome
git commit -m "feat: define workflow editor chrome actions"
```

### Task 2: Add Dedicated Chrome CSS Tokens

**Files:**
- Create: `client-vue/src/features/workflow-editor/styles/workflow-editor-chrome.css`
- Modify: `client-vue/src/assets/styles/main.css`

- [ ] **Step 1: Create the CSS file**

Add `workflow-editor-chrome.css` with:

```css
:root {
  --nd8-chrome-height-header: 38px;
  --nd8-chrome-height-toolbar: 38px;
  --nd8-chrome-bg: color-mix(in srgb, var(--nod8-bg-surface) 94%, white 6%);
  --nd8-chrome-bg-muted: color-mix(in srgb, var(--nod8-bg-surface) 88%, white 12%);
  --nd8-chrome-bg-hover: color-mix(in srgb, var(--nod8-bg-elevated) 86%, white 14%);
  --nd8-chrome-border: var(--nod8-border);
  --nd8-chrome-text: var(--nod8-text-primary);
  --nd8-chrome-text-muted: var(--nod8-text-muted);
  --nd8-chrome-accent: var(--nod8-accent);
  --nd8-chrome-run: var(--nod8-green-500);
  --nd8-chrome-danger: var(--nod8-red-500);
  --nd8-chrome-save: var(--nod8-amber-500);
  --nd8-chrome-radius: 8px;
  --nd8-chrome-control-h: 28px;
  --nd8-chrome-icon: 15px;
  --nd8-chrome-gap: 6px;
}

.wec-shell {
  display: grid;
  grid-template-rows: var(--nd8-chrome-height-header) var(--nd8-chrome-height-toolbar);
  min-width: 0;
  background: var(--nd8-chrome-bg);
  border-bottom: 1px solid var(--nd8-chrome-border);
}

.wec-row {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 12px;
}

.wec-header {
  justify-content: space-between;
}

.wec-toolbar {
  gap: var(--nd8-chrome-gap);
  background: var(--nd8-chrome-bg-muted);
  overflow-x: auto;
  scrollbar-width: none;
}

.wec-toolbar::-webkit-scrollbar {
  display: none;
}

.wec-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
}

.wec-divider {
  width: 1px;
  height: 18px;
  flex: 0 0 auto;
  background: var(--nd8-chrome-border);
  margin: 0 4px;
}

.wec-control {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: var(--nd8-chrome-control-h);
  min-width: var(--nd8-chrome-control-h);
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: var(--nd8-chrome-radius);
  color: var(--nd8-chrome-text-muted);
  font-size: var(--nod8-text-xs);
  line-height: 1;
  white-space: nowrap;
}

.wec-control:hover:not(:disabled),
.wec-control--active {
  background: var(--nd8-chrome-bg-hover);
  color: var(--nd8-chrome-text);
}

.wec-control:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.wec-control--primary {
  color: var(--nd8-chrome-run);
}

.wec-control--danger {
  color: var(--nd8-chrome-danger);
}
```

- [ ] **Step 2: Import it**

In `client-vue/src/assets/styles/main.css`, add this import after `editor-dock.css`:

```css
@import '../../features/workflow-editor/styles/workflow-editor-chrome.css';
```

- [ ] **Step 3: Run build verification**

Run:

```bash
cd client-vue
npm run type-check
npm run build-only
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/workflow-editor/styles/workflow-editor-chrome.css client-vue/src/assets/styles/main.css
git commit -m "style: add workflow editor chrome tokens"
```

### Task 3: Build Header and Menu Bar Components

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/ui/chrome/WorkflowChromeHeader.vue`
- Create: `client-vue/src/features/workflow-editor/components/ui/chrome/WorkflowChromeMenuBar.vue`

- [ ] **Step 1: Create `WorkflowChromeHeader.vue`**

Use props for workflow identity and status. Emit `open-workflows`, `command`, and `workflow-updated` where needed.

```vue
<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import WorkflowPublishButton from '../WorkflowPublishButton.vue'
import type { WorkflowItem } from '@/core/types/workflow.types'

const props = defineProps<{
  workflowName: string
  workflowId: string
  workflow?: WorkflowItem
  autosaveStatus?: 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
  lastAutosavedAt?: number | null
  isDirty?: boolean
  isAutosaveEnabled?: boolean
  isBusy?: boolean
  isSaving?: boolean
  isUnsavedDraft?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-workflows'): void
  (e: 'toggle-autosave', enabled: boolean): void
  (e: 'workflow-updated', workflow: WorkflowItem): void
}>()

const statusLabel = computed(() => {
  if (props.autosaveStatus === 'saving') return 'Autosaving'
  if (props.autosaveStatus === 'saved') return 'Saved'
  if (props.autosaveStatus === 'conflict') return 'Save conflict'
  if (props.isDirty) return 'Unsaved changes'
  return props.workflowId ? props.workflowId.slice(0, 14) : 'New Workflow'
})
</script>

<template>
  <div class="wec-row wec-header">
    <div class="wec-doc">
      <div class="wec-doc__icon">
        <LucideIcon name="workflow" :size="18" />
      </div>
      <button class="wec-doc__name" type="button" @click="emit('open-workflows')">
        <span>{{ workflowName }}</span>
        <LucideIcon name="chevron-down" :size="13" />
      </button>
      <span class="wec-doc__status">{{ statusLabel }}</span>
    </div>

    <div class="wec-header-actions">
      <BaseSwitch
        class="wec-autosave"
        :model-value="!!isAutosaveEnabled"
        :disabled="isBusy || isSaving"
        title="Toggle autosave for this workflow"
        @update:model-value="emit('toggle-autosave', $event)"
      >
        Autosave
      </BaseSwitch>

      <WorkflowPublishButton
        v-if="workflow"
        :workflow="workflow"
        :disabled="isUnsavedDraft"
        @updated="emit('workflow-updated', $event)"
      />
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create `WorkflowChromeMenuBar.vue`**

```vue
<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseMiniMenu from '@/shared/components/base/BaseMiniMenu.vue'
import { workflowChromeMenus } from './workflowChromeActions'
import type { WorkflowChromeCommandId } from './workflowChrome.types'

const emit = defineEmits<{
  (e: 'command', id: WorkflowChromeCommandId): void
}>()
</script>

<template>
  <nav class="wec-menu-bar" aria-label="Workflow editor menu">
    <BaseMiniMenu
      v-for="menu in workflowChromeMenus"
      :key="menu.id"
      position="bottom-start"
    >
      <template #trigger>
        <button class="wec-menu-trigger" type="button">{{ menu.label }}</button>
      </template>

      <button
        v-for="item in menu.items"
        :key="item.id"
        type="button"
        class="wec-menu-item"
        :disabled="!!item.disabledReason"
        :title="item.disabledReason"
        @click="emit('command', item.id)"
      >
        <LucideIcon v-if="item.icon" :name="item.icon" :size="14" />
        <span>{{ item.label }}</span>
      </button>
    </BaseMiniMenu>
  </nav>
</template>
```

- [ ] **Step 3: Add CSS for header/menu**

Append to `workflow-editor-chrome.css`:

```css
.wec-doc,
.wec-header-actions,
.wec-menu-bar,
.wec-menu-item {
  display: flex;
  align-items: center;
}

.wec-doc {
  min-width: 0;
  gap: 8px;
}

.wec-doc__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  color: var(--nd8-chrome-accent);
  background: color-mix(in srgb, var(--nd8-chrome-accent) 12%, transparent);
}

.wec-doc__name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 280px;
  color: var(--nd8-chrome-text);
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-semibold);
}

.wec-doc__name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wec-doc__status {
  color: var(--nd8-chrome-text-muted);
  font-family: var(--nod8-font-mono);
  font-size: 11px;
}

.wec-header-actions {
  gap: 8px;
  flex: 0 0 auto;
}

.wec-menu-bar {
  gap: 2px;
  height: 100%;
}

.wec-menu-trigger {
  height: 26px;
  padding: 0 8px;
  border-radius: 7px;
  color: var(--nd8-chrome-text);
  font-size: var(--nod8-text-xs);
}

.wec-menu-trigger:hover {
  background: var(--nd8-chrome-bg-hover);
}

.wec-menu-item {
  width: 100%;
  gap: 8px;
  padding: 8px 10px;
  color: var(--nd8-chrome-text);
  font-size: var(--nod8-text-xs);
  text-align: left;
}
```

- [ ] **Step 4: Run verification**

Run:

```bash
cd client-vue
npm run type-check
npm run build-only
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/ui/chrome client-vue/src/features/workflow-editor/styles/workflow-editor-chrome.css
git commit -m "feat: add workflow editor chrome header menus"
```

### Task 4: Build Toolbar Component

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/ui/chrome/WorkflowChromeToolbar.vue`
- Modify: `client-vue/src/features/workflow-editor/styles/workflow-editor-chrome.css`

- [ ] **Step 1: Create `WorkflowChromeToolbar.vue`**

```vue
<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { workflowChromeToolbarGroups } from './workflowChromeActions'
import type { WorkflowChromeCommandId } from './workflowChrome.types'

const props = defineProps<{
  canUndo?: boolean
  canRedo?: boolean
  isExecuting?: boolean
  isStreaming?: boolean
  isSaving?: boolean
  isDirty?: boolean
  isLogsOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'command', id: WorkflowChromeCommandId): void
}>()

function isDisabled(id: WorkflowChromeCommandId) {
  if (id === 'edit.undo') return !props.canUndo || props.isExecuting || props.isStreaming
  if (id === 'edit.redo') return !props.canRedo || props.isExecuting || props.isStreaming
  if (id === 'run.workflow') return props.isExecuting === true
  if (id === 'run.stop') return props.isStreaming !== true
  if (id === 'file.save') return props.isSaving || !props.isDirty || props.isExecuting || props.isStreaming
  return false
}

function isVisible(id: WorkflowChromeCommandId) {
  if (id === 'run.workflow') return !props.isStreaming
  if (id === 'run.stop') return props.isStreaming
  return true
}

function isActive(id: WorkflowChromeCommandId) {
  return id === 'view.logs' && props.isLogsOpen
}
</script>

<template>
  <div class="wec-row wec-toolbar">
    <template v-for="(group, groupIndex) in workflowChromeToolbarGroups" :key="group.id">
      <div v-if="groupIndex > 0" class="wec-divider" />
      <div class="wec-group">
        <button
          v-for="action in group.actions.filter((item) => isVisible(item.id))"
          :key="action.id"
          type="button"
          class="wec-control"
          :class="{
            'wec-control--primary': action.kind === 'primary',
            'wec-control--danger': action.kind === 'danger',
            'wec-control--active': isActive(action.id),
          }"
          :disabled="isDisabled(action.id)"
          :title="action.label"
          @click="emit('command', action.id)"
        >
          <LucideIcon :name="action.icon" :size="15" />
          <span v-if="action.kind === 'primary' || action.id === 'go.add-node' || action.id === 'file.save'">
            {{ action.label }}
          </span>
        </button>
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 2: Add toolbar refinements**

Append to `workflow-editor-chrome.css`:

```css
.wec-control svg {
  width: var(--nd8-chrome-icon);
  height: var(--nd8-chrome-icon);
  flex: 0 0 auto;
}

.wec-control--primary {
  background: color-mix(in srgb, var(--nd8-chrome-run) 12%, transparent);
}

.wec-control--danger {
  background: color-mix(in srgb, var(--nd8-chrome-danger) 10%, transparent);
}

.wec-autosave {
  height: 26px;
}

.wec-autosave .base-switch {
  width: 28px;
  height: 16px;
}

.wec-autosave .base-switch__thumb {
  left: 2px;
  width: 12px;
  height: 12px;
}

.wec-autosave .base-switch--checked .base-switch__thumb {
  transform: translate(12px, -50%);
}

.wec-autosave .base-switch__label {
  font-size: var(--nod8-text-xs);
  color: var(--nd8-chrome-text-muted);
}
```

- [ ] **Step 3: Run verification**

Run:

```bash
cd client-vue
npm run type-check
npm run build-only
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/ui/chrome/WorkflowChromeToolbar.vue client-vue/src/features/workflow-editor/styles/workflow-editor-chrome.css
git commit -m "feat: add workflow editor chrome toolbar"
```

### Task 5: Compose `WorkflowEditorChrome.vue`

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/ui/chrome/WorkflowEditorChrome.vue`

- [ ] **Step 1: Create the component shell**

Create `WorkflowEditorChrome.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import WorkflowChromeHeader from './WorkflowChromeHeader.vue'
import WorkflowChromeMenuBar from './WorkflowChromeMenuBar.vue'
import WorkflowChromeToolbar from './WorkflowChromeToolbar.vue'
import type { WorkflowChromeCommandId } from './workflowChrome.types'
import type { WorkflowItem } from '@/core/types/workflow.types'

const props = defineProps<{
  workflowName: string
  workflowId: string
  workflow?: WorkflowItem
  isSaving?: boolean
  isExecuting?: boolean
  isStreaming?: boolean
  isLogsOpen?: boolean
  isDirty?: boolean
  autosaveStatus?: 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
  lastAutosavedAt?: number | null
  isAutosaveEnabled?: boolean
  canUndo?: boolean
  canRedo?: boolean
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'add-node'): void
  (e: 'run'): void
  (e: 'stop'): void
  (e: 'export-workflow'): void
  (e: 'import-workflow'): void
  (e: 'create-workflow'): void
  (e: 'open-workflows'): void
  (e: 'toggle-logs'): void
  (e: 'variables'): void
  (e: 'settings'): void
  (e: 'close'): void
  (e: 'workflow-updated', workflow: WorkflowItem): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'toggle-autosave', enabled: boolean): void
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'zoom-reset'): void
  (e: 'fit-view'): void
}>()

const route = useRoute()
const isBusy = computed(() => props.isExecuting || props.isStreaming)
const isUnsavedDraft = computed(() => !route.params.id)

function handleCommand(id: WorkflowChromeCommandId) {
  const handlers: Partial<Record<WorkflowChromeCommandId, () => void>> = {
    'file.new': () => emit('create-workflow'),
    'file.open': () => emit('open-workflows'),
    'file.import': () => emit('import-workflow'),
    'file.export': () => emit('export-workflow'),
    'file.save': () => emit('save'),
    'file.close': () => emit('close'),
    'edit.undo': () => emit('undo'),
    'edit.redo': () => emit('redo'),
    'view.zoom-out': () => emit('zoom-out'),
    'view.zoom-in': () => emit('zoom-in'),
    'view.zoom-reset': () => emit('zoom-reset'),
    'view.fit': () => emit('fit-view'),
    'view.logs': () => emit('toggle-logs'),
    'go.add-node': () => emit('add-node'),
    'go.variables': () => emit('variables'),
    'go.settings': () => emit('settings'),
    'run.workflow': () => emit('run'),
    'run.stop': () => emit('stop'),
  }

  handlers[id]?.()
}
</script>

<template>
  <section class="wec-shell" aria-label="Workflow editor toolbar">
    <WorkflowChromeHeader
      :workflow-name="workflowName"
      :workflow-id="workflowId"
      :workflow="workflow"
      :autosave-status="autosaveStatus"
      :last-autosaved-at="lastAutosavedAt"
      :is-dirty="isDirty"
      :is-autosave-enabled="isAutosaveEnabled"
      :is-busy="isBusy"
      :is-saving="isSaving"
      :is-unsaved-draft="isUnsavedDraft"
      @open-workflows="emit('open-workflows')"
      @toggle-autosave="emit('toggle-autosave', $event)"
      @workflow-updated="emit('workflow-updated', $event)"
    />

    <div class="wec-row wec-toolbar-row">
      <WorkflowChromeMenuBar @command="handleCommand" />
      <div class="wec-divider" />
      <WorkflowChromeToolbar
        :can-undo="canUndo"
        :can-redo="canRedo"
        :is-executing="isExecuting"
        :is-streaming="isStreaming"
        :is-saving="isSaving"
        :is-dirty="isDirty"
        :is-logs-open="isLogsOpen"
        @command="handleCommand"
      />
    </div>
  </section>
</template>
```

- [ ] **Step 2: Add row CSS**

Append to `workflow-editor-chrome.css`:

```css
.wec-toolbar-row {
  gap: 8px;
  background: var(--nd8-chrome-bg-muted);
  overflow: hidden;
}

.wec-toolbar-row > .wec-toolbar {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  background: transparent;
}
```

- [ ] **Step 3: Run verification**

Run:

```bash
cd client-vue
npm run type-check
npm run build-only
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/workflow-editor/components/ui/chrome/WorkflowEditorChrome.vue client-vue/src/features/workflow-editor/styles/workflow-editor-chrome.css
git commit -m "feat: compose workflow editor chrome"
```

### Task 6: Wire Chrome Into Workflow Editor Page

**Files:**
- Modify: `client-vue/src/app/pages/WorkflowEditorPage.vue`
- Modify: `client-vue/src/features/workflow-editor/components/Nod8WorkflowCanvas.vue`

- [ ] **Step 1: Add canvas exposed zoom methods if missing**

In `Nod8WorkflowCanvas.vue`, verify `defineExpose` includes methods for zoom and fit view. If not present, expose these methods using existing `useVueFlow()` helpers:

```ts
defineExpose({
  openAddNodePanel,
  handleRun,
  handleStop,
  zoomIn: () => zoomIn({ duration: 300 }),
  zoomOut: () => zoomOut({ duration: 300 }),
  zoomReset: () => zoomTo(1, { duration: 300 }),
  fitWorkflowView: () => fitView({ duration: 300, padding: 0.2 }),
})
```

If `defineExpose` already exists, merge these keys into the existing object instead of adding a second call.

- [ ] **Step 2: Replace the import**

In `WorkflowEditorPage.vue`, replace:

```ts
import WorkflowEditorDock from '@/features/workflow-editor/components/ui/WorkflowEditorDock.vue'
```

with:

```ts
import WorkflowEditorChrome from '@/features/workflow-editor/components/ui/chrome/WorkflowEditorChrome.vue'
```

- [ ] **Step 3: Replace the template component**

Replace `<WorkflowEditorDock ... />` with `<WorkflowEditorChrome ... />` and keep all existing props. Add new event handlers:

```vue
@zoom-in="canvasRef?.zoomIn()"
@zoom-out="canvasRef?.zoomOut()"
@zoom-reset="canvasRef?.zoomReset()"
@fit-view="canvasRef?.fitWorkflowView()"
@import-workflow="handleImportWorkflow()"
@create-workflow="handleCreateWorkflow()"
@open-workflows="showWorkflowPicker = true"
```

If workflow picker state is not implemented in this task, route `open-workflows` to the existing workflow dropdown behavior by keeping workflow opening inside the chrome header dropdown. Do not create an inert button.

- [ ] **Step 4: Extract import/create handlers**

Move the current import/create logic from `WorkflowEditorDock.vue` into `WorkflowEditorPage.vue` or a composable so menu actions remain real after replacing the dock.

Use exact function names:

```ts
async function handleCreateWorkflow() {
  const newWorkflow: WorkflowItem = {
    metadata: {
      id: crypto.randomUUID(),
      name: 'New Workflow',
      version: '1',
      isActive: false,
      isDraft: true,
      public: false,
      autosaveEnabled: false,
      createdAt: new Date().toISOString(),
    },
    trigger: { type: 'manual' },
    nodes: {},
    edges: [],
  }

  const created = await workflowsApi.create(newWorkflow)
  workflowStore.setActiveWorkflow(created)
  router.replace(`/workflows/${created.metadata.id}`)
}

async function handleImportWorkflow() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    const workflow = JSON.parse(await file.text()) as WorkflowItem
    workflow.metadata.id = crypto.randomUUID()
    workflow.metadata.createdAt = new Date().toISOString()
    workflow.metadata.isDraft = true
    const created = await workflowsApi.create(workflow)
    workflowStore.setActiveWorkflow(created)
    router.replace(`/workflows/${created.metadata.id}`)
  }
  input.click()
}
```

If the API function is not directly callable as `workflowsApi.create`, use the existing `useApi(workflowsApi.create)` pattern from the current dock.

- [ ] **Step 5: Run verification**

Run:

```bash
cd client-vue
npm run type-check
npm run build-only
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add client-vue/src/app/pages/WorkflowEditorPage.vue client-vue/src/features/workflow-editor/components/Nod8WorkflowCanvas.vue
git commit -m "feat: wire workflow editor chrome"
```

### Task 7: Visual QA and Responsive Polish

**Files:**
- Modify: `client-vue/src/features/workflow-editor/styles/workflow-editor-chrome.css`

- [ ] **Step 1: Desktop visual checks**

Run the dev server:

```bash
cd client-vue
npm run dev
```

Open `http://127.0.0.1:5173/workflows`.

Verify:

- Header and toolbar have stable heights.
- Workflow name truncates instead of pushing buttons off-screen.
- Menus open below the menu label and do not clip.
- Run/Stop states switch correctly.
- Save is disabled when clean and enabled when dirty.
- Autosave switch remains compact.
- Publish control fits at the right edge.

- [ ] **Step 2: Narrow width checks**

At browser widths `1440px`, `1024px`, `768px`, and `390px`, verify:

- The toolbar row does not overlap.
- The action toolbar scrolls horizontally when needed.
- Header actions remain reachable.
- Menu labels remain readable.
- No text is clipped inside buttons except workflow name truncation.

- [ ] **Step 3: Interaction checks**

Use the UI to confirm these actions:

- File > Export JSON downloads or triggers export.
- File > Save calls save.
- Edit > Undo and Redo match the toolbar buttons.
- View > Logs toggles logs panel.
- Go > Variables opens variables modal.
- Go > Workflow Settings opens settings modal.
- Run > Run Workflow starts execution flow.
- Toolbar Add Node opens add node panel.
- Zoom controls affect canvas.

- [ ] **Step 4: CSS hardening**

If any control overlaps, fix only `workflow-editor-chrome.css` using:

```css
min-width: 0;
flex: 0 0 auto;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

Apply these to the specific failing selector; do not add broad global rules.

- [ ] **Step 5: Run final verification**

Run:

```bash
cd client-vue
npm run type-check
npm run build-only
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add client-vue/src/features/workflow-editor/styles/workflow-editor-chrome.css
git commit -m "style: polish workflow editor chrome"
```

### Task 8: Remove or Retire Old Dock

**Files:**
- Delete or keep intentionally: `client-vue/src/features/workflow-editor/components/ui/WorkflowEditorDock.vue`
- Modify: `client-vue/src/features/workflow-editor/styles/editor-dock.css`
- Modify: `client-vue/src/assets/styles/main.css`

- [ ] **Step 1: Decide retirement mode**

Use this rule:

- If `WorkflowEditorDock.vue` has no imports after the chrome migration, delete it.
- If it is useful as fallback during QA, keep it for one branch only and add a comment in the plan execution notes.

- [ ] **Step 2: Remove dead CSS only after import scan**

Run:

```bash
rg -n "WorkflowEditorDock|wed-" client-vue/src
```

Expected after full retirement: no `WorkflowEditorDock` import remains. If `.wed-*` classes remain only in `editor-dock.css`, remove `editor-dock.css` import from `main.css` and delete the file.

- [ ] **Step 3: Run verification**

Run:

```bash
cd client-vue
npm run type-check
npm run build-only
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src
git commit -m "refactor: retire legacy workflow editor dock"
```

---

## Acceptance Criteria

- The workflow editor uses a two-row ND8 chrome inspired by Google Docs/Sheets.
- Menus are File, Edit, View, Select, Go, Run, Help.
- Every enabled menu item triggers a real existing action.
- Disabled menu items have a reason and are visually disabled.
- The toolbar exposes real workflow actions.
- CSS variables for the dock are isolated under `--nd8-chrome-*`.
- Classes use `.wec-*` prefixes.
- No toolbar text overlaps at common desktop/tablet/mobile widths.
- `npm run type-check` passes.
- `npm run build-only` passes.

---

## Self-Review

- Spec coverage: header, menus, toolbar, real actions, CSS isolation, responsive behavior, and migration are covered by Tasks 1-8.
- Placeholder-language scan: no task uses vague implementation language; disabled actions have explicit first-pass behavior.
- Type consistency: command ids are defined once in `workflowChrome.types.ts` and reused by menus, toolbar, and chrome event routing.
