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
- [x] Add `Call Workflow` utility node.
- [x] Remove `Sub-Workflow` catalog item.
- [x] Add node presentation and handles.
- [x] Register `CallWorkflowEditor`.
- [x] Remove `SubWorkflowEditor`.
- [x] Add frontend contract tests.
- [x] Commit.

## Batch 6 - Frontend Editor
- [x] Add published workflow select.
- [x] Add callable trigger select.
- [x] Show trigger icon, id, and type badge.
- [x] Render trigger parameters.
- [x] Support hardcoded/default fields.
- [x] Add tool instructions, approval, and timeout controls.
- [x] Commit.

## Batch 7 - Cleanup
- [x] Remove stale `subworkflow` tests and references.
- [x] Update workflow schema builder.
- [x] Update add-node filters and selectors.
- [x] Update docs where needed.
- [x] Run backend tests.
- [x] Run frontend tests.
- [x] Commit.
