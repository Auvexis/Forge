# Form Theme Renderer Design

## Goal

Add structured visual customization for public Form Trigger pages without adding custom HTML or custom CSS in this milestone.

The feature should let workflow creators control the look of generated forms through safe, typed theme options: page background, layout mode, container style, button style, typography, field style, and visual preset. The workflow engine remains responsible only for execution. Rendering and visual interpretation live in the Vue client.

## Non Goals

- No custom CSS editor.
- No custom HTML template editor.
- No JavaScript injection.
- No plugin-specific form rendering.
- No engine/core rendering logic.

## User Experience

Inside the Form Trigger editor, users can choose and tune a form theme.

The first version should expose practical controls:

- Visual preset: default floating, minimal flat, Google Forms-like.
- Page background: solid color, gradient, or image URL.
- Layout: floating, flat, full-width, centered.
- Container: background, border color, border width, radius, shadow, max width, padding.
- Button: width, shape, background color, text color, border color, hover background.
- Typography: font family, base size, weight.
- Fields: background, text color, border color, focus color, radius, spacing.

Existing forms without a theme must continue rendering with the current visual style.

## Data Model

Add a structured `formTheme` field to `WorkflowTrigger`.

The same shape must exist in:

- `client-vue/src/core/types/workflow.types.ts`
- `server/src/shared/models/workflow-types.ts`

Suggested shape:

```ts
export interface FormTheme {
  preset?: "social-media" | "minimal-flat" | "google-forms";
  layout?: "floating" | "flat" | "full-width" | "centered";
  background?: {
    type?: "solid" | "gradient" | "image";
    color?: string;
    gradient?: string;
    imageUrl?: string;
  };
  container?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    radius?: number;
    shadow?: "none" | "sm" | "md" | "lg";
    maxWidth?: number;
    padding?: number;
  };
  button?: {
    width?: "auto" | "full";
    shape?: "square" | "medium" | "pill";
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    hoverBackgroundColor?: string;
  };
  typography?: {
    fontFamily?: string;
    baseSize?: number;
    weight?: number;
  };
  fields?: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    focusColor?: string;
    radius?: number;
    spacing?: number;
  };
}
```

The server should include `theme` in the form definition response, derived from `workflow.trigger.formTheme`.

## Component Architecture

Create a form rendering folder owned by the workflow editor feature:

```text
client-vue/src/features/workflow-editor/components/form/
  FormRenderer.vue
  FormThemeProvider.vue
  FormFieldRenderer.vue
```

`FormPage.vue` stays as the route-level page. It remains responsible for:

- reading route params and query params;
- loading the form definition;
- managing submitted/loading/error state;
- submitting values.

`FormRenderer.vue` is responsible for the public form markup:

- header;
- status messages;
- fields;
- submit button;
- editor watching badge.

`FormThemeProvider.vue` converts `FormTheme` into scoped CSS variables and layout classes. It does not know about workflow execution.

`FormFieldRenderer.vue` renders one form field and emits updates. It owns input type mapping and file input handling.

`CustomFormTemplateRenderer.vue` should not be implemented in this milestone because custom HTML is explicitly out of scope. If created later, it should be isolated behind the same renderer contract and never required by the default structured renderer.

## Data Flow

1. User configures fields and theme in `TriggerEditor.vue`.
2. Workflow save persists `trigger.formTheme` with the rest of the workflow.
3. Public form route loads `GET /forms-api/:formId`.
4. Server returns title, description, fields, and theme.
5. `FormPage.vue` passes the definition to `FormRenderer.vue`.
6. `FormThemeProvider.vue` maps theme values to CSS variables.
7. User submits form through the existing `workflowsApi.submitForm` path.

## Validation And Safety

Theme values are not executable.

Validation should be conservative:

- colors accept normal CSS color strings in the client, but server validation should reject huge strings;
- image URL and gradient strings should have length limits;
- numeric values should be clamped to practical ranges;
- unknown theme keys should be ignored by rendering.

The engine should not interpret theme values. Plugins should not receive theme-specific behavior.

## Backward Compatibility

If `formTheme` is absent, `FormThemeProvider` applies `social-media`, matching the current page as closely as possible.

Existing workflows remain valid.

## Testing

Client:

- TypeScript build must pass.
- Form rendering should work with no theme.
- Form rendering should work with each preset.
- Field updates and file field behavior must remain intact.

Server:

- Build must pass.
- Form definition endpoint returns `theme`.
- Existing form submit behavior remains unchanged.

## Implementation Order

1. Add shared/client theme types.
2. Return theme from server form definition endpoint.
3. Extract current `FormPage.vue` markup into `FormRenderer.vue`, `FormThemeProvider.vue`, and `FormFieldRenderer.vue`.
4. Add theme controls to the Form Trigger section in `TriggerEditor.vue`.
5. Verify build and form route behavior.
