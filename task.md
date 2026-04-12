# Forge V2 Implementation Tasks

## Phase 1: JSON Schema-First Parameter System
- [x] 1.1 — Upgrade `PluginMethodParam` in `plugin-types.ts` to JSON Schema
- [x] 1.1 — Migrate `google-drive/manifest.json` parameters (11 methods)
- [x] 1.1 — Migrate `google-youtube/manifest.json` parameters (27 methods)
- [x] 1.1 — Update `executor.ts` param-cooking to use `format: "binary"` + `x-input-type: "file"`
- [x] 1.1 — Update client `plugin.ts` types to match new schema shape
- [x] 1.2 — Update `NodeEditorPanel.tsx` to read from `parameters.properties` + `required[]`
- [x] 1.3 — Add `getPropertyLabel()` and `getDisplayType()` helpers to `getSchemaProperties.ts`
- [x] 1.3 — Update `CardRenderer.tsx` to use `x-forge-display` (with `x-type` fallback)
- [x] 1.3 — Update `TableRenderer.tsx` to use `getPropertyLabel`

## Phase 2: Remove Hardcoded Type Checks ← NEXT
- [ ] 2.1 — Refactor `CardRenderer.tsx` to single generic renderer (collapse 3 branches → 1)
- [ ] 2.2 — Extract node sub-editors from `NodeEditorPanel.tsx` into `node-editors/` registry
- [ ] 2.3 — Remove leftover file-object heuristics in `executor.ts`

## Phase 3: Standardized Manifest & Developer Onboarding
- [x] 3.1 — Create `forge-manifest.schema.json` meta-schema
- [x] 3.2 — Enhance `loader.ts` with structural manifest validation + skip `_template`
- [x] 3.3 — Create `plugins/_template/` developer template (index.ts, manifest.json, methods.ts)

## Phase 4: Secure Credential Vault
- [x] 4.1 — Create `vault.ts` ENV-based secret resolver (`FORGE_PLUGIN_{ID}_{FIELD}`)
- [x] 4.2 — Update `executor.ts` to merge ENV credentials via `Vault.mergeWithStored`
- [x] 4.3 — Update `plugins.routes.ts`: expose `locked_fields`, block ENV field overwrite
- [x] 4.4 — Update `PluginMenuAuth.tsx` with ENV-locked field indicator badge

## Phase 5: Intelligent Variable Mapping
- [ ] 5.1 — Create `schemaResolver.ts` recursive schema tree utility
- [ ] 5.2 — Replace flat variable buttons with searchable tree in `NodeEditorPanel`
