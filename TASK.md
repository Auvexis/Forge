# TASK

## Guardrails

- Plugin-specific behavior must not leak into the core workflow engine.
- Keep Form Trigger behavior generic and owned by the form trigger/editor surfaces.
- Mark each important task complete after implementation, verification, and commit.

## Tasks

- [x] 1. Give Form Trigger its own icon, icon color, background color, and border color on the trigger node.
- [ ] 2. Make manual Run wait for Form Trigger submission before continuing execution.
- [ ] 3. Render the public/test Form page from the frontend instead of server-generated HTML.
- [ ] 4. Make `BaseSelect` dropdown escape parent `overflow: hidden` and render above clipped containers.
- [ ] 5. Fix all client and server typecheck bugs.

## Verification

- [ ] `client-vue` typecheck passes.
- [ ] `server` build/typecheck passes.
- [ ] Relevant Form Trigger and Select UI flows are manually checked.
