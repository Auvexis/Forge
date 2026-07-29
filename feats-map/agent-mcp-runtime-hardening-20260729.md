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
- [ ] Add tool catalog and schema limits
- [ ] Add validation security tests
- [ ] Update this tracker and commit each task

## Batch 5 — MCP Errors and Retry

- [ ] Define structured MCP error categories
- [ ] Normalize plugin, workflow, and retrieval errors
- [ ] Add retry policy with bounded backoff
- [ ] Pause authentication and permission errors
- [ ] Pause ambiguous and not-found results
- [ ] Add error matrix tests
- [ ] Update this tracker and commit each task

## Batch 6 — Artifacts

- [ ] Define artifact metadata and reference contracts
- [ ] Add artifact migration and repository
- [ ] Add profile-scoped artifact storage
- [ ] Convert binary tool results into artifact references
- [ ] Resolve artifact references only at tool execution
- [ ] Add size, TTL, ownership, and cleanup policies
- [ ] Add Drive to Email to YouTube tests
- [ ] Update this tracker and commit each task

## Batch 7 — Idempotency

- [ ] Add idempotency migration and repository
- [ ] Generate stable side-effect keys
- [ ] Reserve keys transactionally before execution
- [ ] Persist successful side-effect results
- [ ] Resume interrupted side effects safely
- [ ] Remove process-local replay cache
- [ ] Add crash and duplicate delivery tests
- [ ] Update this tracker and commit each task

## Batch 8 — Execution Control

- [ ] Add global run timeout
- [ ] Add per-model timeout
- [ ] Add per-tool timeout
- [ ] Check cancellation between transitions
- [ ] Detect action dependency cycles
- [ ] Enforce action and tool-call limits
- [ ] Add worker lease and heartbeat
- [ ] Add timeout, cancellation, and concurrency tests
- [ ] Update this tracker and commit each task

## Batch 9 — Intent and Conversation

- [ ] Add multilingual chat, action, clarify, and control fixtures
- [ ] Add prepare-versus-execute safety cases
- [ ] Add repeated-tool and multi-action cases
- [ ] Persist canonical assistant tool calls and tool results
- [ ] Add bounded conversation compaction
- [x] Add completion guard tests
- [ ] Add small-model evaluation fixtures
- [ ] Update this tracker and commit each task

## Batch 10 — Model Providers

- [ ] Define provider capability matrix
- [ ] Add structured-output capability checks
- [ ] Add provider-specific context limits
- [ ] Add native tool-history adapters where supported
- [ ] Add safe text fallback adapters
- [ ] Add OpenAI-compatible and Ollama integration tests
- [ ] Update this tracker and commit each task

## Batch 11 — MCP Isolation

- [ ] Snapshot the connected tool catalog per run
- [ ] Reject disconnected and renamed tools
- [ ] Enforce profile and workflow ownership
- [ ] Sanitize untrusted tool metadata
- [x] Add tool-name collision policy
- [ ] Add cross-agent isolation tests
- [ ] Add audit events and metrics
- [ ] Update this tracker and commit each task

## Batch 12 — Observability

- [x] Define structured runtime log contracts
- [x] Add sanitized debug logger
- [x] Log run and intent transitions
- [x] Log action and tool-call transitions
- [x] Log interaction and approval transitions
- [x] Add environment-controlled log levels
- [x] Add redaction and correlation tests
- [ ] Update this tracker and commit each task

## Batch 13 — Legacy Cleanup

- [ ] Remove unused Agent Panel database structures
- [ ] Remove obsolete agent event contracts
- [ ] Remove obsolete frontend tokens and API types
- [ ] Remove obsolete max-iteration and retry fields or redefine them
- [ ] Remove stale specs and feature maps
- [x] Keep `/agents` as a hook-free empty shell
- [ ] Add empty-shell contract test
- [ ] Update this tracker and commit each task

## Batch 14 — End-to-End Validation

- [ ] Test chat-only conversation
- [ ] Test missing-context resume
- [ ] Test ambiguous-result resume
- [ ] Test approval resume
- [x] Test multi-tool dependency execution
- [ ] Test repeated use of the same tool
- [ ] Test crash recovery
- [ ] Test backend restart recovery
- [ ] Run API build, type-check, Vitest, and Node tests
- [ ] Run client build, type-check, Vitest, and Node tests
- [ ] Update architecture documentation
- [ ] Update this tracker and commit each task
