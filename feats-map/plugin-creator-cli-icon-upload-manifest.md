# Plugin Creator CLI Icon Upload Manifest Plan

**Goal:** permitir que `icon`, `iconDark` e `iconLight` sejam definidos por upload no Plugin Creator e por arquivo local no Sailor CLI, sem obrigar o dev a usar URL externa.

**Architecture:** manter compatibilidade com o manifest atual. `metadata.icon`, `metadata.iconDark` e `metadata.iconLight` continuam sendo `string`, mas passam a aceitar URL, `data:image/*` pequeno ou caminho relativo dentro da pasta do plugin, como `assets/icons/icon.svg`. O backend/CLI copia arquivos para assets do plugin e nunca grava path absoluto no manifest.

**Rules:** plugin nao acessa nada fora da propria pasta. Manifest nao deve permitir `C:/...`, `/home/...`, `file://...` ou `../...`.

---

## Files

- Modify: `server/src/core/modules/plugin-creator/plugin-blueprint-types.ts`
- Modify: `server/src/core/modules/plugin-creator/plugin-blueprint-validation.ts`
- Modify: `server/src/core/modules/plugin-creator/plugin-code-generator.ts`
- Modify: `server/src/core/routes/plugin-creator.routes.ts`
- Modify: `client-vue/src/core/types/plugin-creator.types.ts`
- Modify: `client-vue/src/core/api/endpoints.ts`
- Modify: `client-vue/src/core/api/plugin-creator.api.ts`
- Modify: `client-vue/src/features/plugin-creator/stores/pluginCreator.store.ts`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorCreatePluginModal.vue`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorPluginSettings.vue`
- Modify: `client-vue/src/shared/icons/iconRendering.ts`
- Create: `server/src/core/modules/plugin-creator/plugin-icon-asset-service.ts`
- Create: `server/src/core/modules/plugin-creator/plugin-icon-asset-service.test.ts`
- Create: `server/src/core/routes/plugin-creator-icon-assets.routes.test.ts`
- Create/Modify: Sailor CLI package files when CLI location is confirmed.

---

## Manifest Contract

Recommended manifest output:

```json
{
  "metadata": {
    "icon": "assets/icons/icon.svg",
    "iconDark": "assets/icons/icon-dark.svg",
    "iconLight": "assets/icons/icon-light.svg"
  }
}
```

Allowed values:

- URL: `https://cdn.example.com/icon.svg`
- Data URI: `data:image/svg+xml;base64,...`
- Plugin-relative asset: `assets/icons/icon.svg`

Blocked values:

- `C:/Users/dev/icon.svg`
- `/Users/dev/icon.svg`
- `file:///Users/dev/icon.svg`
- `../outside.svg`
- `../../core/secret.svg`

---

## Task 1: Icon Asset Service

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-icon-asset-service.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-icon-asset-service.test.ts`

- [ ] Write tests for accepted icon files: `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`.
- [ ] Write tests blocking absolute paths, `file://`, path traversal and unsupported extensions.
- [ ] Implement `savePluginIconAsset({ profilePaths, blueprintId, slot, filename, buffer })`.
- [ ] Save files under `blueprint/assets/icons/`.
- [ ] Return manifest-safe path: `assets/icons/<slot>.<ext>`.
- [ ] Run:

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-icon-asset-service.test.ts
```

- [ ] Commit:

```bash
git add server/src/core/modules/plugin-creator/plugin-icon-asset-service.ts server/src/core/modules/plugin-creator/plugin-icon-asset-service.test.ts
git commit -m "feat: add plugin creator icon asset service"
```

---

## Task 2: Backend Upload Route

**Files:**
- Modify: `server/src/core/routes/plugin-creator.routes.ts`
- Test: `server/src/core/routes/plugin-creator-icon-assets.routes.test.ts`

- [ ] Add route:

```text
POST /plugin-creator/blueprints/:id/assets/icons/:slot
```

Valid `slot`:

- `icon`
- `iconDark`
- `iconLight`

- [ ] Route must require multipart upload with one file.
- [ ] Enforce small limit for icon upload, max `1MB`, independent from global multipart limit.
- [ ] Save file through `plugin-icon-asset-service`.
- [ ] Update blueprint `icons[slot]` with returned relative path.
- [ ] Return updated blueprint.
- [ ] Test success upload.
- [ ] Test invalid slot.
- [ ] Test invalid file extension.
- [ ] Test path traversal filename.
- [ ] Run:

```bash
cd server
node --test src/core/routes/plugin-creator-icon-assets.routes.test.ts
```

- [ ] Commit:

```bash
git add server/src/core/routes/plugin-creator.routes.ts server/src/core/routes/plugin-creator-icon-assets.routes.test.ts
git commit -m "feat: upload plugin creator icon assets"
```

---

## Task 3: Manifest And Generator Safety

**Files:**
- Modify: `server/src/core/modules/plugin-creator/plugin-blueprint-validation.ts`
- Modify: `server/src/core/modules/plugin-creator/plugin-code-generator.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-blueprint-validation.test.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-code-generator.test.ts`

- [ ] Add icon value validation for URL, data URI or plugin-relative asset.
- [ ] Block absolute paths, `file://` and path traversal.
- [ ] Fix generator to copy `assets/icons/icon.svg` from blueprint assets without producing `assets/assets/icons/icon.svg`.
- [ ] Keep old values like `icon.svg` working if already stored by old drafts.
- [ ] Run:

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-blueprint-validation.test.ts src/core/modules/plugin-creator/plugin-code-generator.test.ts
```

- [ ] Commit:

```bash
git add server/src/core/modules/plugin-creator/plugin-blueprint-validation.ts server/src/core/modules/plugin-creator/plugin-code-generator.ts server/src/core/modules/plugin-creator/plugin-blueprint-validation.test.ts server/src/core/modules/plugin-creator/plugin-code-generator.test.ts
git commit -m "fix: normalize plugin creator icon asset paths"
```

---

## Task 4: Frontend API And Store

**Files:**
- Modify: `client-vue/src/core/types/plugin-creator.types.ts`
- Modify: `client-vue/src/core/api/endpoints.ts`
- Modify: `client-vue/src/core/api/plugin-creator.api.ts`
- Modify: `client-vue/src/features/plugin-creator/stores/pluginCreator.store.ts`

- [ ] Add type:

```ts
export type PluginBlueprintIconSlot = 'icon' | 'iconDark' | 'iconLight'
```

- [ ] Add endpoint builder for icon upload.
- [ ] Add API method:

```ts
uploadIcon(id: string, slot: PluginBlueprintIconSlot, file: File): Promise<PluginBlueprint>
```

- [ ] Add store action:

```ts
async function uploadIcon(slot: PluginBlueprintIconSlot, file: File)
```

- [ ] Update local active blueprint after upload.
- [ ] Add contract tests for endpoint/API shape if existing API tests cover this layer.
- [ ] Run:

```bash
cd client-vue
npm run type-check
```

- [ ] Commit:

```bash
git add client-vue/src/core/types/plugin-creator.types.ts client-vue/src/core/api/endpoints.ts client-vue/src/core/api/plugin-creator.api.ts client-vue/src/features/plugin-creator/stores/pluginCreator.store.ts
git commit -m "feat: add plugin creator icon upload client API"
```

---

## Task 5: Plugin Creator UI

**Files:**
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorCreatePluginModal.vue`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorPluginSettings.vue`

- [ ] Replace URL-only icon fields with upload-first control.
- [ ] Keep URL input as advanced/manual option.
- [ ] Show preview for URL, data URI and uploaded relative asset.
- [ ] For new plugin modal, use local object URL preview before blueprint exists.
- [ ] After create, upload selected files and update blueprint.
- [ ] In settings modal, upload immediately through store action.
- [ ] Add remove/replace icon actions.
- [ ] Run:

```bash
cd client-vue
npm run type-check
```

- [ ] Commit:

```bash
git add client-vue/src/features/plugin-creator/components/PluginCreatorCreatePluginModal.vue client-vue/src/features/plugin-creator/components/PluginCreatorPluginSettings.vue
git commit -m "feat: add plugin creator icon upload UI"
```

---

## Task 6: Icon Rendering

**Files:**
- Modify: `client-vue/src/shared/icons/iconRendering.ts`
- Test: `client-vue/src/shared/icons/__tests__/iconRendering.test.ts`

- [ ] Ensure icon renderer treats these as image values:

```text
https://...
/...
data:image/...
assets/icons/icon.svg
icon.svg
```

- [ ] Add test for plugin-relative icon path.
- [ ] Confirm Lucide fallback still works for names like `plug`.
- [ ] Run:

```bash
cd client-vue
node --test src/shared/icons/__tests__/iconRendering.test.ts
```

- [ ] Commit:

```bash
git add client-vue/src/shared/icons/iconRendering.ts client-vue/src/shared/icons/__tests__/iconRendering.test.ts
git commit -m "fix: render plugin relative icon assets"
```

---

## Task 7: Sailor CLI Support

**Files:**
- Create/Modify CLI files after locating package.
- Test CLI manifest pack/validate command.

- [ ] Locate Sailor CLI package. Current workspace search did not show it under `client-vue/` or `server/`.
- [ ] Add flags:

```bash
sailor plugin pack --icon ./icon.svg --icon-dark ./icon-dark.svg --icon-light ./icon-light.svg
```

- [ ] Copy files into plugin output:

```text
assets/icons/icon.svg
assets/icons/icon-dark.svg
assets/icons/icon-light.svg
```

- [ ] Rewrite manifest fields to relative paths.
- [ ] Validate same blocked values as backend.
- [ ] Add CLI tests for copy, rewrite and invalid path.
- [ ] Commit CLI changes after tests pass.

---

## Task 8: Full Verification

- [ ] Run server tests:

```bash
cd server
npm run build
node --test src/core/modules/plugin-creator/plugin-icon-asset-service.test.ts src/core/routes/plugin-creator-icon-assets.routes.test.ts src/core/modules/plugin-creator/plugin-blueprint-validation.test.ts src/core/modules/plugin-creator/plugin-code-generator.test.ts
```

- [ ] Run frontend tests/typecheck:

```bash
cd client-vue
npm run type-check
node --test src/shared/icons/__tests__/iconRendering.test.ts
```

- [ ] Manual QA:
  - Create plugin with uploaded icon.
  - Upload dark icon.
  - Upload light icon.
  - Save draft.
  - Generate preview.
  - Export ZIP.
  - Confirm ZIP contains `assets/icons/*`.
  - Confirm `manifest.json` contains relative paths.
  - Install exported plugin.
  - Confirm icon renders in Plugin list, Settings, Command Palette and Workflow Editor.

- [ ] Commit final QA docs if needed.

---

## Risk Notes

- Do not embed large base64 images in `manifest.json`; it bloats plugin metadata.
- Do not allow absolute local paths; it breaks plugin portability and isolation.
- SVG must be rendered as image only. Do not inline SVG into DOM.
- Existing CDN icons must keep working.
- Existing Lucide icon names must keep working.

