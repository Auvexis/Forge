# Agent True Iterative Loop

## Batch 1 — Decision

- [x] Replace upfront action plans with one next-step decision
- [x] Keep chat and clarification decisions
- [x] Use compact tool cards before selected schemas

## Batch 2 — Execution

- [x] Execute and persist one tool per iteration
- [x] Feed bounded results into the next iteration
- [x] Generate unique run-scoped action IDs
- [x] Stop only on final, clarification, approval, error, or limits

## Batch 3 — Interface State

- [x] Remove upfront commitment persistence
- [x] Keep successful steps green after later failures
- [x] Show new steps only when selected

## Batch 4 — Validation

- [x] Test Drive list-download-email iteration
- [x] Test isolated step failure
- [x] Run agent and frontend checks

## Batch 5 — Loop repetition recovery

- [x] Reconstruct completed tool calls from conversation history
- [x] Reject identical tool calls before execution and UI persistence
- [x] Bound repeated non-paginated list/search calls
- [x] Return a clarification containing the previous result if the model remains stuck
- [x] Add continuation and duplicate-call regression tests
