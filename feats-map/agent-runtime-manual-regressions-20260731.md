# Agent Runtime Manual Regressions

## Batch 1 — Completion Safety

- [x] Reject premature final responses
- [x] Preserve session context without Memory Node
- [x] Preserve manifest approval requirements
- [x] Add regression tests
- [x] Run affected suites

## Batch 4 — Attachment and Approval Bridge

- [x] Resolve artifacts from generic tool schemas
- [x] Enforce approval in the workflow scheduler
- [x] Resume approved tools with resolved artifacts
- [x] Add external-plugin artifact regression tests
- [x] Run affected suites

## Batch 5 — Deterministic Approval Resume

- [x] Persist the blocked tool call
- [x] Resume the approved call before model inference
- [x] Use English runtime messages
- [x] Add approval execution regressions
- [x] Run affected suites

## Batch 3 — Artifact Foreign Keys

- [x] Remove legacy action foreign keys from clean schema
- [x] Migrate existing profile databases
- [x] Add artifact correlation regression test
- [x] Run affected suites

## Batch 2 — Deterministic Continuation

- [x] Force a known pending tool after failed repair
- [x] Capture engine binary outputs as artifacts
- [x] Keep persisted engine responses replayable
- [x] Add real-chain regression tests
- [x] Run affected suites
