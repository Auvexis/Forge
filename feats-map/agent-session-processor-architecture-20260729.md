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
- [ ] Add discovery, cache, and concurrency tests

## Batch 4 — Goal Completion

- [ ] Add lightweight turn commitments
- [ ] Add completion evidence links
- [ ] Block premature final responses
- [ ] Persist waiting-user and approval parts
- [ ] Add retry, cancel, and resume flows
- [ ] Add multi-step completion tests

## Batch 5 — Context Engine

- [ ] Build model history from persisted parts
- [ ] Add turn-aware compaction
- [ ] Keep tool calls paired with results
- [ ] Offload large results to artifacts
- [ ] Add provider token budgets and prefix caching
- [ ] Add context and compaction tests

## Batch 6 — Agent Interface

- [ ] Add session snapshot client
- [ ] Render message parts and tool states
- [ ] Add interaction, retry, cancel, and approval controls
- [ ] Use realtime events only for invalidation
- [ ] Reconcile on mount, focus, and reconnect
- [ ] Add refresh and event-loss tests

## Batch 7 — Hardening

- [ ] Test process restarts at every transition
- [ ] Test duplicate and out-of-order events
- [ ] Test multiple tabs and concurrent requests
- [ ] Test small-model multi-tool scenarios
- [ ] Add performance and load benchmarks
- [ ] Update runtime documentation
