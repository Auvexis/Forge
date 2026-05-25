# Sailor Pages Polish Follow-up

Status: completed
Branch: current dev branch. Do not create a new branch.

## Root Cause Notes

- Explorer spacing is caused by the Explorer container using `grid-template-rows: auto minmax(0, 1fr)` while the tree content is shorter than the panel.
- Code Explorer V1 renders flat sections, so folders/files have no visual hierarchy, icons, or indentation guides.
- File/folder creation exists only as hard-coded default buttons, not user actions.
- Code canvas has no close action, so switching back to visual canvas is indirect.
- Published page padding still differs because renderer only emits explicit `bodyStyles`; browser default body margin remains.
- Current canvas is a large scaled plane, not an offset-based free workspace.
- Image upload exists in site store, but image inspector has no upload/pick UI.
- Block move uses direct array mutation with CSS transitions only; it needs FLIP-style visual movement for reorder.

## Tasks

### - [x] Task 1: Fix Explorer Spacing

Files:
- `client-vue/src/features/web-pages/pages.css`
- Explorer contract test.

Behavior:
- Tree content stays directly under the tabs.
- No giant empty gap before site/page/layers rows.

### - [x] Task 2: Improve Code Explorer Tree and Create Actions

Files:
- `client-vue/src/features/web-pages/components/SiteFilesPanel.vue`
- `client-vue/src/features/web-pages/components/PageExplorerPanel.vue`
- `client-vue/src/features/web-pages/components/PageEditor.vue`
- `client-vue/src/features/web-pages/pages.css`

Behavior:
- Folder/file icons.
- Indentation guide lines.
- Nested tree paths.
- Buttons for new file, new folder, upload image.

### - [x] Task 3: Close Code Editor

Files:
- `client-vue/src/features/web-pages/components/SiteCodeCanvas.vue`
- `client-vue/src/features/web-pages/components/PageEditor.vue`

Behavior:
- Header has `BaseButton` with `x` icon.
- Clicking closes code canvas and returns to visual canvas.

### - [x] Task 4: Fix Published Body Padding/Margin

Files:
- `server/src/core/modules/pages/page-renderer.ts`
- `server/src/core/modules/pages/page-renderer.test.ts`

Behavior:
- Published/preview body margin defaults to `0`.
- If page body padding is `0`, children touch page edges.

### - [x] Task 5: Make Canvas Feel Freer

Files:
- `client-vue/src/features/web-pages/components/PageEditor.vue`
- `client-vue/src/features/web-pages/pages.css`

Behavior:
- Workspace has a larger offset-based plane.
- Page is centered by offset, not only scaled.
- Pan updates offset; zoom keeps the page usable.

### - [x] Task 6: Image Upload From Inspector

Files:
- `client-vue/src/features/web-pages/components/BlockContentPanel.vue`
- `client-vue/src/features/web-pages/components/PageEditor.vue`
- `client-vue/src/features/web-pages/stores/sites.store.ts`
- `client-vue/src/features/web-pages/pages.css`

Behavior:
- Image block inspector exposes upload image action.
- Upload stores file in `assets/`.
- Uploaded asset URL is applied to the image block `src`.

### - [x] Task 7: Smooth Movement Animation

Files:
- `client-vue/src/features/web-pages/components/PageCanvas.vue`
- `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- `client-vue/src/features/web-pages/pages.css`

Behavior:
- Reordered elements animate position changes subtly.
- Respect `prefers-reduced-motion`.

### - [x] Task 8: Verification

Commands:
- Focused client web-pages contracts.
- Focused server page renderer tests.
- `client-vue npm run type-check`.
- Builds if touched surfaces require it.
