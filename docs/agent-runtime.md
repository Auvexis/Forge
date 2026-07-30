# Fabric Agent Runtime

Fabric runs one provider-neutral agent loop. There is no planner mode and
retrieval is an optional tool, not the orchestration architecture.

## MCP boundary

Fabric is the Host. Every tool connected to an AI Agent node is projected into
a run-scoped internal MCP server:

```text
AgentRunner (Host)
  -> AdaptiveMcpToolset
  -> InternalMcpClient
  -> InternalMcpServer
  -> connected Fabric tool adapter
```

The runtime does not connect arbitrary external MCP servers. Workflow
connections are the tool allowlist. Duplicate names and tools outside the
executing profile, workflow, node, or run fail closed.

Discovery begins with compact tool cards. Schemas are activated on demand and
cached by catalog hash. The Host validates arguments, approval policy,
timeouts, artifacts, and side-effect idempotency before invocation.

## Processor loop

`processor/agent-processor.ts` owns the loop:

1. Send canonical conversation messages and the adaptive toolset to the model.
2. Stream text, commitments, and tool calls through provider-neutral events.
3. Persist assistant parts incrementally.
4. Run independent reads concurrently.
5. Run writes and other side effects in declared order.
6. Append every tool result directly after its matching call.
7. Continue until the model returns text and every commitment has evidence.

A lightweight commitment ledger records every requested outcome. A final
answer is rejected while any commitment remains pending. This protects
multi-step requests when a small model attempts to finish after only one tool.

Transient tool failures use bounded retries with the same call and action
identities. User-action failures create durable clarification, selection,
authentication, permission, or approval interactions. Replies resume the same
turn instead of starting a new plan.

## Session persistence

The workflow database stores normalized sessions, turns, messages, and typed
parts. The canonical snapshot is:

```ts
{
  session,
  activeTurn,
  messages: [{ message, parts }],
  pendingInteraction,
  revision
}
```

Part types are `text`, `tool`, `artifact`, `interaction`, `error`,
`compaction`, and `commitment`. Every mutation uses an expected session
revision, preventing silent concurrent overwrites.

Running tools found after a process interruption become retryable durable
errors. Waiting interactions survive restart. Terminal turns remain terminal.

## Context engine

`conversation/agent-context-engine.ts` rebuilds model history only from
persisted parts. It:

- preserves tool-call/result adjacency;
- retains recent turns as indivisible units;
- deterministically summarizes older turns;
- truncates large inline results while retaining `artifact://` references;
- respects provider context and output budgets;
- caches projections by session revision with a bounded LRU.

## Agent interface

`GET /agent-sessions/:sessionId/snapshot` returns the profile-scoped canonical
snapshot. The frontend never treats realtime event payloads as durable state.

`AgentSessionReconciler` uses events only as invalidation hints and reloads the
snapshot. It also reconciles on mount, window focus, reconnect, and return to a
visible tab. Duplicate or older revisions are ignored, concurrent refreshes
are coalesced, and a tab that loses events converges on its next refresh.

The UI is split by responsibility:

- `AgentSessionTimeline.vue`: message parts and tool states;
- `AgentSessionControls.vue`: reply, approval, retry, and cancel controls;
- `AgentSessionPanel.vue`: snapshot lifecycle and action composition.

## Safety

- Connected tools are the complete per-run allowlist.
- Side effects receive stable action identities and durable reservations.
- Successful side effects can be replayed without duplicate execution.
- Binary data moves between tools through profile-scoped artifact references.
- Tool inputs and outputs are bounded and sanitized.
- Cancellation is checked between model and tool transitions.
- Logs redact secrets and correlate run, session, action, call, and tool IDs.

Set `FABRIC_AGENT_LOG_LEVEL=debug` for verbose agent diagnostics. Logs use the
`[FABRIC | AGENT]` prefix and structured JSON payloads.

## Validation

Run the focused suites:

```bash
cd apps/api
npm test -- --run src/core/modules/agent-runtime
npm run type-check

cd ../client
npm test -- --run src/features/agent-runtime
npm run type-check
```

Run the context benchmark:

```bash
cd apps/api
npx vitest bench --run \
  src/core/modules/agent-runtime/conversation/agent-context-engine.bench.ts
```

The hardening matrix covers restart states, stale and duplicate invalidations,
multiple tabs, concurrent requests, event loss, and a three-tool small-model
scenario.
