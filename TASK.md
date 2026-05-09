# TASK

## Form Theme Renderer

- [x] Task 1: Add structured form theme types to client and server models.
- [x] Task 2: Expose normalized form themes from the server form definition endpoint.
- [ ] Task 3: Extract the public form page into focused renderer components.
- [ ] Task 4: Add structured theme controls to the Form Trigger editor.
- [ ] Task 5: Run final server/client verification.

## Future: Temporary Form Wait Node

- [ ] Design a utility node that creates a temporary form in the middle of a workflow, pauses execution until submission, and expires safely.
- [ ] Persist paused executions and temporary form sessions so memory is released and process restarts are survivable.
- [ ] Add expiration handling that marks the waiting execution as stopped/timed out.
- [ ] Keep this feature isolated from plugin logic and avoid leaking form rendering concerns into the workflow engine core.
