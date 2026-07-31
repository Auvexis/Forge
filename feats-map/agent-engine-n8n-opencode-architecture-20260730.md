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
- [ ] Add contract tests
- [ ] Remove replaced legacy contracts

## Batch 2 — Durable Persistence

- [ ] Add engine request persistence
- [ ] Add engine response persistence
- [ ] Add continuation persistence
- [ ] Add idempotency keys
- [ ] Add request lifecycle transitions
- [ ] Add response correlation indexes
- [ ] Add atomic revision updates
- [ ] Add persistence tests
- [ ] Remove replaced legacy tables

## Batch 3 — Workflow Tool Scheduler

- [ ] Create workflow tool scheduler
- [ ] Resolve connected Tool Nodes
- [ ] Dispatch one durable tool request
- [ ] Execute through workflow engine
- [ ] Persist tool result before resume
- [ ] Persist tool error before resume
- [ ] Add cancellation propagation
- [ ] Add scheduler tests

## Batch 4 — Resumable MCP Loop

- [ ] Split decision from execution
- [ ] Return engine requests from the loop
- [ ] Resume from engine responses
- [ ] Preserve one tool per iteration
- [ ] Enforce iteration limits
- [ ] Enforce tool call limits
- [ ] Add repetition guard
- [ ] Add completion guard
- [ ] Remove inline tool execution
- [ ] Add loop tests

## Batch 5 — Progressive Tool Discovery

- [ ] Build compact MCP catalog
- [ ] Select one tool from catalog
- [ ] Load only selected tool schema
- [ ] Generate schema-bound arguments
- [ ] Validate arguments deterministically
- [ ] Repair invalid arguments once
- [ ] Add tool aliases and descriptions
- [ ] Add small-model discovery tests

## Batch 6 — Canonical Scratchpad

- [ ] Build assistant tool-call messages
- [ ] Build correlated tool-result messages
- [ ] Reconstruct steps by tool call ID
- [ ] Preserve completed steps on resume
- [ ] Detect duplicate responses
- [ ] Remove orphan tool messages
- [ ] Bound tool result context
- [ ] Preserve artifact references
- [ ] Add scratchpad tests

## Batch 7 — Durable Interactions

- [ ] Implement clarification requests
- [ ] Implement selection requests
- [ ] Implement approval requests
- [ ] Implement authentication requests
- [ ] Implement permission requests
- [ ] Persist user responses before resume
- [ ] Feed rejection feedback to the model
- [ ] Resume the same run and turn
- [ ] Add interaction tests

## Batch 8 — Provider Continuation

- [ ] Define provider adapter interface
- [ ] Preserve opaque continuation metadata
- [ ] Implement Ollama adapter
- [ ] Implement OpenAI adapter
- [ ] Implement Anthropic adapter
- [ ] Implement Gemini adapter
- [ ] Implement DeepSeek adapter
- [ ] Keep reasoning metadata private
- [ ] Add provider compatibility tests

## Batch 9 — Conversation Memory

- [ ] Separate run scratchpad from chat history
- [ ] Persist canonical message parts
- [ ] Save final conversation turns
- [ ] Avoid duplicate memory writes
- [ ] Add token-aware compaction
- [ ] Retain recent complete tool sequences
- [ ] Repair trimmed orphan messages
- [ ] Add memory tests

## Batch 10 — Recovery and Idempotency

- [ ] Recover queued requests after restart
- [ ] Recover running requests after restart
- [ ] Recover waiting interactions after restart
- [ ] Reconcile completed side effects
- [ ] Prevent duplicate side effects
- [ ] Add lease expiration
- [ ] Add retry policy
- [ ] Add dead-letter state
- [ ] Add restart matrix tests

## Batch 11 — Model Resilience

- [ ] Add primary model policy
- [ ] Add fallback model policy
- [ ] Classify retryable model failures
- [ ] Add structured decision repair
- [ ] Add empty-result recovery
- [ ] Add ambiguous-result selection
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
