# Official Utility Node Pack And Manifest TS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Sailor utility node metadata and styling out of frontend hardcode into a typed official core utility-node pack, while keeping execution inside core and preparing a safe path for plugin `manifest.ts` authoring.

**Architecture:** Utility nodes remain core-owned because they depend on core workflow services. A new `UtilityNodePack` layer owns node catalog metadata, style, categories, labels, and typed manifest helpers; the existing node handlers continue to execute through `NodeHandlerRegistry`. Frontend reads a workflow node catalog endpoint and uses it for Add Node UI, Guide Book previews, and future node rendering.

**Tech Stack:** TypeScript, Vue 3, Fastify routes, existing workflow node handlers, existing command/API patterns, Node test runner.

**Progress 2026-06-09:** Tasks 1-9 were implemented or documented. Commit steps were intentionally skipped because the workspace already contains unrelated dirty/untracked changes, and mixing those into feature commits would be unsafe. Task 10 verification is the remaining close-out step.

---

## Key Decisions

- Do **not** turn core utility nodes into normal plugins.
- Do **not** put core-aware code under `server/src/plugins/`.
- Create a separate official package concept under `server/src/core/utility-nodes/`.
- Runtime plugin loading keeps `manifest.json`.
- Future `manifest.ts` is a developer authoring source that compiles to `manifest.json`, not the external plugin runtime artifact.
- Frontend must stop hardcoding utility node icon/color/category once catalog endpoint exists.

---

## File Map

- Create: `server/src/core/utility-nodes/utility-node-pack.types.ts`
  - Owns typed utility node pack contracts, style metadata, and catalog DTOs.
- Create: `server/src/core/utility-nodes/define-utility-node-pack.ts`
  - Tiny typed identity helper for `manifest.ts` files.
- Create: `server/src/core/utility-nodes/sailor-core/manifest.ts`
  - Official Sailor Core utility node metadata and style.
- Create: `server/src/core/utility-nodes/sailor-core/index.ts`
  - Combines manifest metadata with existing core node handlers.
- Create: `server/src/core/utility-nodes/utility-node-catalog.ts`
  - Exports catalog list used by backend routes and tests.
- Modify: `server/src/core/nodes/registry.ts`
  - Builds handler registry from official utility node pack entries.
- Create: `server/src/core/utility-nodes/utility-node-pack.test.ts`
  - Tests manifest coverage and handler alignment.
- Modify: `server/src/core/modules/workflows/workflow-schema.ts`
  - Uses catalog metadata for utility node schema display fields.
- Create: `server/src/core/routes/workflow-node-catalog.routes.ts`
  - Exposes `GET /workflow-nodes/catalog`.
- Create: `server/src/core/routes/workflow-node-catalog.routes.test.ts`
  - Tests response shape and style fields.
- Modify: `server/src/core/server.ts`
  - Registers the catalog route.
- Create: `client-vue/src/core/api/workflowNodes.api.ts`
  - Frontend API client for utility node catalog.
- Create: `client-vue/src/core/types/workflow-node-catalog.types.ts`
  - Frontend DTO types.
- Modify: `client-vue/src/core/api/endpoints.ts`
  - Adds `WORKFLOW_NODE_CATALOG`.
- Modify: `client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts`
  - Accepts backend-provided utility presets.
- Modify: `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
  - Loads utility catalog and removes local `LOGIC_NODES` hardcode.
- Modify: `client-vue/src/shared/start-guide/previews/UtilityNodesGuidePreview.vue`
  - Uses frontend utility catalog API instead of local hardcoded node list.
- Create/modify tests:
  - `client-vue/src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts`
  - `client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`
  - `client-vue/src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
- Future SDK/CLI phase files, separate repository/package if present:
  - `sailor-sdk`: add `definePluginManifest()`.
  - `sailor-cli`: compile/validate `manifest.ts` into `manifest.json`.

---

## Task 1: Define Utility Node Pack Types

**Files:**
- Create: `server/src/core/utility-nodes/utility-node-pack.types.ts`
- Create: `server/src/core/utility-nodes/define-utility-node-pack.ts`
- Create: `server/src/core/utility-nodes/utility-node-pack.test.ts`

- [ ] **Step 1: Write failing type contract test**
  - Create `server/src/core/utility-nodes/utility-node-pack.test.ts`.
  - Test should assert the files exist and export these names:
    - `UtilityNodePack`
    - `UtilityNodeManifestEntry`
    - `UtilityNodeStyle`
    - `UtilityNodeCatalogItem`
    - `defineUtilityNodePack`
  - Include assertions that `UtilityNodeStyle` supports `icon`, `iconColor`, `bgColor`, and `borderColor`.

- [ ] **Step 2: Run failing test**
  - Run: `cd server; node --test --import ts-node/register src/core/utility-nodes/utility-node-pack.test.ts`
  - Expected: fail because utility-node pack files do not exist.

- [ ] **Step 3: Implement utility node pack types**
  - Add `UtilityNodeStyle`.
  - Add `UtilityNodeManifestEntry`.
  - Add `UtilityNodePack`.
  - Add `UtilityNodeCatalogItem`.
  - Use `UtilityNodeType` from `server/src/core/nodes/types.ts`.
  - Do not import plugin SDK types.

- [ ] **Step 4: Implement define helper**
  - Add `defineUtilityNodePack(pack: UtilityNodePack): UtilityNodePack`.
  - Keep it as an identity function.

- [ ] **Step 5: Run test**
  - Run: `cd server; node --test --import ts-node/register src/core/utility-nodes/utility-node-pack.test.ts`
  - Expected: pass.

- [ ] **Step 6: Commit**
  - Commit message: `feat: add utility node pack types`

## Task 2: Add Sailor Core Utility Node Manifest

**Files:**
- Create: `server/src/core/utility-nodes/sailor-core/manifest.ts`
- Modify: `server/src/core/utility-nodes/utility-node-pack.test.ts`

- [ ] **Step 1: Write failing manifest coverage test**
  - Test imports `sailorCoreUtilityNodePack`.
  - Assert pack id is `sailor-core`.
  - Assert it contains entries for:
    - `trigger`
    - `code`
    - `http`
    - `if`
    - `switch`
    - `loop`
    - `merge`
    - `split-in-batches`
    - `set`
    - `event`
    - `event-listener`
    - `subworkflow`
    - `respond-webhook`
    - `wait-form`
    - `ai-agent`
    - `ai-model`
    - `ai-memory`
    - `ai-tool`
  - Assert every entry has `label`, `description`, `category`, and `style.icon`.

- [ ] **Step 2: Run failing test**
  - Run: `cd server; node --test --import ts-node/register src/core/utility-nodes/utility-node-pack.test.ts`
  - Expected: fail because manifest does not exist.

- [ ] **Step 3: Create manifest**
  - Add one metadata entry per existing utility node type.
  - Use categories compatible with frontend plugin categories:
    - `AI`
    - `Core`
    - `Flow`
    - `Data transformation`
    - `Developer`
  - Include explicit style for every node:
    - `icon`
    - `iconColor`
    - `bgColor`
    - `borderColor`

- [ ] **Step 4: Run test**
  - Run: `cd server; node --test --import ts-node/register src/core/utility-nodes/utility-node-pack.test.ts`
  - Expected: pass.

- [ ] **Step 5: Commit**
  - Commit message: `feat: add sailor core utility node manifest`

## Task 3: Connect Utility Manifest To Existing Handlers

**Files:**
- Create: `server/src/core/utility-nodes/sailor-core/index.ts`
- Modify: `server/src/core/nodes/registry.ts`
- Modify: `server/src/core/utility-nodes/utility-node-pack.test.ts`

- [ ] **Step 1: Write failing handler alignment test**
  - Assert every manifest node has a handler.
  - Assert every default handler has manifest metadata.
  - Assert `createUtilityNodeRegistry().list()` returns metadata labels from the manifest.
  - Assert execution still uses existing handler functions.

- [ ] **Step 2: Run failing test**
  - Run: `cd server; node --test --import ts-node/register src/core/utility-nodes/utility-node-pack.test.ts src/core/nodes/registry.test.ts`
  - Expected: fail because registry still owns metadata manually.

- [ ] **Step 3: Create Sailor Core index**
  - Import all existing handlers from `server/src/core/nodes/handlers/*.ts`.
  - Import `sailorCoreUtilityNodePack`.
  - Export `sailorCoreUtilityNodes`, an array of `{ manifest, handler }`.
  - Keep handler code unchanged.

- [ ] **Step 4: Refactor registry**
  - Replace local `utilityNodeTypes` and `defaultUtilityHandlers` with data from `sailorCoreUtilityNodes`.
  - Preserve `NodeHandlerRegistry` public API.
  - Preserve duplicate type validation.

- [ ] **Step 5: Run tests**
  - Run: `cd server; node --test --import ts-node/register src/core/utility-nodes/utility-node-pack.test.ts src/core/nodes/registry.test.ts src/core/nodes/handler-contract.test.ts`
  - Expected: pass.

- [ ] **Step 6: Commit**
  - Commit message: `refactor: build utility node registry from core pack`

## Task 4: Add Backend Utility Node Catalog

**Files:**
- Create: `server/src/core/utility-nodes/utility-node-catalog.ts`
- Create: `server/src/core/routes/workflow-node-catalog.routes.ts`
- Create: `server/src/core/routes/workflow-node-catalog.routes.test.ts`
- Modify: `server/src/core/server.ts`

- [ ] **Step 1: Write failing route test**
  - Test `GET /workflow-nodes/catalog`.
  - Assert response includes `type`, `label`, `description`, `category`, `style`, and `packId`.
  - Assert `style.iconColor`, `style.bgColor`, and `style.borderColor` are present for `code`.
  - Assert no handler implementation details are returned.

- [ ] **Step 2: Run failing test**
  - Run: `cd server; node --test --import ts-node/register src/core/routes/workflow-node-catalog.routes.test.ts`
  - Expected: fail because route does not exist.

- [ ] **Step 3: Implement catalog helper**
  - Export `listUtilityNodeCatalogItems()`.
  - Map `sailorCoreUtilityNodePack.nodes` into DTOs.
  - Sort by category then label for stable frontend rendering.

- [ ] **Step 4: Implement route**
  - Add Fastify route file.
  - Register `GET /workflow-nodes/catalog`.
  - Return `{ nodes: listUtilityNodeCatalogItems() }`.

- [ ] **Step 5: Register route**
  - Import and register route in `server/src/core/server.ts`.

- [ ] **Step 6: Run tests**
  - Run: `cd server; node --test --import ts-node/register src/core/routes/workflow-node-catalog.routes.test.ts`
  - Run: `cd server; npm run build`
  - Expected: pass.

- [ ] **Step 7: Commit**
  - Commit message: `feat: expose utility node catalog`

## Task 5: Use Catalog In Workflow Schema Metadata

**Files:**
- Modify: `server/src/core/modules/workflows/workflow-schema.ts`
- Create or modify: `server/src/core/modules/workflows/workflow-schema.test.ts`

- [ ] **Step 1: Write failing workflow schema test**
  - Assert utility node schema for `code` uses catalog label/icon/style.
  - Assert plugin node metadata still comes from plugin manifest.
  - Assert missing catalog entry falls back safely to node type.

- [ ] **Step 2: Run failing test**
  - Run: `cd server; node --test --import ts-node/register src/core/modules/workflows/workflow-schema.test.ts`
  - Expected: fail until workflow schema reads utility catalog.

- [ ] **Step 3: Implement catalog lookup**
  - Add a small helper in `workflow-schema.ts` that resolves utility node catalog item by type.
  - Do not import frontend types.
  - Do not route plugin nodes through utility catalog.

- [ ] **Step 4: Run test**
  - Run: `cd server; node --test --import ts-node/register src/core/modules/workflows/workflow-schema.test.ts`
  - Expected: pass.

- [ ] **Step 5: Commit**
  - Commit message: `feat: use utility catalog in workflow schema`

## Task 6: Add Frontend API And Types

**Files:**
- Create: `client-vue/src/core/types/workflow-node-catalog.types.ts`
- Create: `client-vue/src/core/api/workflowNodes.api.ts`
- Modify: `client-vue/src/core/api/endpoints.ts`
- Create: `client-vue/src/core/api/__tests__/workflowNodes.api.contract.test.ts`

- [ ] **Step 1: Write failing frontend API contract**
  - Assert endpoint `WORKFLOW_NODE_CATALOG` exists.
  - Assert API file exports `workflowNodesApi.getCatalog`.
  - Assert type file exports `WorkflowNodeCatalogItem` and `WorkflowNodeStyle`.

- [ ] **Step 2: Run failing test**
  - Run: `cd client-vue; node --test src/core/api/__tests__/workflowNodes.api.contract.test.ts`
  - Expected: fail because API/types do not exist.

- [ ] **Step 3: Implement types**
  - Add `WorkflowNodeStyle`.
  - Add `WorkflowNodeCatalogItem`.
  - Add `WorkflowNodeCatalogResponse`.
  - Keep fields aligned with backend DTO.

- [ ] **Step 4: Implement API client**
  - Add `workflowNodesApi.getCatalog()`.
  - Use existing `apiClient` pattern from nearby API files.

- [ ] **Step 5: Run test and type-check**
  - Run: `cd client-vue; node --test src/core/api/__tests__/workflowNodes.api.contract.test.ts`
  - Run: `cd client-vue; npm run type-check`
  - Expected: pass.

- [ ] **Step 6: Commit**
  - Commit message: `feat: add workflow node catalog api`

## Task 7: Replace Add Node Utility Hardcode With Catalog

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`

- [ ] **Step 1: Write failing Add Node contracts**
  - Assert `AddNodePanel.vue` imports `workflowNodesApi`.
  - Assert `AddNodePanel.vue` no longer declares local `LOGIC_NODES`.
  - Assert utility presets are derived from catalog items.
  - Assert plugin nodes still come from `pluginsApi`.

- [ ] **Step 2: Run failing tests**
  - Run: `cd client-vue; node --test src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`
  - Expected: fail until Add Node panel uses catalog API.

- [ ] **Step 3: Extend picker model**
  - Add adapter function `catalogItemsToPickerPresets(items)`.
  - Preserve `AddNodePickerPreset` shape.
  - Copy `style` from catalog into preset.
  - Keep plugin category logic unchanged.

- [ ] **Step 4: Load catalog in AddNodePanel**
  - Use `useApi(workflowNodesApi.getCatalog)`.
  - Call catalog load in `onMounted`.
  - `pickerPresets` should use catalog utility presets plus AI/memory context-specific presets as needed.

- [ ] **Step 5: Render styles**
  - If `AddNodePickerItem.vue` already supports style props, pass them.
  - If not, add optional `styleMeta` prop in `AddNodePickerItem.vue`.
  - Use catalog `icon`, `iconColor`, `bgColor`, `borderColor`.

- [ ] **Step 6: Run tests and type-check**
  - Run: `cd client-vue; node --test src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts`
  - Run: `cd client-vue; npm run type-check`
  - Expected: pass.

- [ ] **Step 7: Commit**
  - Commit message: `feat: drive add node utility presets from catalog`

## Task 8: Use Catalog In Start Guide Utility Preview

**Files:**
- Modify: `client-vue/src/shared/start-guide/previews/UtilityNodesGuidePreview.vue`
- Modify: `client-vue/src/shared/start-guide/__tests__/startGuideController.contract.test.ts`

- [ ] **Step 1: Write failing StartGuide preview contract**
  - Assert preview imports `workflowNodesApi`.
  - Assert preview does not declare local hardcoded node array.
  - Assert preview renders catalog `style.icon` and colors.
  - Assert localized descriptions still exist in the component for guide copy.

- [ ] **Step 2: Run failing test**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Expected: fail until preview uses catalog API.

- [ ] **Step 3: Refactor preview**
  - Load catalog on mount.
  - Render catalog items.
  - Use catalog label/icon/style.
  - Keep local translation map only for tutorial-specific long descriptions.
  - If catalog fails, show a quiet empty state instead of hardcoded fallback.

- [ ] **Step 4: Run tests and type-check**
  - Run: `cd client-vue; node --test src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Run: `cd client-vue; npm run type-check`
  - Expected: pass.

- [ ] **Step 5: Commit**
  - Commit message: `feat: use utility catalog in start guide preview`

## Task 9: Manifest TS Authoring Strategy For Plugins

**Files:**
- Create: `feats-map/plugin-manifest-ts-authoring-plan-2026-06-09.md`
- No production code in this task.

- [ ] **Step 1: Write separate migration plan**
  - Create a separate plan for SDK/CLI/plugin migration.
  - Include phases:
    - SDK `definePluginManifest()`.
    - CLI builds `manifest.ts` to `manifest.json`.
    - Runtime keeps loading `manifest.json`.
    - Internal plugins migrate one by one.
    - External installer keeps release validation on `manifest.json`.

- [ ] **Step 2: Include risk guardrails**
  - State clearly that plugin runtime must not execute arbitrary `manifest.ts` from external packages during preview.
  - State clearly that `manifest.ts` is source, `manifest.json` is artifact.

- [ ] **Step 3: Commit**
  - Commit message: `docs: plan plugin manifest ts authoring`

## Task 10: Full Verification

**Files:**
- No new files expected.

- [ ] **Step 1: Backend tests**
  - Run: `cd server; node --test --import ts-node/register src/core/utility-nodes/utility-node-pack.test.ts src/core/routes/workflow-node-catalog.routes.test.ts src/core/nodes/registry.test.ts src/core/nodes/handler-contract.test.ts src/core/modules/workflows/workflow-schema.test.ts`
  - Expected: pass.

- [ ] **Step 2: Backend build**
  - Run: `cd server; npm run build`
  - Expected: pass.

- [ ] **Step 3: Frontend tests**
  - Run: `cd client-vue; node --test src/core/api/__tests__/workflowNodes.api.contract.test.ts src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts src/shared/start-guide/__tests__/startGuideController.contract.test.ts`
  - Expected: pass.

- [ ] **Step 4: Frontend type-check/build**
  - Run: `cd client-vue; npm run type-check`
  - Run: `cd client-vue; npm run build`
  - Expected: pass.

- [ ] **Step 5: Manual QA**
  - Start backend and frontend.
  - Open workflow editor.
  - Open Add Node panel.
  - Confirm utility nodes show catalog icons/colors.
  - Confirm plugin nodes still load from plugins.
  - Open Guide Book utility nodes tutorial.
  - Confirm same icons/colors appear there.
  - Run one workflow with utility nodes to confirm execution path did not change.

- [ ] **Step 6: Commit verification cleanup if needed**
  - Commit message if files changed: `test: verify utility node catalog`

---

## Self-Review

- Spec coverage:
  - Utility nodes not normal plugins: covered in Key Decisions and Tasks 1-4.
  - Utility metadata/style no longer frontend-hardcoded: covered in Tasks 4, 7, and 8.
  - Core execution remains core-owned: covered in Tasks 3 and 10.
  - Manifest.ts approach: covered in Task 9 as a separate safe migration plan.
  - SRP: types, manifest, registry, route, API, UI adapter, and tutorial preview are separated.
- Placeholder scan:
  - No TODO/TBD placeholders.
  - No vague “handle edge cases” steps.
- Type consistency:
  - Backend DTO: `UtilityNodeCatalogItem`.
  - Frontend DTO: `WorkflowNodeCatalogItem`.
  - Style shape consistently uses `icon`, `iconColor`, `bgColor`, `borderColor`.
