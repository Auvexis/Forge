# Agent Engine Architecture

## Batch 0 — Baseline

- [x] Review current agent runtime
- [x] Review n8n Tools Agent V3
- [x] Review OpenCode session architecture
- [x] Define Fabric-native target architecture
- [x] Verify source license constraints

## Batch 1 — Domain Contracts

- [x] Define agent run contract
- [x] Define engine request contract
- [x] Define engine response contract
- [x] Define continuation metadata contract
- [x] Define typed interaction contract
- [x] Define provider metadata envelope
- [x] Add contract tests

## Batch 2 — Durable Persistence

- [x] Add engine request persistence
- [x] Add engine response persistence
- [x] Add continuation persistence
- [x] Add idempotency keys
- [x] Add request lifecycle transitions
- [x] Add response correlation indexes
- [x] Add atomic revision updates
- [x] Add persistence tests

## Batch 3 — Workflow Tool Scheduler

- [x] Create workflow tool scheduler
- [x] Resolve connected Tool Nodes
- [x] Dispatch one durable tool request
- [x] Execute through workflow engine
- [x] Persist tool result before resume
- [x] Persist tool error before resume
- [x] Add cancellation propagation
- [x] Add scheduler tests

## Batch 4 — Resumable MCP Loop

- [x] Split decision from execution
- [x] Return engine requests from the loop
- [x] Resume from engine responses
- [x] Preserve one tool per iteration
- [x] Enforce iteration limits
- [x] Enforce tool call limits
- [x] Add repetition guard
- [x] Add completion guard
- [x] Remove inline tool execution
- [x] Add loop tests

## Batch 5 — Progressive Tool Discovery

- [x] Build compact MCP catalog
- [x] Select one tool from catalog
- [x] Load only selected tool schema
- [x] Generate schema-bound arguments
- [x] Validate arguments deterministically
- [x] Repair invalid arguments once
- [x] Add tool aliases and descriptions
- [x] Add small-model discovery tests

## Batch 6 — Canonical Scratchpad

- [x] Build assistant tool-call messages
- [x] Build correlated tool-result messages
- [x] Reconstruct steps by tool call ID
- [x] Preserve completed steps on resume
- [x] Detect duplicate responses
- [x] Remove orphan tool messages
- [x] Bound tool result context
- [x] Preserve artifact references
- [x] Add scratchpad tests

## Batch 7 — Durable Interactions

- [x] Implement clarification requests
- [x] Implement selection requests
- [x] Implement approval requests
- [x] Implement authentication requests
- [x] Implement permission requests
- [x] Persist user responses before resume
- [x] Feed rejection feedback to the model
- [x] Resume the same run and turn
- [x] Add interaction tests

## Batch 8 — Provider Continuation

- [x] Define provider adapter interface
- [x] Preserve opaque continuation metadata
- [x] Implement Ollama adapter
- [x] Implement OpenAI adapter
- [x] Implement Anthropic adapter
- [x] Implement Gemini adapter
- [x] Implement DeepSeek adapter
- [x] Keep reasoning metadata private
- [x] Add provider compatibility tests

## Batch 9 — Conversation Memory

- [x] Separate run scratchpad from chat history
- [x] Persist canonical message parts
- [x] Save final conversation turns
- [x] Avoid duplicate memory writes
- [x] Add token-aware compaction
- [x] Retain recent complete tool sequences
- [x] Repair trimmed orphan messages
- [x] Add memory tests

## Batch 10 — Recovery and Idempotency

- [x] Recover queued requests after restart
- [x] Recover running requests after restart
- [x] Recover waiting interactions after restart
- [x] Reconcile completed side effects
- [x] Prevent duplicate side effects
- [x] Add lease expiration
- [x] Add retry policy
- [x] Add dead-letter state
- [x] Add restart matrix tests

## Batch 11 — Model Resilience

- [x] Add primary model policy
- [x] Add fallback model policy
- [x] Classify retryable model failures
- [x] Add structured decision repair
- [x] Add empty-result recovery
- [x] Add ambiguous-result selection
- [ ] Add deterministic stop reasons
- [ ] Add 1B–20B Ollama fixtures
- [ ] Add resilience tests

## Batch 12 — Live Session Interface

- [ ] Derive UI from session snapshots
- [ ] Reconcile snapshots by revision
- [ ] Show user messages optimistically
- [ ] Show steps when requested
- [ ] Update each step independently
- [ ] Persist errors as message parts
- [ ] Route operational errors to notifications
- [ ] Add cancel and retry controls
- [ ] Add interface contract tests

## Batch 13 — Observability

- [ ] Add run lifecycle logs
- [ ] Add decision logs
- [ ] Add bounded tool input logs
- [ ] Add bounded tool output logs
- [ ] Add interaction logs
- [ ] Add recovery logs
- [ ] Add iteration metrics
- [ ] Add tool latency metrics
- [ ] Add failure classification metrics
- [ ] Add run replay diagnostics

## Batch 14 — Security

- [ ] Validate all MCP inputs
- [ ] Validate all MCP outputs
- [ ] Isolate plugin credentials
- [ ] Enforce profile ownership
- [ ] Enforce workflow ownership
- [ ] Sanitize persisted payloads
- [ ] Redact secrets from logs
- [ ] Bound binary and text payloads
- [ ] Add security tests

## Batch 15 — Migration Cleanup

- [ ] Switch agent node to the new engine
- [ ] Remove legacy planner runtime
- [ ] Remove legacy loop runtime
- [ ] Remove legacy agent processors
- [ ] Remove replaced legacy contracts
- [ ] Remove replaced legacy tables
- [ ] Remove legacy frontend hooks
- [ ] Remove legacy migrations
- [ ] Remove dead dependencies
- [ ] Verify clean architecture boundaries

## Batch 16 — End-to-End Validation

- [ ] Test chat-only response
- [ ] Test Drive list-download-email
- [ ] Test Drive-download-YouTube
- [ ] Test clarification continuation
- [ ] Test approval continuation
- [ ] Test tool failure and retry
- [ ] Test model timeout and fallback
- [ ] Test cancellation
- [ ] Test API restart mid-run
- [ ] Test desktop restart mid-run
- [ ] Test long-session compaction
- [ ] Test concurrent sessions
- [ ] Run API test suite
- [ ] Run client test suite
- [ ] Run desktop test suite
- [ ] Run all type checks
