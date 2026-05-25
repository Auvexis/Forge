# Sailor Pages Center and Focus Polish

Status: completed
Branch: current dev branch. Do not create a new branch.

## Tasks

### - [x] Task 1: Remove Root Guide Lines in Code Explorer

Files:
- `client-vue/src/features/web-pages/components/SiteFilesPanel.vue`
- `client-vue/src/features/web-pages/pages.css`
- Explorer contract test.

Behavior:
- Root folders do not show parent guide lines.
- Child files/folders keep indentation guide lines.

### - [x] Task 2: Keep Canvas Centered on X

Files:
- `client-vue/src/features/web-pages/components/PageEditor.vue`
- `client-vue/src/features/web-pages/pages.css`
- Page editor contract test.

Behavior:
- Canvas center does not depend on left/right panel open state.
- Closing/opening panels only affects available overlay, not canvas X.
- Opening code editor does not push pages to the side.

### - [x] Task 3: Animate Code Editor Entry/Exit

Files:
- `client-vue/src/features/web-pages/components/PageEditor.vue`
- `client-vue/src/features/web-pages/pages.css`
- Explorer contract test.

Behavior:
- Code editor fades/slides in and out quickly.

### - [x] Task 4: Focus Accent Border

Files:
- `client-vue/src/features/web-pages/pages.css`
- Drag/selection contract test.

Behavior:
- Focused canvas element gets accent border.

### - [x] Task 5: Auto Focus New Elements

Files:
- `client-vue/src/features/web-pages/stores/page-editor.store.ts`
- Page editor/store contract test.

Behavior:
- Inserted blocks are selected automatically, showing Inspector properties.

### - [x] Task 6: Verification

Commands:
- Focused web-pages client contracts.
- `client-vue npm run type-check`.
