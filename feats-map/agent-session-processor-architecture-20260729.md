# Agent Session Processor Architecture

## Batch 1 — Session Model

- [x] Define session, turn, message, and part contracts
- [x] Add normalized persistence migrations
- [x] Add repositories and transactional revision updates
- [x] Add paginated message and session snapshot queries
- [x] Remove legacy chat storage and history
- [x] Add contract, repository, and recovery tests

## Batch 2 — Agent Processor

- [x] Add provider-neutral response stream contracts
- [x] Persist assistant parts incrementally
- [x] Execute text and tool calls in one loop
- [x] Remove mandatory intent planning
- [x] Support interrupted tool reconciliation
- [x] Add processor and restart tests

## Batch 3 — MCP Toolset

- [x] Add adaptive tool discovery
- [x] Cache tool catalogs and schemas by hash
- [x] Activate schemas per turn
- [x] Execute independent read tools concurrently
- [x] Keep side effects ordered and idempotent
- [x] Add discovery, cache, and concurrency tests

## Batch 4 — Goal Completion

- [x] Add lightweight turn commitments
- [x] Add completion evidence links
- [x] Block premature final responses
- [x] Persist waiting-user and approval parts
- [x] Add retry, cancel, and resume flows
- [x] Add multi-step completion tests

## Batch 5 — Context Engine

- [x] Build model history from persisted parts
- [x] Add turn-aware compaction
- [x] Keep tool calls paired with results
- [x] Offload large results to artifacts
- [x] Add provider token budgets and prefix caching
- [x] Add context and compaction tests

## Batch 6 — Agent Interface

- [x] Add session snapshot client
- [x] Render message parts and tool states
- [x] Add interaction, retry, cancel, and approval controls
- [x] Use realtime events only for invalidation
- [x] Reconcile on mount, focus, and reconnect
- [x] Add refresh and event-loss tests
- [x] Compose the persisted session panel

## Batch 7 — Hardening

- [x] Test process restarts at every transition
- [x] Test duplicate and out-of-order events
- [x] Test multiple tabs and concurrent requests
- [x] Test small-model multi-tool scenarios
- [x] Add performance and load benchmarks
- [x] Update runtime documentation

## Batch 8 — Agent Chat Surface

- [x] Add published agent and session directory API
- [x] Add directory client contracts
- [ ] Build snapshot-based agent chat modal
- [ ] Replace the legacy agents page shell
- [ ] Add dedicated theme tokens
- [ ] Remove obsolete agent panel frontend code
- [ ] Add modal and page tests
