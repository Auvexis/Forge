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
- [x] Add `return` handler.
- [x] Support `all-steps` return mode.
- [x] Support custom `fields` return mode.
- [x] Support single `expression` return mode.
- [x] Stop workflow execution after `Return`.
- [x] Keep `Return` step output equal to returned value.
- [x] Add branch and multi-return tests.
- [x] Update feature map.
- [x] Commit.

## Batch 4 - Call Workflow Result
- [x] Return child `context.result` directly from `call-workflow`.
- [x] Keep execution metadata available without polluting user output.
- [x] Use fallback steps tree when child has no `Return`.
- [x] Update agent tool adapter expectations.
- [x] Add parent-child workflow tests.
- [x] Update feature map.
- [x] Commit.

## Batch 5 - Catalog And Canvas
- [x] Register `Return` in Fabric Core utility manifest.
- [x] Add `Return` style tokens.
- [x] Add canvas node presentation.
- [x] Add add-node catalog entry.
- [x] Add quick-add behavior as normal flow node.
- [x] Add catalog and presentation tests.
- [x] Update feature map.
- [x] Commit.

## Batch 6 - Return Editor
- [x] Register `ReturnEditor`.
- [x] Add mode selector.
- [x] Add fields editor.
- [x] Add expression editor.
- [x] Add all-steps read-only hint.
- [x] Add variable picker support.
- [x] Add editor tests.
- [x] Update feature map.
- [x] Commit.

## Batch 7 - Execution UI Result
- [x] Add result model helper for execution logs.
- [x] Show final result in Execution Run Detail.
- [x] Show explicit `Return` result label.
- [x] Show fallback steps result label.
- [x] Keep step tree visible below result.
- [x] Add execution component tests.
- [x] Update feature map.
- [x] Commit.

## Batch 8 - Global Automation Monitor
- [x] Surface final result in `AppGlobalAutomationMonitor.vue`.
- [x] Show result summary on finished runs.
- [x] Open full JSON result in run detail.
- [x] Support Return and fallback result labels.
- [x] Add monitor contract tests.
- [x] Update feature map.
- [x] Commit.

## Batch 9 - Cleanup And Compatibility
- [x] Update workflow schema builder.
- [x] Update variable tree icons and inference.
- [x] Update docs/start guide where needed.
- [x] Run backend tests.
- [x] Run frontend tests.
- [x] Run backend build.
- [x] Run frontend build.
- [x] Update feature map.
- [x] Commit.
