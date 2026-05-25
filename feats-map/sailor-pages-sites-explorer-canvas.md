# Sailor Pages Sites + Explorer + Canvas Plan

Status: planned
Branch: use current dev branch. Do not create new branch.

## Context

Recent commits:
- `2d900238 feat: add sailor page unpublish`
- `a30dbb08 fix: align sailor page canvas rendering`
- `fdd8b4b5 feat: serve sailor pages as standalone html`

Current shape:
- Backend Pages lives in `server/src/core/modules/pages/` and `server/src/core/routes/pages.routes.ts`.
- Frontend Pages lives in `client-vue/src/features/web-pages/`.
- Current model treats `SailorPage` as the main document. There is no `Site` entity.
- The editor already shows multiple pages, but persistence, publish, routes, and list UI are page-first.
- Canvas drag/drop uses `dropIntent.ts`, `BlockRenderer.vue`, `PageCanvas.vue`, and `pages.css`.
- `BaseCodeEditor.vue` exists and uses Monaco.

Risk:
- Changing from page-first to site-first can break publish URLs, old saved pages, and tests.
- Editing generated `.html` directly can desync visual blocks. Do not make HTML round-trip editing in first pass unless we add a parser.

## Architecture Decision

Use `Site -> Pages -> Blocks`.

Add a site model and keep old `/pages` routes as compatibility wrappers for the active/default site. New UI should be site-first. One site contains many pages. Publish should publish the site snapshot, with page slugs inside the site.

For Code tab V1:
- `Tree` tab: visual site/page/block tree.
- `Code` tab: file explorer for the active site.
- Editable files:
  - `css/site.css`: persisted site-level CSS.
  - `js/site.js`: persisted site-level JS.
  - `pages/<slug>.html`: generated preview, readonly in V1.
  - user-created `.css`, `.js`, `.html`, `.json`, `.txt` files inside allowed folders.
- Uploads:
  - uploaded images are stored under `assets/`.
  - image blocks can pick an uploaded asset instead of requiring a URL.
- Later, true editable HTML can be added only with explicit import/parse behavior.

Site project folder model:
- Every site behaves like a small project.
- Root folders:
  - `pages/` for page files.
  - `assets/` for uploaded images and media.
  - `js/` for JavaScript files.
  - `css/` for CSS files.
- Users can create folders and files inside this project, but path traversal and unsafe executable extensions are blocked.
- Site projects can be imported and exported.
- Imported projects are saved into the currently logged profile.

## Tasks

### - [x] Task 1: Add Site Types and Repository

Files:
- Create `server/src/core/modules/pages/site-types.ts`
- Create `server/src/core/modules/pages/site-repository.ts`
- Modify `server/src/core/modules/pages/page-types.ts`
- Modify `server/src/core/modules/pages/page-repository.ts`
- Add focused tests in `server/src/core/modules/pages/site-repository.test.ts`

Steps:
- Add `SailorSite` with `id`, `profileId`, `name`, `slug`, `homePageId`, `files`, `createdAt`, `updatedAt`.
- Add `siteId` to `SailorPage` and `PublishedPage`.
- In repository schema, create `sites` table and add `site_id` columns to `pages` and `published_pages`.
- Migration/backfill rule: existing pages go to one auto site per profile named `Default Site`.
- Keep unique page slug scoped by `(profile_id, site_id, slug)`.

Test only this because data migration is risky.

### - [x] Task 2: Add Site Service and Routes

Files:
- Create `server/src/core/modules/pages/site-service.ts`
- Modify `server/src/core/routes/pages.routes.ts`
- Modify `client-vue/src/core/api/endpoints.ts`
- Modify `client-vue/src/core/api/pages.api.ts`
- Add route/service tests around create/list/update/delete site and site pages.

New API:
- `GET /sites`
- `POST /sites`
- `GET /sites/:siteId`
- `PUT /sites/:siteId`
- `DELETE /sites/:siteId`
- `GET /sites/:siteId/pages`
- `POST /sites/:siteId/pages`
- `GET /sites/:siteId/pages/:pageId`
- `PUT /sites/:siteId/pages/:pageId`
- `DELETE /sites/:siteId/pages/:pageId`
- `POST /sites/:siteId/publish`
- `POST /sites/:siteId/unpublish`

Compatibility:
- Keep old `/pages` endpoints mapped to active/default site for now.
- Keep old `/p/:slug` working for existing published pages.

### - [x] Task 3: Frontend Site Store

Files:
- Create `client-vue/src/features/web-pages/stores/sites.store.ts`
- Modify `client-vue/src/features/web-pages/stores/pages.store.ts`
- Modify `client-vue/src/features/web-pages/types/page.types.ts`
- Add focused store tests.

Steps:
- Add `SailorSite`, `SailorSiteSummary`, `SiteFile`.
- Store active site separately from active page.
- `pages.store.ts` should operate inside `activeSiteId`.
- Save should persist page blocks and site files independently.
- Dirty state should cover page changes and site file changes.
- Site files should use project paths like `pages/home.html`, `css/site.css`, `js/site.js`, `assets/logo.png`.
- Store should support file create, folder create, file update, file delete, and asset upload metadata.

### - [x] Task 4: Add Site Project Files and Uploads

Files:
- Create `server/src/core/modules/pages/site-file-service.ts`
- Create `server/src/core/modules/pages/site-asset-service.ts`
- Modify `server/src/core/modules/pages/site-types.ts`
- Modify `server/src/core/routes/pages.routes.ts`
- Modify `client-vue/src/core/api/pages.api.ts`
- Modify `client-vue/src/features/web-pages/types/page.types.ts`
- Add focused tests for path validation and image upload metadata.

Backend behavior:
- Create default folders when a site is created: `pages/`, `assets/`, `js/`, `css/`.
- Allow creating nested folders under these roots.
- Allow file create/update/delete inside the site project.
- Store uploaded images under `assets/`.
- Return stable asset URLs for editor and published pages.
- Block `../`, absolute paths, backslash traversal, duplicate folder/file names in same folder, and unsafe extensions.

Frontend behavior:
- File explorer can create folder.
- File explorer can create file.
- File explorer can upload image.
- Image block content panel can choose uploaded asset or external URL.

### - [x] Task 5: Add Site Project Import and Export

Files:
- Create `server/src/core/modules/pages/site-project-archive-service.ts`
- Modify `server/src/core/modules/pages/site-service.ts`
- Modify `server/src/core/routes/pages.routes.ts`
- Modify `client-vue/src/core/api/pages.api.ts`
- Modify `client-vue/src/features/web-pages/stores/sites.store.ts`
- Add focused tests for archive validation and profile scoping.

Backend behavior:
- Export active site project as one archive file.
- Archive contains:
  - `sailor-site.json` manifest with site metadata, schema version, pages metadata, files metadata.
  - `pages/`
  - `assets/`
  - `js/`
  - `css/`
- Import validates manifest and paths before writing anything.
- Imported site is saved under the currently active/logged profile only.
- Import creates a new site id and resolves slug/name conflicts.
- Import never overwrites an existing site unless a future explicit replace option is added.
- Reject archives with path traversal, absolute paths, unsafe extensions, oversized files, or invalid JSON.

Frontend behavior:
- Add `Import project` action in Pages/Sites list and Explorer.
- Add `Export project` action in Explorer/header menu.
- Import shows success and opens the imported site.
- Export downloads a `.sailor-site.zip` or `.zip` archive.

Tests needed:
- Export includes manifest, pages, site files, and assets.
- Import stores site under active profile.
- Import rejects unsafe paths.
- Import resolves duplicate slug/name.

### - [x] Task 6: Rename Elements Panel to Explorer and Add Tabs

Files:
- Modify `client-vue/src/features/web-pages/components/PageEditor.vue`
- Create `client-vue/src/features/web-pages/components/PageExplorerPanel.vue`
- Keep/modify `client-vue/src/features/web-pages/components/BlockTreePanel.vue`
- Create `client-vue/src/features/web-pages/components/SiteFilesPanel.vue`
- Create `client-vue/src/features/web-pages/components/SiteCodeCanvas.vue`
- Add component contract test for tab switching and file open behavior.

Behavior:
- Left panel title becomes `Explorer`.
- Tabs: `Tree`, `Code`.
- `Tree` shows site > pages > blocks.
- `Code` shows:
  - `pages/`
  - `assets/`
  - `js/`
  - `css/`
  - user-created folders and files inside allowed roots.
  - uploaded image previews for files under `assets/`.
  - `css/site.css`
  - `js/site.js`
  - `pages/<slug>.html`
- Clicking CSS/JS opens `BaseCodeEditor.vue` on canvas.
- Clicking HTML opens generated readonly `BaseCodeEditor.vue` on canvas.
- Clicking images opens a preview on canvas with copyable asset URL.
- New folder/file/upload actions live in the `Code` tab toolbar/context menu.
- Import/export actions should be available from the site/project actions menu.
- Canvas returns to visual page when selecting page/block in Tree.

### - [x] Task 7: Ctrl+S Save

Files:
- Modify `client-vue/src/features/web-pages/components/PageEditor.vue`
- Optional: reuse `client-vue/src/shared/composables/useKeyboard.ts` if it already fits.
- Add one component contract test if keyboard events are already tested nearby.

Behavior:
- `Ctrl+S` and `Meta+S` prevent browser save.
- Save active visual page or active code file.
- Preserve current selection/editor mode after save.

### - [x] Task 8: Fix Drag/Drop Intent, Remove Accent Indicators, Add Subtle Motion

Files:
- Modify `client-vue/src/features/web-pages/utils/dropIntent.ts`
- Modify `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- Modify `client-vue/src/features/web-pages/components/BlockTreePanel.vue`
- Modify `client-vue/src/features/web-pages/pages.css`
- Keep/update existing `dropIntent.test.ts` and `PageDragPredict.contract.test.ts`.

Behavior:
- Make drop zones clearer:
  - top = before
  - bottom = after
  - center on container = inside
  - left/right indicators should only be visual hints, not confusing placement modes unless layout supports columns.
- Add smooth transitions to selected/drop target frame.
- Add subtle motion for canvas elements:
  - insert/move: short transform/opacity transition.
  - drag hover: calm border/background transition.
  - delete: quick fade/scale-out before removal when triggered from canvas/UI.
  - respect `prefers-reduced-motion`.
- Keep animations low intensity, around 120-180ms, so the editor feels smoother without becoming distracting.
- Replace accent color with neutral border/indicator tokens.
- Avoid glowing accent outlines.

### - [x] Task 9: Improve Free Canvas

Files:
- Modify `client-vue/src/features/web-pages/components/PageEditor.vue`
- Modify `client-vue/src/features/web-pages/components/PageFloatingAddToolbar.vue` if needed.
- Modify `client-vue/src/features/web-pages/pages.css`

Behavior:
- Add large workspace plane around pages.
- Support pan with middle mouse, space+drag, and pan tool.
- Add zoom controls: 50%, 75%, 100%, 125%, fit.
- Use CSS transform for zoom, not browser zoom.
- Keep pages selectable and draggable only when cursor tool is active.
- Add subtle viewport/canvas transitions for zoom and page focus, respecting `prefers-reduced-motion`.
- Do not use `vue-flow` for this pass. It is node/edge oriented and would add complexity for document pages.

### - [x] Task 10: Fix Base Page Padding Bug

Files:
- Modify `client-vue/src/features/web-pages/components/PageCanvas.vue`
- Modify `client-vue/src/features/web-pages/pages.css`
- Add one focused contract test or style regression if current test setup can assert class/style output.

Cause likely:
- `.web-page-canvas__body` always applies `padding: var(--sailor-space-6)`.
- Inline `bodyStyles.padding = 0` may be overridden or visually mixed with editor chrome padding.

Fix:
- Move editor-only padding to an outer canvas frame.
- Let `.web-page-canvas__body` padding default come from body styles fallback.
- If user sets `padding: 0`, rendered editor body must show zero inner padding.

### - [ ] Task 11: Publish Renderer With Site Assets

Files:
- Modify `server/src/core/modules/pages/page-renderer.ts`
- Modify `server/src/core/modules/pages/page-service.ts`
- Add/adjust renderer tests.

Behavior:
- Published site includes `site.css` and `site.js`.
- Published site includes user-created CSS/JS files referenced by the site/project.
- Published HTML resolves uploaded image assets from `assets/`.
- Page-specific block CSS/JS remains scoped as today.
- Sanitize site CSS/JS with same safety level as existing custom CSS/JS.
- Keep old page preview route working.

### - [ ] Task 12: Final Verification

Commands:
- `cd server; npm test -- pages`
- `cd client-vue; npm test -- web-pages`
- `cd client-vue; npm run typecheck`
- Run app and manually verify:
  - Create site.
  - Add two pages.
  - Move blocks before/after/inside.
  - Set page padding to `0`.
  - Open Explorer > Code > `css/site.css`.
  - Create folder under `assets/`.
  - Upload image and use it in an image block.
  - Create `js/custom.js` and `css/custom.css`.
  - Export project.
  - Import exported project into current profile.
  - Confirm imported project appears only in current profile.
  - Save with `Ctrl+S`.
  - Preview/publish.

## Commit Plan

Commit after each completed task:
- `feat: add sailor site model`
- `feat: add sailor site routes`
- `feat: add sailor pages site store`
- `feat: add sailor site project files`
- `feat: add sailor site project import export`
- `feat: add pages explorer code tab`
- `feat: add pages keyboard save`
- `fix: clarify page block drop intent`
- `feat: improve sailor pages canvas controls`
- `fix: respect page body zero padding`
- `feat: publish sailor site assets`

## Open Decisions Before Implementation

1. Should the `/pages` landing screen list `Sites` instead of pages immediately?
2. Should editable HTML be readonly V1 as planned, or do we accept a bigger parser/import task?
3. Should publish URL become `/s/:siteSlug/:pageSlug`, while keeping `/p/:slug` legacy?
4. Should uploaded assets be stored in SQLite as blobs or on disk under Sailor data? Recommendation: disk under Sailor data, DB stores metadata.
5. Export format recommendation: `.sailor-site.zip` with manifest + folders. OK?
