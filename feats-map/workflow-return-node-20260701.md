# Workflow Return Node

Feature map for adding an explicit `Return` utility node and a final workflow result contract.
`Return` stops the current workflow with `SUCCESS` and exposes its payload as the workflow result.
Without `Return`, the workflow result falls back to the executed steps tree.
`Call Workflow`, Execution Panel, and Global Automation Monitor must show/use the same final result.

## Batch 1 - Contracts
- [x] Add shared workflow result types.
- [x] Add `return` node type.
- [x] Add return mode types: `all-steps`, `fields`, `expression`.
- [x] Add backend contract tests.
- [x] Add frontend contract tests.
- [x] Update feature map.
- [x] Commit.

## Batch 2 - Runtime Result Contract
- [x] Add `context.result`.
- [x] Add `context.resultSource`.
- [x] Add fallback result from executed steps.
- [x] Persist result in execution logs.
- [x] Emit final result on workflow success events.
- [x] Add executor tests.
- [x] Update feature map.
- [x] Commit.

## Batch 3 - Return Node Runtime
- [ ] Add `return` handler.
- [ ] Support `all-steps` return mode.
- [ ] Support custom `fields` return mode.
- [ ] Support single `expression` return mode.
- [ ] Stop workflow execution after `Return`.
- [ ] Keep `Return` step output equal to returned value.
- [ ] Add branch and multi-return tests.
- [ ] Update feature map.
- [ ] Commit.

## Batch 4 - Call Workflow Result
- [ ] Return child `context.result` directly from `call-workflow`.
- [ ] Keep execution metadata available without polluting user output.
- [ ] Use fallback steps tree when child has no `Return`.
- [ ] Update agent tool adapter expectations.
- [ ] Add parent-child workflow tests.
- [ ] Update feature map.
- [ ] Commit.

## Batch 5 - Catalog And Canvas
- [ ] Register `Return` in Sailor Core utility manifest.
- [ ] Add `Return` style tokens.
- [ ] Add canvas node presentation.
- [ ] Add add-node catalog entry.
- [ ] Add quick-add behavior as normal flow node.
- [ ] Add catalog and presentation tests.
- [ ] Update feature map.
- [ ] Commit.

## Batch 6 - Return Editor
- [ ] Register `ReturnEditor`.
- [ ] Add mode selector.
- [ ] Add fields editor.
- [ ] Add expression editor.
- [ ] Add all-steps read-only hint.
- [ ] Add variable picker support.
- [ ] Add editor tests.
- [ ] Update feature map.
- [ ] Commit.

## Batch 7 - Execution UI Result
- [ ] Add result model helper for execution logs.
- [ ] Show final result in Execution Run Detail.
- [ ] Show explicit `Return` result label.
- [ ] Show fallback steps result label.
- [ ] Keep step tree visible below result.
- [ ] Add execution component tests.
- [ ] Update feature map.
- [ ] Commit.

## Batch 8 - Global Automation Monitor
- [ ] Surface final result in `AppGlobalAutomationMonitor.vue`.
- [ ] Show result summary on finished runs.
- [ ] Open full JSON result in run detail.
- [ ] Support Return and fallback result labels.
- [ ] Add monitor contract tests.
- [ ] Update feature map.
- [ ] Commit.

## Batch 9 - Cleanup And Compatibility
- [ ] Update workflow schema builder.
- [ ] Update variable tree icons and inference.
- [ ] Update docs/start guide where needed.
- [ ] Run backend tests.
- [ ] Run frontend tests.
- [ ] Run backend build.
- [ ] Run frontend build.
- [ ] Update feature map.
- [ ] Commit.
