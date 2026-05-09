# Form Theme Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured theme controls for public Form Trigger pages without custom CSS or custom HTML.

**Architecture:** Persist `trigger.formTheme` with workflow data, expose it through the existing form definition endpoint, and render it only in Vue form renderer components. The workflow engine and plugin system do not interpret visual settings.

**Tech Stack:** Vue 3, TypeScript, Vite, Fastify, existing workflow JSON model.

---

### Task 1: Tracking And Types

**Files:**
- Create/modify: `TASK.md`
- Modify: `client-vue/src/core/types/workflow.types.ts`
- Modify: `server/src/shared/models/workflow-types.ts`
- Modify: `client-vue/src/core/api/workflows.api.ts`

- [ ] Create `TASK.md` with the Form Theme Renderer checklist and the future Temporary Form Wait node note.
- [ ] Add `FormTheme` types to the client workflow model.
- [ ] Add equivalent `FormTheme` types to the server shared workflow model.
- [ ] Add `theme: FormTheme` to the client `FormDefinition` response type.
- [ ] Run `npm run build` in `client-vue` and `npm run build` in `server`.
- [ ] Mark Task 1 complete in `TASK.md` and commit `feat(forms): add structured form theme types`.

### Task 2: Server Form Definition

**Files:**
- Modify: `server/src/core/routes/workflows.routes.ts`

- [ ] Add conservative theme normalization helpers near existing Form Trigger helpers.
- [ ] Include `theme` in `formDefinition(workflow, mode)`.
- [ ] Keep the existing submit path unchanged.
- [ ] Run `npm run build` in `server`.
- [ ] Mark Task 2 complete in `TASK.md` and commit `feat(server): expose form theme definitions`.

### Task 3: Vue Form Renderer Components

**Files:**
- Modify: `client-vue/src/app/pages/FormPage.vue`
- Create: `client-vue/src/features/workflow-editor/components/form/FormRenderer.vue`
- Create: `client-vue/src/features/workflow-editor/components/form/FormThemeProvider.vue`
- Create: `client-vue/src/features/workflow-editor/components/form/FormFieldRenderer.vue`

- [ ] Move public form markup out of `FormPage.vue` into `FormRenderer.vue`.
- [ ] Move one-field rendering into `FormFieldRenderer.vue`.
- [ ] Add `FormThemeProvider.vue` to map `FormTheme` into scoped CSS variables and layout classes.
- [ ] Preserve loading, submit, success, file field, and editor-watching behavior.
- [ ] Run `npm run build` in `client-vue`.
- [ ] Mark Task 3 complete in `TASK.md` and commit `feat(client): render themed form trigger pages`.

### Task 4: Trigger Editor Theme Controls

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/TriggerEditor.vue`

- [ ] Add Form Theme controls inside the existing Form Trigger editor section.
- [ ] Support preset, layout, background, container, button, typography, and field options.
- [ ] Use structured updates to `trigger.formTheme`.
- [ ] Run `npm run build` in `client-vue`.
- [ ] Mark Task 4 complete in `TASK.md` and commit `feat(client): add form theme controls`.

### Task 5: Final Verification

**Files:**
- Modify: `TASK.md`

- [ ] Run `npm run build` in `server`.
- [ ] Run `npm run build` in `client-vue`.
- [ ] Verify `git status --short` only contains expected pre-existing user changes.
- [ ] Mark final verification complete in `TASK.md` and commit `chore: complete form theme renderer tasks`.
