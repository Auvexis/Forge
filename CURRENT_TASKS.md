# Current Tasks

> Rule: plugin-specific behavior must not leak into the workflow engine core.
> Each major feature is marked complete only after verification and commit.

## Architecture Notes

- Keep workflow execution behavior in the core engine generic.
- Keep plugin parameter rendering driven by manifest schema and shared UI components.
- Keep plugin method behavior inside plugin packages.
- Route all user-facing errors, alerts, and operation messages through the global toast layer.

## Tasks

- [x] 1. Fix Output `JsonTreeView` wrapping and horizontal overflow for very large results.
- [x] 2. When a single node runs via Run Step, show its result in Output and make it available as input for downstream nodes.
- [x] 3. Remove the Output error box from `NodeInspectorModal` and send all errors/messages/alerts to the global toast.
- [x] 4. Replace raw `<input>` elements in Vue files with `BaseInput.vue`.
- [x] 5. Add the Wooby effect to the bottom navbar area of the main sidebar where Settings lives.
- [x] 6. Add the missing `BaseInput.vue` Step Name field to the Code Block node/editor.
- [x] 7. Install and add Monaco Editor with a custom Nod8 theme for code authoring.
- [x] 8. Support manifest parameter input type `code` with Monaco Editor instead of a plain input/textarea.
- [x] 9. Convert the interface copy to EN-US.

## Verification

- [ ] Client type-check/build passes. `npm run build` generates the Vite bundle, but fails during `vue-tsc` on existing type errors in `WorkflowEditorPage.vue`, `node-types.ts`, `RespondToWebhookEditor.vue`, and `SetEditor.vue`.
- [ ] Server type-check/build passes. `npm run build` fails on existing AJV typing errors in `server/src/core/modules/plugins/validator.ts`.
- [x] Relevant UI shell is manually checked in browser. `http://127.0.0.1:23802/workflows` loads; backend-dependent data fetches fail because the API server is not running.
