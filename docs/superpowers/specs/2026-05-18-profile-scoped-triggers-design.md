# Profile-Scoped Triggers Design

## Goal

Published triggers must belong to the profile that owns the workflow. Switching profile or logging out must not stop published cron, webhook, form, or plugin-trigger workflows.

## Public URLs

Use explicit profile-scoped production URLs:

- `/p/:profileId/webhook/:webhookPath`
- `/p/:profileId/forms/:formId`
- `/p/:profileId/forms-api/:formId`

Legacy URLs can remain for draft/test and backward compatibility during migration, but new published/plugin URLs must prefer the scoped format.

## Architecture

Add a small core service responsible only for running code inside a profile database context. Route handlers resolve `profileId` first, enter that context, then call existing workflow/form/plugin services. Plugins still receive generic SDK context only; they never know about profile databases, repositories, or core internals.

Responsibilities:

- Profile runtime scope: open the requested profile databases, expose them through `AsyncLocalStorage`, and always close temporary handles.
- Trigger URL helpers: build profile-scoped webhook/form URLs from `profileId`, workflow, and trigger node.
- Trigger resolution: resolve webhook/form triggers inside the explicit profile context.
- Lifecycle: call plugin `setup()` with scoped URLs and scoped credentials.
- Validation: keep slug uniqueness profile-local, because public routing includes `profileId`.

## Data Flow

Production webhook:

1. Request hits `/p/:profileId/webhook/:webhookPath`.
2. Server validates profile exists.
3. Server enters profile database context.
4. Webhook trigger is resolved from that profile workflow DB.
5. Workflow executes using that same profile's workflows, credentials, plugin registry, app settings, and OAuth tokens.

Plugin trigger setup:

1. Publishing happens under the active profile context.
2. Lifecycle builds webhook URL with `/p/:profileId/webhook/:webhookPath`.
3. Plugin receives only `webhookUrl`, `credentials`, `tokens`, `params`, and `workflowId`.

Forms:

1. Request hits `/p/:profileId/forms/:formId` or `/p/:profileId/forms-api/:formId`.
2. Server resolves the form trigger inside the profile context.
3. Submission executes the owning workflow in the same context.

## Compatibility

Keep existing unscoped routes temporarily:

- `/webhook/:webhookPath`
- `/forms/:formId`
- `/forms-api/:formId`

They should keep current active-profile behavior for drafts/dev and old URLs. New URL generation must use scoped production URLs so new published workflows do not depend on active profile.

## Tests

Use TDD.

Required coverage:

- Webhook route executes workflow from explicit profile even when another profile is active.
- Same webhook slug can exist in two profiles and resolves by URL `profileId`.
- Plugin lifecycle setup receives scoped webhook URL.
- Form API and submission resolve by explicit profile.
- Existing active-profile tests still pass.
- Full backend suite passes.

