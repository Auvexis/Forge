# Agent MCP Runtime Hardening

## Batch 1 — Contracts

- [x] Define run, action, tool-call, interaction, artifact, and error contracts
- [x] Define run and action state transitions
- [x] Define internal MCP request and response envelopes
- [x] Add contract tests
- [x] Update this tracker and commit each task

## Batch 2 — Durable Runs

- [x] Add agent run and action migrations
- [x] Add run repository
- [x] Add action repository
- [x] Add optimistic version checks
- [x] Persist every loop transition
- [x] Add repository and recovery tests
- [x] Update this tracker and commit each task

## Batch 3 — Pending Interactions

- [x] Add pending interaction migration and repository
- [x] Persist clarification state
- [x] Persist ambiguous selection state
- [x] Route replies to pending interactions before intent classification
- [x] Add cancel, continue, retry, confirm, and selection handlers
- [x] Add restart and resume tests
- [x] Update this tracker and commit each task

## Batch 4 — MCP Validation

- [x] Add Host-side AJV argument validation
- [x] Reject unknown tool arguments
- [x] Add bounded argument repair
- [x] Add result envelope validation
- [x] Add tool catalog and schema limits
- [x] Add validation security tests
- [x] Update this tracker and commit each task

## Batch 5 — MCP Errors and Retry

- [x] Define structured MCP error categories
- [x] Normalize plugin, workflow, and retrieval errors
- [x] Add retry policy with bounded backoff
- [x] Pause authentication and permission errors
- [x] Pause ambiguous and not-found results
- [x] Add error matrix tests
- [x] Update this tracker and commit each task

## Batch 6 — Artifacts

- [x] Define artifact metadata and reference contracts
- [x] Add artifact migration and repository
- [x] Add profile-scoped artifact storage
- [x] Convert binary tool results into artifact references
- [x] Resolve artifact references only at tool execution
- [x] Add size, TTL, ownership, and cleanup policies
- [x] Add Drive to Email to YouTube tests
- [x] Update this tracker and commit each task

## Batch 7 — Idempotency

- [x] Add idempotency migration and repository
- [x] Generate stable side-effect keys
- [x] Reserve keys transactionally before execution
- [x] Persist successful side-effect results
- [x] Resume interrupted side effects safely
- [x] Remove process-local replay cache
- [x] Add crash and duplicate delivery tests
- [x] Update this tracker and commit each task

## Batch 8 — Execution Control

- [x] Add global run timeout
- [x] Add per-model timeout
- [x] Add per-tool timeout
- [x] Check cancellation between transitions
- [x] Detect action dependency cycles
- [x] Enforce action and tool-call limits
- [x] Add worker lease and heartbeat
- [x] Add timeout, cancellation, and concurrency tests
- [x] Update this tracker and commit each task

## Batch 9 — Intent and Conversation

- [x] Add multilingual chat, action, clarify, and control fixtures
- [x] Add prepare-versus-execute safety cases
- [x] Add repeated-tool and multi-action cases
- [x] Persist canonical assistant tool calls and tool results
- [x] Add bounded conversation compaction
- [x] Add completion guard tests
- [x] Add small-model evaluation fixtures
- [x] Update this tracker and commit each task

## Batch 10 — Model Providers

- [x] Define provider capability matrix
- [x] Add structured-output capability checks
- [x] Add provider-specific context limits
- [x] Add native tool-history adapters where supported
- [x] Add safe text fallback adapters
- [x] Add OpenAI-compatible and Ollama integration tests
- [x] Update this tracker and commit each task

## Batch 11 — MCP Isolation

- [x] Snapshot the connected tool catalog per run
- [x] Reject disconnected and renamed tools
- [x] Enforce profile and workflow ownership
- [x] Sanitize untrusted tool metadata
- [x] Add tool-name collision policy
- [x] Add cross-agent isolation tests
- [x] Add audit events and metrics
- [x] Update this tracker and commit each task

## Batch 12 — Observability

- [x] Define structured runtime log contracts
- [x] Add sanitized debug logger
- [x] Log run and intent transitions
- [x] Log action and tool-call transitions
- [x] Log interaction and approval transitions
- [x] Add environment-controlled log levels
- [x] Add redaction and correlation tests
- [x] Update this tracker and commit each task

## Batch 13 — Legacy Cleanup

- [x] Remove unused Agent Panel database structures
- [x] Remove obsolete agent event contracts
- [x] Remove obsolete frontend tokens and API types
- [x] Remove obsolete max-iteration and retry fields or redefine them
- [x] Remove stale specs and feature maps
- [x] Keep `/agents` as a hook-free empty shell
- [x] Add empty-shell contract test
- [x] Update this tracker and commit each task

## Batch 14 — End-to-End Validation

- [x] Test chat-only conversation
- [x] Test missing-context resume
- [x] Test ambiguous-result resume
- [x] Test approval resume
- [x] Test multi-tool dependency execution
- [x] Test repeated use of the same tool
- [x] Test crash recovery
- [x] Test backend restart recovery
- [x] Run API build, type-check, Vitest, and Node tests
- [x] Run client build, type-check, Vitest, and Node tests
- [x] Update architecture documentation
- [x] Update this tracker and commit each task
