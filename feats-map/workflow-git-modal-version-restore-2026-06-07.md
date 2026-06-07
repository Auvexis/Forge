# Workflow Git Modal Version Restore Implementation Plan

**Goal:** Add committed version selection and restore action back into the new Workflow Git modal.

**Tasks**

### Task 1: Contract for Version Picker
- [x] Update `client-vue/src/app/__tests__/WorkflowEditorStatusBar.contract.test.ts` to require a committed versions `<select>` in `WorkflowGitModal.vue`.
- [x] Require modal state for `snapshots`, `selectedSnapshotHash`, selected snapshot loading, and selected commit labels.
- [x] Run `node --test src/app/__tests__/WorkflowEditorStatusBar.contract.test.ts` from `client-vue` and verify RED.
- [x] Implement version dropdown using existing `workflowsApi.listGitSnapshots` and `workflowsApi.getGitSnapshot`.
- [x] Run targeted test and commit.

### Task 2: Restore Action in Modal
- [x] Update contract test to require modal `restore` emit and a Restore button disabled when no selected snapshot exists.
- [x] Update `WorkflowEditorPage.vue` to handle `@restore`, confirm, call `workflowsApi.restoreGitSnapshot`, update active workflow, reload Git status, refresh modal.
- [x] Run targeted test and commit.

### Task 3: Verification
- [x] Run frontend status/modal contract test.
- [x] Run `npm run type-check` in `client-vue`.
- [x] Run `npm run build` in `client-vue`.
- [x] Report any browser check that could not run.
