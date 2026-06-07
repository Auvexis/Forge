# Workflow Git Manual Commit Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make workflow Git commits explicit/manual, turn Changes Viewer into a live diff helper, and move Git actions into a polished modal opened from the status bar.

**Architecture:** Backend stops committing on regular workflow save/publish/unpublish and exposes a manual commit endpoint. Frontend keeps the floating Changes Viewer as read-only live diff against the latest commit, while a new `BaseModal` Git UI handles message input and commit execution.

**Tech Stack:** Node/Fastify backend, Vue 3 Composition API, Vitest, existing `BaseModal.vue`, `BaseFloatingWindow.vue`, `tokens.css`, Lucide icons.

---

### Task 1: Manual Workflow Git Commit Backend

**Files:**
- Modify: `server/src/core/modules/workflows/workflow-git-snapshot-service.ts`
- Modify: `server/src/core/modules/workflows/repository.ts`
- Modify: `server/src/core/routes/workflows.routes.ts`
- Modify: `server/src/core/modules/workflows/repository.test.ts`
- Modify: `server/src/core/modules/workflows/workflow-git-snapshot-service.test.ts`
- Modify: `client-vue/src/core/api/endpoints.ts`
- Modify: `client-vue/src/core/api/workflows.api.ts`
- Modify: `client-vue/src/core/api/workflows.api.contract.test.ts`

- [x] **Step 1: Write failing backend tests**

Add tests proving `saveWorkflow`, `publishWorkflow`, and `unpublishWorkflow` do not call the Git writer, and a new explicit repository method does call it with a commit message.

- [x] **Step 2: Run backend tests to verify RED**

Run:

```bash
npm test -- server/src/core/modules/workflows/repository.test.ts
```

Expected: FAIL because explicit manual commit API does not exist yet or auto-save still calls the writer.

- [x] **Step 3: Implement manual commit service/repository/route**

Change Git snapshot saving to accept a message and return `{ committed, status }`. Remove automatic calls from regular workflow save/publish/unpublish. Add `POST /workflows/:workflowId/git/commit`.

- [x] **Step 4: Add frontend API contract**

Add `ENDPOINTS.WORKFLOW_GIT_COMMIT(id)` and `workflowsApi.commitGitSnapshot(id, message)`.

- [x] **Step 5: Run targeted tests and commit**

Run:

```bash
npm test -- server/src/core/modules/workflows/repository.test.ts server/src/core/modules/workflows/workflow-git-snapshot-service.test.ts
npm --prefix client-vue test -- src/core/api/workflows.api.contract.test.ts
```

Commit message:

```bash
git commit -m "feat: make workflow git commits manual"
```

### Task 2: Live-Only Changes Viewer

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/ui/WorkflowGitChangesWindow.vue`
- Modify: `client-vue/src/features/workflow-editor/components/ui/__tests__/WorkflowGitChangesWindow.contract.test.ts`
- Modify: `client-vue/src/app/pages/WorkflowEditorPage.vue`

- [x] **Step 1: Write failing component test**

Update contract test so it expects no toolbar actions, no snapshot selector, no restore button, and only a diff comparing current live workflow JSON against the latest commit.

- [x] **Step 2: Run component test to verify RED**

Run:

```bash
npm --prefix client-vue test -- src/features/workflow-editor/components/ui/__tests__/WorkflowGitChangesWindow.contract.test.ts
```

Expected: FAIL because the old toolbar and restore UX still exist.

- [x] **Step 3: Simplify component**

Keep `BaseFloatingWindow`, remove toolbar/select/raw/restore controls, auto-load the latest snapshot, and render the existing green/red diff rows as a live preview.

- [x] **Step 4: Run targeted tests and commit**

Run:

```bash
npm --prefix client-vue test -- src/features/workflow-editor/components/ui/__tests__/WorkflowGitChangesWindow.contract.test.ts
```

Commit message:

```bash
git commit -m "feat: simplify workflow git changes preview"
```

### Task 3: Git Modal Commit UI

**Files:**
- Create: `client-vue/src/features/workflow-editor/components/ui/WorkflowGitModal.vue`
- Modify: `client-vue/src/app/pages/WorkflowEditorPage.vue`
- Modify: `client-vue/src/app/__tests__/WorkflowEditorStatusBar.contract.test.ts`

- [x] **Step 1: Write failing page/modal tests**

Add tests proving the `Git *hash*` status button opens a modal and the modal exposes commit message/description controls plus a commit button.

- [x] **Step 2: Run tests to verify RED**

Run:

```bash
npm --prefix client-vue test -- src/app/__tests__/WorkflowEditorStatusBar.contract.test.ts
```

Expected: FAIL because the button only refreshes Git status and the modal does not exist.

- [x] **Step 3: Implement `WorkflowGitModal.vue`**

Use `BaseModal.vue`, tokens, Lucide icons, a left changes sidebar, a main diff panel, and commit controls inspired by the first reference image. The modal emits a manual commit message to the page.

- [x] **Step 4: Wire status bar commit flow**

Change the status bar Git button to open the modal. On commit, save the live workflow once, call `workflowsApi.commitGitSnapshot`, reload Git status, and refresh the modal diff state.

- [x] **Step 5: Run targeted tests and commit**

Run:

```bash
npm --prefix client-vue test -- src/app/__tests__/WorkflowEditorStatusBar.contract.test.ts src/features/workflow-editor/components/ui/__tests__/WorkflowGitChangesWindow.contract.test.ts
```

Commit message:

```bash
git commit -m "feat: add workflow git commit modal"
```

### Final Verification

- [ ] Run backend workflow Git tests.
- [ ] Run frontend Git API/component/status bar tests.
- [ ] Start the frontend/backend if available and visually check the Changes Viewer and Git modal.
- [ ] Report any tests or browser checks that could not run.
