# TASK

## Form Theme Renderer

- [x] Task 1: Add structured form theme types to client and server models.
- [x] Task 2: Expose normalized form themes from the server form definition endpoint.
- [x] Task 3: Extract the public form page into focused renderer components.
- [x] Task 4: Add structured theme controls to the Form Trigger editor.
- [x] Task 5: Run final server/client verification.

## Future: Temporary Form Wait Node

- [x] Design a utility node that creates a temporary form in the middle of a workflow, pauses execution until submission, and expires safely.
- [x] Implement the simple in-memory temporary form session flow for the MVP.
- [x] Add expiration handling that stops the waiting workflow when the max time is reached.
- [x] Keep this feature isolated from plugin logic and avoid leaking form rendering concerns into the workflow engine core.
