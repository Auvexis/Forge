# Sailor Pages Explorer and Canvas Follow-up

Status: completed
Branch: current dev branch. Do not create a new branch.

## Tasks

### - [x] Task 1: Restore Previous Canvas Shape

Files:
- `client-vue/src/features/web-pages/components/PageEditor.vue`
- `client-vue/src/features/web-pages/pages.css`
- Page editor contract test.

Behavior:
- Remove large free canvas constants and initial auto-centering.
- Restore previous 2400x1800 centered plane feel.

### - [x] Task 2: Improve Code Explorer Tree

Files:
- `client-vue/src/features/web-pages/components/SiteFilesPanel.vue`
- `client-vue/src/features/web-pages/pages.css`
- Explorer contract test.

Behavior:
- Folders expand/collapse.
- Icons are visually separated from indentation guides.
- Folder hover shows New File, New Folder, Upload Image actions on the right.

### - [x] Task 3: Replace Prompt With Modal

Files:
- `client-vue/src/features/web-pages/components/SiteFilesPanel.vue`
- `client-vue/src/features/web-pages/pages.css`
- Explorer contract test.

Behavior:
- New File and New Folder open `BaseModal`.
- Modal contains input and action buttons.
- No `window.prompt`.

### - [x] Task 4: Fix Code Editor Close

Files:
- `client-vue/src/features/web-pages/components/SiteCodeCanvas.vue`
- `client-vue/src/features/web-pages/components/PageEditor.vue`
- Explorer contract test.

Behavior:
- Close button stops pointer/click propagation.
- Close clears active code file and returns to canvas.

### - [x] Task 5: Verification

Commands:
- Focused client web-pages contracts.
- `client-vue npm run type-check`.
