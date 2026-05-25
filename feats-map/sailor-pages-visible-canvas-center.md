# Sailor Pages Visible Canvas Center

Status: completed
Branch: current dev branch. Do not create a new branch.

## Tasks

### - [x] Task 1: Center Canvas in Visible Area

Files:
- `client-vue/src/features/web-pages/components/PageEditor.vue`
- Page editor contract test.

Behavior:
- Initial scroll centers the page in the visible editor area between open panels.
- Closed panels still reserve the same horizontal safe area, so the page does not jump on X.

### - [x] Task 2: Verification

Commands:
- Focused PageEditor contract.
- `client-vue npm run type-check`.
