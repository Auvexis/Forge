# Sailor Pages MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sailor Pages: a safe, tree-based visual page builder where pages, forms, and buttons can trigger Sailor workflows.

**Architecture:** Add a new backend `pages` module with strict validation, repository, renderer, publisher, and action submission boundaries. Add a new frontend `web-pages` feature with page management, tree editor, block renderer, style/action panels, and form import. Reuse the existing forms workflow integration for schema and submission instead of duplicating form execution rules.

**Tech Stack:** Fastify, SQLite repositories, Node test runner, Vue 3, Pinia, TypeScript, Vite, existing Sailor form/workflow APIs.

---

## Scope Boundary

This plan intentionally does not build Elementor/Webflow. The MVP is structural HTML composition plus Sailor workflow actions.

Included:
- Page CRUD.
- Tree-based block editor.
- Blocks: `header`, `section`, `div`, `footer`, `form`, `button`, `input`, `text`, `image`, `link`.
- Safe style panel with allowlisted CSS properties.
- Custom class and custom CSS with sanitizer.
- Preview route and published route.
- Import form schema from existing Sailor form/workflow trigger.
- Form submit action using existing form submission pipeline.
- Button trigger action using workflow execution API.
- Tests for backend validation, renderer escaping, route behavior, frontend utilities, store behavior, and contracts.

Excluded:
- Free-position canvas.
- Custom JavaScript.
- CMS collections.
- Multi-page routing.
- Template marketplace.
- Advanced SEO.
- Breakpoint-specific visual editor.

## Architecture Rules

- `pages` backend module owns page data, validation, rendering, publishing, and page action routing.
- `forms` module remains the source of truth for form schema and form submission validation.
- `workflows` module remains the source of truth for workflow execution.
- Frontend `web-pages` owns UI/editor state only.
- No plugin code imports `core/engines` or other plugins.
- No raw user HTML is rendered without escaping.
- No arbitrary JS in pages.
- Only allowlisted tags, props, styles, and action types are persisted.
- Published pages use stable slugs and immutable-ish sanitized page snapshots.

## File Structure

### Backend Create

- `server/src/core/modules/pages/page-types.ts`
  - Defines page, block, style, action, publish, and validation result types.
- `server/src/core/modules/pages/page-validation.ts`
  - Validates and normalizes page payloads. Owns allowlists and limits.
- `server/src/core/modules/pages/page-repository.ts`
  - Persists page drafts and published records.
- `server/src/core/modules/pages/page-renderer.ts`
  - Converts sanitized block tree to safe HTML.
- `server/src/core/modules/pages/page-actions.ts`
  - Executes page form/button actions through existing form/workflow services.
- `server/src/core/modules/pages/page-service.ts`
  - Orchestrates CRUD, publish, preview, and action submission.
- `server/src/core/routes/pages.routes.ts`
  - Fastify routes for editor API, preview API, published pages, and action submit.
- `server/src/core/modules/pages/*.test.ts`
  - Unit and route tests.
- `server/src/core/routes/pages.routes.test.ts`
  - Route integration tests.

### Backend Modify

- `server/src/core/server.ts`
  - Register `pagesRoutes`.
- `server/src/core/database/migrations/...`
  - Add pages table and published pages table if migrations are current pattern. If pages repository follows existing JSON file pattern, do not add SQL migrations.
- `server/src/core/modules/forms/form-service.ts`
  - Expose a pure helper only if existing `formDefinition()` is insufficient.
- `server/src/core/modules/forms/form-submission.ts`
  - Prefer reuse. Modify only if `page-actions.ts` needs a request-independent submission helper.

### Frontend Create

- `client-vue/src/features/web-pages/types/page.types.ts`
  - Frontend page/block/action/style contracts.
- `client-vue/src/features/web-pages/utils/blockTree.ts`
  - Pure tree insert/move/delete/duplicate/select helpers.
- `client-vue/src/features/web-pages/utils/createBlock.ts`
  - Creates default safe blocks.
- `client-vue/src/features/web-pages/utils/styleAllowlist.ts`
  - Client-side style allowlist matching backend.
- `client-vue/src/features/web-pages/utils/formSchemaToBlocks.ts`
  - Converts existing form definitions into page blocks.
- `client-vue/src/features/web-pages/utils/renderPageHtml.ts`
  - Preview-only renderer mirror for local editor preview if needed.
- `client-vue/src/features/web-pages/stores/pages.store.ts`
  - List/create/delete/open/save/publish pages.
- `client-vue/src/features/web-pages/stores/page-editor.store.ts`
  - Selected block, draft edits, dirty state, undo/redo.
- `client-vue/src/features/web-pages/components/PagesList.vue`
- `client-vue/src/features/web-pages/components/PageEditor.vue`
- `client-vue/src/features/web-pages/components/PageCanvas.vue`
- `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- `client-vue/src/features/web-pages/components/BlockLibrary.vue`
- `client-vue/src/features/web-pages/components/BlockTreePanel.vue`
- `client-vue/src/features/web-pages/components/BlockToolbar.vue`
- `client-vue/src/features/web-pages/components/BlockStylePanel.vue`
- `client-vue/src/features/web-pages/components/BlockContentPanel.vue`
- `client-vue/src/features/web-pages/components/BlockActionPanel.vue`
- `client-vue/src/features/web-pages/components/FormImportPanel.vue`
- `client-vue/src/features/web-pages/pages.css`
- `client-vue/src/app/pages/PagesEditorPage.vue`
- `client-vue/src/app/pages/PublicSailorPage.vue`
- `client-vue/src/core/api/pages.api.ts`
- `client-vue/src/core/api/pages.api.contract.test.ts`

### Frontend Modify

- `client-vue/src/core/api/endpoints.ts`
  - Add Pages endpoints.
- `client-vue/src/app/router.ts`
  - Add `/pages`, `/pages/:pageId`, `/pages/:pageId/preview`, `/p/:slug`.
- `client-vue/src/shared/components/layout/appSidebarNavigation.ts`
  - Add visible `Pages` nav item after workflows.
- `client-vue/src/shared/components/layout/__tests__/appSidebarNavigation.test.ts`
  - Contract for visible Pages item.

---

## Implementation Tasks

### Task 1: Backend Page Contracts

**Files:**
- Create: `server/src/core/modules/pages/page-types.ts`
- Create: `server/src/core/modules/pages/page-validation.test.ts`
- Create: `server/src/core/modules/pages/page-validation.ts`

- [ ] **Step 1: Write failing validation tests**

Create tests covering:
- accepts a minimal page with one section and text block.
- rejects unsupported tags.
- strips unsupported styles.
- rejects custom JavaScript.
- rejects block trees deeper than 8 levels.
- rejects more than 300 blocks.
- rejects external image URLs that are not `http:` or `https:`.
- rejects action types outside `submitForm`, `triggerWorkflow`, `openUrl`.

Run:

```bash
cd server
node --test src/core/modules/pages/page-validation.test.ts
```

Expected: fail because module does not exist.

- [ ] **Step 2: Implement types and validation**

Define:
- `PageBlockTag`
- `PageBlock`
- `PageBlockAction`
- `SailorPage`
- `CreatePageInput`
- `UpdatePageInput`
- `PublishedPage`

Validation rules:
- Page title: 1-120 chars.
- Slug: `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 3-80 chars.
- Tags allowlist only.
- Props allowlist per tag.
- Style allowlist only.
- Custom CSS max 4000 chars per block.
- No `<script>`, `javascript:`, `data:text/html`, `on*=` attributes, or `expression(` in custom CSS.
- Max blocks: 300.
- Max depth: 8.

- [ ] **Step 3: Verify tests**

Run:

```bash
cd server
node --test src/core/modules/pages/page-validation.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add server/src/core/modules/pages/page-types.ts server/src/core/modules/pages/page-validation.ts server/src/core/modules/pages/page-validation.test.ts
git commit -m "feat: add sailor pages validation contracts"
```

### Task 2: Backend Repository

**Files:**
- Create: `server/src/core/modules/pages/page-repository.ts`
- Create: `server/src/core/modules/pages/page-repository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Tests:
- creates a page with timestamps.
- lists pages sorted by updatedAt desc.
- updates a page without changing id/createdAt.
- deletes page.
- rejects duplicate slug.
- stores published snapshot separately from draft.

Run:

```bash
cd server
node --test src/core/modules/pages/page-repository.test.ts
```

Expected: fail because repository does not exist.

- [ ] **Step 2: Implement repository**

Use existing repository style from `server/src/core/modules/workflows/repository.ts` as pattern. Keep repository dumb:
- no rendering.
- no workflow execution.
- no validation except duplicate/id existence guard.

Repository API:

```ts
export interface PageRepository {
  listPages(): SailorPage[];
  getPage(id: string): SailorPage | null;
  getPageBySlug(slug: string): SailorPage | null;
  savePage(page: SailorPage): SailorPage;
  deletePage(id: string): boolean;
  savePublishedPage(page: PublishedPage): PublishedPage;
  getPublishedPageBySlug(slug: string): PublishedPage | null;
}
```

- [ ] **Step 3: Verify tests**

Run:

```bash
cd server
node --test src/core/modules/pages/page-repository.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add server/src/core/modules/pages/page-repository.ts server/src/core/modules/pages/page-repository.test.ts
git commit -m "feat: add sailor pages repository"
```

### Task 3: Safe Page Renderer

**Files:**
- Create: `server/src/core/modules/pages/page-renderer.ts`
- Create: `server/src/core/modules/pages/page-renderer.test.ts`

- [ ] **Step 1: Write failing renderer tests**

Tests:
- renders semantic block tree as HTML.
- escapes text, attributes, URLs, and custom class names.
- omits unsupported props.
- includes sanitized per-block CSS only under generated block selectors.
- renders forms with `data-sailor-action-id`.
- renders buttons with `data-sailor-action-id`.
- never renders `<script>` from page content.

Run:

```bash
cd server
node --test src/core/modules/pages/page-renderer.test.ts
```

Expected: fail because renderer does not exist.

- [ ] **Step 2: Implement renderer**

Renderer API:

```ts
export function renderPublishedPage(page: PublishedPage): string;
export function renderPageBody(blocks: PageBlock[]): string;
export function renderPageCss(page: PublishedPage): string;
```

Security:
- Escape every text node.
- Escape every attribute.
- Only render allowed props.
- Only render allowed styles.
- `link` URL allows `http:`, `https:`, `mailto:`, `tel:`, `#`, `/`.
- `image` URL allows `http:`, `https:`, `/`.
- No inline event handlers.
- No custom JS.

- [ ] **Step 3: Verify tests**

Run:

```bash
cd server
node --test src/core/modules/pages/page-renderer.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add server/src/core/modules/pages/page-renderer.ts server/src/core/modules/pages/page-renderer.test.ts
git commit -m "feat: add safe sailor page renderer"
```

### Task 4: Page Service

**Files:**
- Create: `server/src/core/modules/pages/page-service.ts`
- Create: `server/src/core/modules/pages/page-service.test.ts`

- [ ] **Step 1: Write failing service tests**

Tests:
- creates page from default template.
- updates page after validation.
- returns validation error for invalid block tree.
- publishes sanitized snapshot.
- preview renders draft.
- published route renders snapshot even if draft changes later.

Run:

```bash
cd server
node --test src/core/modules/pages/page-service.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement service**

Service responsibilities:
- generate ids: `page_${timestamp}_${random}`.
- normalize slugs from title.
- call validation before save/publish.
- call repository.
- call renderer.
- never execute workflows directly.

Service API:

```ts
export class PageService {
  listPages(): SailorPageSummary[];
  createPage(input: CreatePageInput): SailorPage;
  getPage(id: string): SailorPage | null;
  updatePage(id: string, input: UpdatePageInput): SailorPage;
  deletePage(id: string): boolean;
  publishPage(id: string): PublishedPage;
  renderPreview(id: string): string | null;
  renderPublished(slug: string): string | null;
}
```

- [ ] **Step 3: Verify tests**

Run:

```bash
cd server
node --test src/core/modules/pages/page-service.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add server/src/core/modules/pages/page-service.ts server/src/core/modules/pages/page-service.test.ts
git commit -m "feat: add sailor pages service"
```

### Task 5: Page Action Execution

**Files:**
- Create: `server/src/core/modules/pages/page-actions.ts`
- Create: `server/src/core/modules/pages/page-actions.test.ts`
- Modify: `server/src/core/modules/forms/form-submission.ts` only if a request-independent helper is required.

- [ ] **Step 1: Write failing action tests**

Tests:
- `submitForm` action delegates to existing form submission behavior.
- required fields still fail through form validation.
- form rate limit still applies.
- `triggerWorkflow` action executes the selected workflow trigger with mapped payload.
- unknown action id returns 404.
- disabled/missing workflow returns safe 404/400.
- openUrl action is not executed server-side.

Run:

```bash
cd server
node --test src/core/modules/pages/page-actions.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement action service**

Action service boundaries:
- Receives `pageSlug`, `actionId`, request.
- Finds published page snapshot.
- Finds action in block tree.
- For `submitForm`, call existing form API logic or extracted `processFormSubmission`.
- For `triggerWorkflow`, call `WorkflowEngine.executeWorkflowFromTrigger`.
- Emit workflow event bus consistently with existing form/webhook execution.
- Return `{ executionId }`.

Security:
- Do not trust client payload mapping.
- Use action mapping from published page snapshot only.
- Limit payload keys to 50.
- Limit string values to 8 KB.
- Reject nested payload deeper than 6.

- [ ] **Step 3: Verify tests**

Run:

```bash
cd server
node --test src/core/modules/pages/page-actions.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add server/src/core/modules/pages/page-actions.ts server/src/core/modules/pages/page-actions.test.ts server/src/core/modules/forms/form-submission.ts
git commit -m "feat: connect sailor page actions to workflows"
```

### Task 6: Backend Routes

**Files:**
- Create: `server/src/core/routes/pages.routes.ts`
- Create: `server/src/core/routes/pages.routes.test.ts`
- Modify: `server/src/core/server.ts`

- [ ] **Step 1: Write failing route tests**

Routes:
- `GET /pages`
- `POST /pages`
- `GET /pages/:pageId`
- `PUT /pages/:pageId`
- `DELETE /pages/:pageId`
- `POST /pages/:pageId/publish`
- `GET /pages/:pageId/preview`
- `GET /p/:slug`
- `POST /p/:slug/actions/:actionId`

Tests:
- CRUD returns API response shape.
- preview returns HTML with `text/html`.
- published page returns HTML with `text/html`.
- action submit returns 202.
- invalid payload returns 400 with no stack trace.
- missing page returns 404.

Run:

```bash
cd server
node --test src/core/routes/pages.routes.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement routes**

Use existing `sendResponse` style from current routes. Register routes in `server.ts`.

Hard rules:
- Editor routes return JSON.
- Preview/published routes return HTML.
- Action route returns JSON.
- Never expose internal validation stack traces.

- [ ] **Step 3: Verify route tests**

Run:

```bash
cd server
node --test src/core/routes/pages.routes.test.ts
```

Expected: pass.

- [ ] **Step 4: Run backend focused tests**

```bash
cd server
node --test src/core/modules/pages/*.test.ts src/core/routes/pages.routes.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/core/routes/pages.routes.ts server/src/core/routes/pages.routes.test.ts server/src/core/server.ts
git commit -m "feat: expose sailor pages backend routes"
```

### Task 7: Frontend API and Types

**Files:**
- Create: `client-vue/src/features/web-pages/types/page.types.ts`
- Create: `client-vue/src/core/api/pages.api.ts`
- Create: `client-vue/src/core/api/pages.api.contract.test.ts`
- Modify: `client-vue/src/core/api/endpoints.ts`

- [ ] **Step 1: Write failing API contract tests**

Tests:
- endpoints include every Pages API route.
- `pagesApi` exports list/create/get/update/delete/publish/submitAction helpers.
- types do not allow custom JS.
- action union only allows `submitForm`, `triggerWorkflow`, `openUrl`.

Run:

```bash
cd client-vue
node --test src/core/api/pages.api.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement frontend types/API**

Keep frontend types aligned with backend:
- `PageBlockTag`
- `PageBlock`
- `PageBlockAction`
- `SailorPage`
- `PublishedPageSummary`

API methods:
- `listPages`
- `createPage`
- `getPage`
- `updatePage`
- `deletePage`
- `publishPage`
- `submitPageAction`

- [ ] **Step 3: Verify tests**

```bash
cd client-vue
node --test src/core/api/pages.api.contract.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/web-pages/types/page.types.ts client-vue/src/core/api/pages.api.ts client-vue/src/core/api/pages.api.contract.test.ts client-vue/src/core/api/endpoints.ts
git commit -m "feat: add sailor pages frontend api"
```

### Task 8: Block Tree Utilities

**Files:**
- Create: `client-vue/src/features/web-pages/utils/blockTree.ts`
- Create: `client-vue/src/features/web-pages/utils/createBlock.ts`
- Create: `client-vue/src/features/web-pages/utils/__tests__/blockTree.test.ts`

- [ ] **Step 1: Write failing block tree tests**

Tests:
- insert block before target.
- insert block after target.
- insert block inside container.
- reject inserting inside non-container block.
- move block without losing children.
- prevent moving a block inside itself/descendant.
- delete block.
- duplicate block with new ids.
- find selected block path.

Run:

```bash
cd client-vue
node --test src/features/web-pages/utils/__tests__/blockTree.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement pure utilities**

API:

```ts
insertBlock(tree, targetId, position, block)
moveBlock(tree, draggedId, targetId, position)
deleteBlock(tree, blockId)
duplicateBlock(tree, blockId)
findBlock(tree, blockId)
createBlock(tag)
```

SRP:
- no Vue refs.
- no API calls.
- no DOM.
- no styles panel logic.

- [ ] **Step 3: Verify tests**

```bash
cd client-vue
node --test src/features/web-pages/utils/__tests__/blockTree.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/web-pages/utils/blockTree.ts client-vue/src/features/web-pages/utils/createBlock.ts client-vue/src/features/web-pages/utils/__tests__/blockTree.test.ts
git commit -m "feat: add sailor pages block tree utilities"
```

### Task 9: Style and CSS Sanitization Utilities

**Files:**
- Create: `client-vue/src/features/web-pages/utils/styleAllowlist.ts`
- Create: `client-vue/src/features/web-pages/utils/__tests__/styleAllowlist.test.ts`

- [ ] **Step 1: Write failing tests**

Tests:
- keeps allowed layout styles.
- removes unknown CSS properties.
- removes `position: fixed`.
- removes `javascript:` URLs.
- removes `expression(`.
- clamps numeric values where appropriate.
- preserves safe custom class names.

Run:

```bash
cd client-vue
node --test src/features/web-pages/utils/__tests__/styleAllowlist.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement client sanitizer mirror**

Allowed style groups:
- Layout: width, height, maxWidth, minHeight, padding, margin, display, flexDirection, alignItems, justifyContent, gap.
- Visual: backgroundColor, backgroundImage, color, border, borderRadius, boxShadow, opacity.
- Typography: fontSize, fontWeight, lineHeight, textAlign, letterSpacing.

No arbitrary CSSOM assignment from user input.

- [ ] **Step 3: Verify tests**

```bash
cd client-vue
node --test src/features/web-pages/utils/__tests__/styleAllowlist.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/web-pages/utils/styleAllowlist.ts client-vue/src/features/web-pages/utils/__tests__/styleAllowlist.test.ts
git commit -m "feat: add sailor pages style sanitizer"
```

### Task 10: Form Schema Import

**Files:**
- Create: `client-vue/src/features/web-pages/utils/formSchemaToBlocks.ts`
- Create: `client-vue/src/features/web-pages/utils/__tests__/formSchemaToBlocks.test.ts`
- Modify: `client-vue/src/core/api/workflows.api.ts` only if a helper is missing.

- [ ] **Step 1: Write failing tests**

Tests:
- converts `FormDefinition` into `form` block.
- creates input blocks for every field.
- maps select/radio/checkbox metadata safely.
- creates submit button.
- adds `submitForm` action with `workflowId`, `triggerNodeId`, and `formId`.
- rejects form definitions with duplicate field names.

Run:

```bash
cd client-vue
node --test src/features/web-pages/utils/__tests__/formSchemaToBlocks.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement importer**

Output:
- one `form` block.
- child `input` blocks.
- one `button` block.
- action id generated once and stored on form.

Use existing `workflowsApi.getFormDefinition()` to fetch schema. Do not scrape HTML.

- [ ] **Step 3: Verify tests**

```bash
cd client-vue
node --test src/features/web-pages/utils/__tests__/formSchemaToBlocks.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/web-pages/utils/formSchemaToBlocks.ts client-vue/src/features/web-pages/utils/__tests__/formSchemaToBlocks.test.ts
git commit -m "feat: import workflow form schemas into pages"
```

### Task 11: Pages Stores

**Files:**
- Create: `client-vue/src/features/web-pages/stores/pages.store.ts`
- Create: `client-vue/src/features/web-pages/stores/page-editor.store.ts`
- Create: `client-vue/src/features/web-pages/stores/__tests__/pages.store.test.ts`
- Create: `client-vue/src/features/web-pages/stores/__tests__/page-editor.store.test.ts`

- [ ] **Step 1: Write failing store tests**

Tests:
- list/create/open/save/delete page.
- set active page.
- dirty state.
- save resets dirty snapshot.
- publish stores published metadata.
- insert/move/delete block delegates to tree utilities.
- undo/redo restores block tree.
- failed save leaves dirty state intact.

Run:

```bash
cd client-vue
node --test src/features/web-pages/stores/__tests__/pages.store.test.ts src/features/web-pages/stores/__tests__/page-editor.store.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement stores**

Store boundaries:
- `pages.store.ts`: API lifecycle and list/detail cache.
- `page-editor.store.ts`: local editing state and undo/redo.
- No renderer logic in stores.
- No DOM access.

- [ ] **Step 3: Verify tests**

```bash
cd client-vue
node --test src/features/web-pages/stores/__tests__/pages.store.test.ts src/features/web-pages/stores/__tests__/page-editor.store.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/web-pages/stores client-vue/src/features/web-pages/stores/__tests__
git commit -m "feat: add sailor pages stores"
```

### Task 12: Page Management UI

**Files:**
- Create: `client-vue/src/app/pages/PagesEditorPage.vue`
- Create: `client-vue/src/features/web-pages/components/PagesList.vue`
- Create: `client-vue/src/features/web-pages/components/__tests__/PagesList.contract.test.ts`
- Modify: `client-vue/src/app/router.ts`
- Modify: `client-vue/src/shared/components/layout/appSidebarNavigation.ts`
- Modify: `client-vue/src/shared/components/layout/__tests__/appSidebarNavigation.test.ts`

- [ ] **Step 1: Write failing contract tests**

Tests:
- router exposes `/pages` and `/pages/:pageId`.
- sidebar shows `Pages`.
- page shell mounts `PagesList`.
- create/delete/open actions wired to store.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PagesList.contract.test.ts src/shared/components/layout/__tests__/appSidebarNavigation.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement management UI**

UI rules:
- No marketing hero.
- First screen is app workspace.
- List pages with title, slug, updatedAt, published status.
- Primary action: create page.
- Open existing page into editor.

- [ ] **Step 3: Verify tests**

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PagesList.contract.test.ts src/shared/components/layout/__tests__/appSidebarNavigation.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/app/pages/PagesEditorPage.vue client-vue/src/features/web-pages/components/PagesList.vue client-vue/src/features/web-pages/components/__tests__/PagesList.contract.test.ts client-vue/src/app/router.ts client-vue/src/shared/components/layout/appSidebarNavigation.ts client-vue/src/shared/components/layout/__tests__/appSidebarNavigation.test.ts
git commit -m "feat: add sailor pages navigation and list"
```

### Task 13: Editor Canvas and Block Renderer

**Files:**
- Create: `client-vue/src/features/web-pages/components/PageEditor.vue`
- Create: `client-vue/src/features/web-pages/components/PageCanvas.vue`
- Create: `client-vue/src/features/web-pages/components/BlockRenderer.vue`
- Create: `client-vue/src/features/web-pages/components/BlockToolbar.vue`
- Create: `client-vue/src/features/web-pages/components/BlockTreePanel.vue`
- Create: `client-vue/src/features/web-pages/components/__tests__/PageEditor.contract.test.ts`
- Create: `client-vue/src/features/web-pages/pages.css`
- Modify: `client-vue/src/app/pages/PagesEditorPage.vue`

- [ ] **Step 1: Write failing contract tests**

Tests:
- editor renders selected page.
- canvas uses structural block renderer, not free-position canvas.
- block renderer recursively renders children.
- selected block emits selection.
- toolbar emits delete/duplicate.
- tree panel can select block.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PageEditor.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement editor skeleton**

Layout:
- left: block library/tree.
- center: page canvas.
- right: inspector panels.
- bottom/status: save/publish/preview state.

Renderer:
- use semantic tags through controlled component mapping.
- do not use `v-html` for user content.
- bind only sanitized props/styles.

- [ ] **Step 3: Verify tests**

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PageEditor.contract.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/web-pages/components/PageEditor.vue client-vue/src/features/web-pages/components/PageCanvas.vue client-vue/src/features/web-pages/components/BlockRenderer.vue client-vue/src/features/web-pages/components/BlockToolbar.vue client-vue/src/features/web-pages/components/BlockTreePanel.vue client-vue/src/features/web-pages/components/__tests__/PageEditor.contract.test.ts client-vue/src/features/web-pages/pages.css client-vue/src/app/pages/PagesEditorPage.vue
git commit -m "feat: add sailor pages editor canvas"
```

### Task 14: Block Library and Drop Zones

**Files:**
- Create: `client-vue/src/features/web-pages/components/BlockLibrary.vue`
- Create: `client-vue/src/features/web-pages/components/__tests__/BlockLibrary.contract.test.ts`
- Modify: `client-vue/src/features/web-pages/components/PageCanvas.vue`
- Modify: `client-vue/src/features/web-pages/components/BlockRenderer.vue`

- [ ] **Step 1: Write failing contract tests**

Tests:
- block library exposes MVP blocks only.
- canvas exposes before/inside/after drop zone events.
- drop inside is only available for container blocks.
- no free-position x/y props are used.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/BlockLibrary.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement library/drop zones**

Blocks:
- header
- section
- div
- footer
- form
- button
- input
- text
- image
- link

Drop positions:
- before
- inside
- after

- [ ] **Step 3: Verify tests**

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/BlockLibrary.contract.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/web-pages/components/BlockLibrary.vue client-vue/src/features/web-pages/components/__tests__/BlockLibrary.contract.test.ts client-vue/src/features/web-pages/components/PageCanvas.vue client-vue/src/features/web-pages/components/BlockRenderer.vue
git commit -m "feat: add sailor pages block library"
```

### Task 15: Inspector Panels

**Files:**
- Create: `client-vue/src/features/web-pages/components/BlockStylePanel.vue`
- Create: `client-vue/src/features/web-pages/components/BlockContentPanel.vue`
- Create: `client-vue/src/features/web-pages/components/BlockActionPanel.vue`
- Create: `client-vue/src/features/web-pages/components/__tests__/BlockInspector.contract.test.ts`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`

- [ ] **Step 1: Write failing contract tests**

Tests:
- selected block shows content fields by tag.
- style panel uses controls for allowlisted properties.
- action panel supports form submit, workflow trigger, open URL.
- action panel does not expose custom JS.
- image block validates URL input.
- link block validates URL/target input.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/BlockInspector.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement inspector panels**

SRP:
- Content panel edits props/text.
- Style panel edits styles/class/custom CSS.
- Action panel edits actions.

No panel performs API save directly. It emits patch events to editor store.

- [ ] **Step 3: Verify tests**

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/BlockInspector.contract.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/web-pages/components/BlockStylePanel.vue client-vue/src/features/web-pages/components/BlockContentPanel.vue client-vue/src/features/web-pages/components/BlockActionPanel.vue client-vue/src/features/web-pages/components/__tests__/BlockInspector.contract.test.ts client-vue/src/features/web-pages/components/PageEditor.vue
git commit -m "feat: add sailor pages inspector panels"
```

### Task 16: Form Import Panel

**Files:**
- Create: `client-vue/src/features/web-pages/components/FormImportPanel.vue`
- Create: `client-vue/src/features/web-pages/components/__tests__/FormImportPanel.contract.test.ts`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`

- [ ] **Step 1: Write failing contract tests**

Tests:
- panel accepts form link or form id.
- extracts form id from `/forms/:formId`, `/forms-test/:formId`, `/p/:profileId/forms/:formId`.
- calls `workflowsApi.getFormDefinition`.
- previews imported field count.
- confirm inserts generated form block.
- failure shows error and does not mutate page.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/FormImportPanel.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement form import panel**

Flow:
1. User adds form or opens import.
2. User pastes link or id.
3. Resolve form id/profile id/mode.
4. Fetch schema through existing API.
5. Show title and field count.
6. Confirm inserts generated form block.

- [ ] **Step 3: Verify tests**

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/FormImportPanel.contract.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/features/web-pages/components/FormImportPanel.vue client-vue/src/features/web-pages/components/__tests__/FormImportPanel.contract.test.ts client-vue/src/features/web-pages/components/PageEditor.vue
git commit -m "feat: import sailor forms into pages UI"
```

### Task 17: Preview and Publish UX

**Files:**
- Create: `client-vue/src/app/pages/PublicSailorPage.vue`
- Create: `client-vue/src/features/web-pages/components/__tests__/PagePreviewPublish.contract.test.ts`
- Modify: `client-vue/src/app/router.ts`
- Modify: `client-vue/src/features/web-pages/stores/pages.store.ts`
- Modify: `client-vue/src/features/web-pages/components/PageEditor.vue`

- [ ] **Step 1: Write failing contract tests**

Tests:
- router exposes preview and published routes.
- editor has preview and publish commands.
- publish command calls store.
- public page route loads published HTML safely.
- no `v-html` is used for editor block rendering; public page can use backend HTML only in isolated route.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PagePreviewPublish.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement preview/publish UX**

Preview:
- Opens `/pages/:pageId/preview`.
- Uses backend-rendered HTML.

Publish:
- Calls `POST /pages/:pageId/publish`.
- Shows published URL `/p/:slug`.
- Does not auto-publish on save.

- [ ] **Step 3: Verify tests**

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PagePreviewPublish.contract.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/app/pages/PublicSailorPage.vue client-vue/src/features/web-pages/components/__tests__/PagePreviewPublish.contract.test.ts client-vue/src/app/router.ts client-vue/src/features/web-pages/stores/pages.store.ts client-vue/src/features/web-pages/components/PageEditor.vue
git commit -m "feat: add sailor pages preview and publish UX"
```

### Task 18: Published Page Runtime Actions

**Files:**
- Modify: `client-vue/src/app/pages/PublicSailorPage.vue`
- Modify: `client-vue/src/core/api/pages.api.ts`
- Create: `client-vue/src/features/web-pages/components/__tests__/PublishedPageRuntime.contract.test.ts`

- [ ] **Step 1: Write failing contract tests**

Tests:
- form submit collects inputs by name.
- button click calls `submitPageAction` for workflow action.
- openUrl action uses safe target.
- submitting disables action until response.
- error renders without losing form values.
- success renders execution id/status message.

Run:

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PublishedPageRuntime.contract.test.ts
```

Expected: fail.

- [ ] **Step 2: Implement runtime action handler**

Rules:
- Attach event listeners only to backend-rendered action elements.
- Do not eval any script from page content.
- Build payload from form controls.
- Send to `/p/:slug/actions/:actionId`.
- Show accessible success/error state.

- [ ] **Step 3: Verify tests**

```bash
cd client-vue
node --test src/features/web-pages/components/__tests__/PublishedPageRuntime.contract.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add client-vue/src/app/pages/PublicSailorPage.vue client-vue/src/core/api/pages.api.ts client-vue/src/features/web-pages/components/__tests__/PublishedPageRuntime.contract.test.ts
git commit -m "feat: run actions from published sailor pages"
```

### Task 19: Security Hardening Pass

**Files:**
- Modify: `server/src/core/modules/pages/page-validation.ts`
- Modify: `server/src/core/modules/pages/page-renderer.ts`
- Modify: `server/src/core/modules/pages/page-actions.ts`
- Modify: `client-vue/src/features/web-pages/utils/styleAllowlist.ts`
- Create: `server/src/core/modules/pages/page-security.test.ts`

- [ ] **Step 1: Write failing attack tests**

Attack cases:
- `<img src=x onerror=alert(1)>`
- `javascript:alert(1)` links.
- `data:text/html,<script>alert(1)</script>` URLs.
- CSS `background-image: url(javascript:alert(1))`.
- CSS `position: fixed`.
- deep object payload.
- payload with 1000 keys.
- custom CSS with `</style><script>`.

Run:

```bash
cd server
node --test src/core/modules/pages/page-security.test.ts
```

Expected: fail until hardening is complete.

- [ ] **Step 2: Implement hardening**

Server is final authority:
- reject unsafe payloads before persistence.
- renderer escapes even already-validated content.
- action endpoint validates payload independently.

- [ ] **Step 3: Verify security tests**

```bash
cd server
node --test src/core/modules/pages/page-security.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add server/src/core/modules/pages/page-security.test.ts server/src/core/modules/pages/page-validation.ts server/src/core/modules/pages/page-renderer.ts server/src/core/modules/pages/page-actions.ts client-vue/src/features/web-pages/utils/styleAllowlist.ts
git commit -m "test: harden sailor pages security boundaries"
```

### Task 20: End-to-End Smoke Workflow

**Files:**
- Create: `server/src/core/routes/pages-form-workflow.integration.test.ts`
- Create: `client-vue/src/features/web-pages/components/__tests__/SailorPagesMvp.contract.test.ts`

- [ ] **Step 1: Write failing integration tests**

Backend scenario:
1. Create form workflow.
2. Create page with form submit action.
3. Publish page.
4. Submit published page action.
5. Assert workflow execution exists.

Frontend contract:
1. Pages nav exists.
2. Create page action exists.
3. Add form import path exists.
4. Publish command exists.
5. Plugin Creator nav remains absent.

Run:

```bash
cd server
node --test src/core/routes/pages-form-workflow.integration.test.ts
cd ../client-vue
node --test src/features/web-pages/components/__tests__/SailorPagesMvp.contract.test.ts
```

Expected: fail until full flow works.

- [ ] **Step 2: Implement missing glue only**

Do not add new product scope. Fix only integration gaps found by the tests.

- [ ] **Step 3: Verify integration tests**

```bash
cd server
node --test src/core/routes/pages-form-workflow.integration.test.ts
cd ../client-vue
node --test src/features/web-pages/components/__tests__/SailorPagesMvp.contract.test.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add server/src/core/routes/pages-form-workflow.integration.test.ts client-vue/src/features/web-pages/components/__tests__/SailorPagesMvp.contract.test.ts
git commit -m "test: verify sailor pages mvp flow"
```

### Task 21: Full Verification and Stabilization

**Files:**
- Modify only files required by failed checks.

- [ ] **Step 1: Run backend focused suite**

```bash
cd server
node --test src/core/modules/pages/*.test.ts src/core/routes/pages*.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run frontend focused suite**

```bash
cd client-vue
node --test src/core/api/pages.api.contract.test.ts src/features/web-pages/**/*.test.ts
```

Expected: all pass.

- [ ] **Step 3: Run type checks**

```bash
cd client-vue
npm run type-check
```

Expected: pass.

- [ ] **Step 4: Run frontend build**

```bash
cd client-vue
npm run build-only
```

Expected: pass. Existing chunk-size warnings are acceptable if build exits 0.

- [ ] **Step 5: Manual smoke**

Start app locally:

```bash
cd server
npm run dev
cd ../client-vue
npm run dev
```

Smoke:
- open `/pages`.
- create page.
- add hero text.
- import existing form schema.
- publish page.
- open `/p/:slug`.
- submit form.
- confirm workflow execution appears.

- [ ] **Step 6: Commit stabilization**

```bash
git add <only files changed by fixes>
git commit -m "fix: stabilize sailor pages mvp"
```

---

## Safety Checklist

- [ ] Backend rejects unsupported tags.
- [ ] Backend rejects unsupported actions.
- [ ] Backend rejects custom JS.
- [ ] Backend sanitizes styles.
- [ ] Renderer escapes text and attrs.
- [ ] Renderer never emits user-provided script.
- [ ] Action endpoint uses published snapshot mapping, not client mapping.
- [ ] Form action reuses existing form validation/rate limit.
- [ ] Button workflow action validates workflow/trigger.
- [ ] Public routes do not leak stack traces.
- [ ] Page preview uses draft; published page uses published snapshot.
- [ ] Plugin Creator remains hidden from nav.

## Stability Checklist

- [ ] Page CRUD works with empty state.
- [ ] Editor handles missing selected block.
- [ ] Drag/drop cannot corrupt tree.
- [ ] Undo/redo works after insert/move/delete.
- [ ] Save failure preserves dirty changes.
- [ ] Publish failure preserves draft.
- [ ] Public submit failure keeps form values.
- [ ] Delete page handles currently opened page.
- [ ] Build passes.
- [ ] Type check passes.

## Scalability Checklist

- [ ] Max block count enforced.
- [ ] Max tree depth enforced.
- [ ] Max custom CSS length enforced.
- [ ] Payload key count/depth/size enforced.
- [ ] Repository list returns summaries, not giant HTML.
- [ ] Published snapshot separated from draft.
- [ ] Renderer is pure and testable.
- [ ] Tree utilities are pure and testable.

## Spec Coverage Review

- Page management: Tasks 2, 4, 6, 11, 12.
- Canvas/tree editor: Tasks 8, 13, 14.
- Blocks: Tasks 1, 8, 14.
- Styling/custom CSS: Tasks 1, 3, 9, 15, 19.
- Workflow integration: Tasks 5, 10, 16, 18, 20.
- Preview/publish: Tasks 3, 4, 6, 17.
- Security/stability: Tasks 1, 3, 5, 6, 19, 21.

No custom JS is included. No free-position canvas is included. Existing form schema/submission paths are reused instead of duplicated.
