# Call Workflow Node

Feature map for replacing the old `SubWorkflow` node with a new `Call Workflow` utility node.
`Call Workflow` invokes a published workflow through a selected callable trigger.
Only `manual`, `form`, and `webhook` triggers are callable.
When connected to an `AI Agent`, it behaves like a normal agent tool: the LLM only sees the public tool name, description, and non-hardcoded parameters.
Workflow id, trigger id, internal workflow logic, and hardcoded/default fields stay hidden from the LLM.

## Batch 1 - Contracts
- [x] Replace `subworkflow` with `call-workflow` in shared workflow types.
- [x] Add callable trigger metadata types.
- [x] Add migration path for old `subworkflow` nodes.
- [x] Add backend and frontend contract tests.
- [x] Commit.

## Batch 2 - Backend Runtime
- [x] Add `call-workflow` handler.
- [x] Restrict target triggers to `manual`, `form`, and `webhook`.
- [x] Require target workflow to be published.
- [x] Merge hardcoded defaults with runtime inputs.
- [x] Return child execution status and output.
- [x] Remove old `subworkflow` handler.
- [x] Commit.

## Batch 3 - Agent Tool Adapter
- [x] Expose `call-workflow` as `agent-tool`.
- [x] Hide workflow, trigger, and hardcoded fields from the LLM.
- [x] Generate tool schema from callable trigger schema.
- [x] Execute target workflow from agent loop.
- [x] Add approval and timeout handling.
- [x] Commit.

## Batch 4 - Callable Workflow API
- [x] Add callable workflows endpoint.
- [x] List only published workflows.
- [x] List only callable triggers.
- [x] Normalize `manual`, `form`, and `webhook` inputs.
- [x] Include trigger icon, id, name, type, and schema.
- [x] Add route tests.
- [x] Commit.

## Batch 5 - Frontend Node Catalog
- [ ] Add `Call Workflow` utility node.
- [ ] Remove `Sub-Workflow` catalog item.
- [ ] Add node presentation and handles.
- [ ] Register `CallWorkflowEditor`.
- [ ] Remove `SubWorkflowEditor`.
- [ ] Add frontend contract tests.
- [ ] Commit.

## Batch 6 - Frontend Editor
- [ ] Add published workflow select.
- [ ] Add callable trigger select.
- [ ] Show trigger icon, id, and type badge.
- [ ] Render trigger parameters.
- [ ] Support hardcoded/default fields.
- [ ] Add tool instructions, approval, and timeout controls.
- [ ] Commit.

## Batch 7 - Cleanup
- [ ] Remove stale `subworkflow` tests and references.
- [ ] Update workflow schema builder.
- [ ] Update add-node filters and selectors.
- [ ] Update docs where needed.
- [ ] Run backend tests.
- [ ] Run frontend tests.
- [ ] Commit.
