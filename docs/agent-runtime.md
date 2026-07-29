# Fabric Agent Runtime

The Fabric backend has one agent execution mode: a stateful loop over tools
connected to the executing AI Agent node.

## Boundary

Fabric is the Agent Host. Connected workflow tools are projected into a
run-scoped, in-process MCP boundary:

```text
AI Agent node
  -> resolve connected tool capabilities
  -> InternalMcpClient
  -> InternalMcpServer
  -> InternalMcpToolCatalog
  -> existing secure tool adapter
  -> plugin method, child workflow, or vector-store operation
```

Fabric does not connect arbitrary external MCP servers. A tool exists in an
agent run only when the workflow explicitly connects that tool to the Agent
node. This connection is the allowlist.

## Runtime flow

1. Resolve the connected model, memory, and tool nodes.
2. Project connected tools as compact cards containing name, summary, and side
   effect. Full schemas are retained by the Host.
3. The intent gateway returns one of:
   - `chat`: respond without tools;
   - `clarify`: ask the user instead of guessing;
   - `action`: materialize every requested operation in an action ledger.
4. For the next dependency-ready action, load only that tool's full schema.
5. Ask the model for arguments or an explicit clarification.
6. Validate policy and execute through `InternalMcpClient`.
7. Store the result in the action ledger and continue until no required action
   remains.
8. Generate a final response from completed results.

The Host, not the model, prevents premature completion. A final response is not
generated while a required action remains pending.

## Durable execution

Runs, actions, pending interactions, artifacts, side-effect reservations, tool
catalog snapshots, leases, and heartbeats are persisted in the workflow
database. A reply to a pending clarification, selection, authentication,
permission, or approval is routed before new intent classification.

On resume, the Host verifies that profile, workflow, Agent node, tool names,
method identities, side effects, and schema hashes still match the immutable
run snapshot. A renamed, disconnected, or cross-agent tool fails closed.

Side effects use stable idempotency keys. Reservations are persisted before
execution and successful results are replayed from durable storage. Expired
pre-execution reservations may be reclaimed; an uncertain in-flight side
effect is never blindly repeated.

## Conversation and models

Conversation history uses canonical assistant tool calls followed by matching
tool result messages. Compaction is deterministic, bounded by the configured
model context, prioritizes recent messages, and never separates a tool call
from its result.

Provider capabilities are explicit:

- OpenAI-compatible and Ollama use structured JSON Schema output;
- native provider tool-history formats are used where supported;
- providers without structured output use a strict JSON-only fallback validated
  against the requested schema;
- provider context limits are clamped before invocation.

The intent prompt distinguishes ordinary chat, clarification, preparation-only
requests, and external actions. For action requests it produces the complete
ordered action graph, including repeated uses of the same tool.

## Artifacts and execution control

Binary results are stored as profile-scoped artifacts and passed between tools
as `artifact://` references. References are resolved only inside the MCP server
immediately before the receiving tool executes.

The runtime enforces:

- global run, model, and tool deadlines;
- cancellation checks between transitions;
- action dependency cycle detection;
- action and tool-call limits;
- worker leases and heartbeats;
- bounded transient retries;
- transactional side-effect idempotency.

Structured logs and counters correlate profile, workflow, execution, node, run,
action, tool call, and tool name while redacting secrets and large payloads.

## Internal modules

- `intent/agent-intent-gateway.ts`: chat/action/clarify routing and required
  action extraction from the compact catalog.
- `mcp/internal-mcp-tool-catalog.ts`: run-scoped allowlist and schema lookup.
- `mcp/internal-mcp-client.ts`: Host-side MCP client boundary.
- `mcp/internal-mcp-server.ts`: run-scoped MCP server that exposes only the
  connected Fabric tools and delegates to their secure invocation adapters.
- `loop/mcp-agent-loop.ts`: dependency-aware action execution, clarification,
  approval resume, and completion guard.
- `agent-runner.ts`: validates the run, resolves providers and memory, builds
  the internal MCP projection, and emits lifecycle events.
- `plugin-tool-executor.ts`: payload limits, approval, timeout, and secure
  plugin execution.
- `persistence/`: durable runs, actions, interactions, leases, and recovery.
- `artifacts/`: profile-scoped binary storage and reference resolution.
- `idempotency/`: durable side-effect reservation and result replay.
- `model-adapters/`: provider capability matrix and native history formats.
- `conversation/`: deterministic bounded history compaction.
- `observability/`: sanitized correlated logs and runtime counters.

## Tool sources

The same internal MCP contract supports:

- plugin methods explicitly marked as agent tools;
- published child workflows exposed through `call-workflow`;
- vector-store retrieval exposed as a tool.

Retrieval is an optional tool capability. It is not the orchestration model of
the agent runtime.

## Safety

- Only tools connected to the Agent node are visible.
- Duplicate tool names fail the run instead of becoming ambiguous.
- Full schemas are disclosed only for the current action.
- Missing identifiers, recipients, files, permissions, or destructive intent
  must produce clarification rather than guessed arguments.
- Side-effect approval is enforced by the Host before invocation.
- Plugin calls retain payload depth, key-count, byte-size, and timeout limits.
- Events and stored tool output are sanitized before leaving the runtime.
- Approval resume state contains the action ledger, so completed operations are
  not intentionally replanned.

## Removed architecture

The alpha runtime intentionally has no compatibility layer for:

- planner mode;
- LangGraph graph/checkpointer execution;
- the legacy prompt-driven loop;
- the published Agent Panel API and real-time stream;
- external user-configured MCP servers.

The client `/agents` route is currently an empty shell while a new conversation
surface is designed against the new runtime contracts.
