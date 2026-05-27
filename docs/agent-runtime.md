# Agent Runtime

Sailor Agent Runtime is the core boundary for Chat Trigger, AI Agent nodes, model providers, memory, plugin-backed tools, approvals, and execution traces. The runtime lives under `server/src/core/modules/agent-runtime/` and is the only backend area that should know about LangGraph or LangChain internals.

## Architecture Overview

The runtime follows this flow:

```txt
routes -> chat services -> workflow trigger execution -> node handlers -> agent runner
nodes  -> node handlers -> agent runtime facade -> graph/model/tool/memory adapters
```

Workflow nodes stay thin. `ai-agent` executes through the agent runner, while `ai-model`, `ai-memory`, and `ai-tool` are configuration nodes discovered around the agent node. Plugins remain isolated: they do not import core, engines, or other plugins. Core adapts plugin manifest metadata into agent tools and calls plugin methods through the plugin executor boundary.

## Plugin Capability Boundary

Agent Chat Models are discovered from `manifest.metadata.agentCapabilities.chatModel`. Core selects a generic adapter such as `openai-compatible`; it does not hardcode plugin ids like OpenAI or OpenRouter when creating models. Plugins declare capability metadata, credentials, and methods through their manifest and runtime registration, but they do not import or call agent runtime code.

Method tools remain method-level capabilities through `method.agentTool`. Memory store capabilities are plugin-level metadata through `manifest.metadata.agentCapabilities.memoryStore`; plugin-backed memory uses the generic `plugin-memory-store` adapter and explicit `searchMethodId` / `putMethodId` method ids declared by the plugin manifest.

Key backend modules:

- `agent-runner.ts`: validates run input, resolves model/tools/memory, builds the graph, emits events, and handles approval pauses.
- `agent-graph-builder.ts`: owns the model/tool loop and iteration/tool-call limits.
- `plugin-tool-adapter.ts`: converts explicit plugin agent metadata into Sailor tool definitions.
- `plugin-tool-executor.ts`: validates payload size/depth/key count, enforces approval, timeout, and executes via `PluginExecutor`.
- `agent-event-bus.ts` and `agent-event-sanitizer.ts`: publish redacted `agent:*` workflow timeline events.
- `chat/chat-trigger-service.ts`: creates/resumes chat sessions and triggers workflows from chat messages.

## Memory Architecture

Memory is intentionally split into separate responsibilities:

- Chat message log: user-visible session transcript.
- LangGraph checkpointer: short-term thread state keyed by Sailor chat session id.
- Long-term memory store: profile/workflow/user facts saved through policy.
- Knowledge/RAG store: future extension, not part of this foundation.

Long-term namespaces are policy-built:

- `profile:<profileId>`
- `workflow:<profileId>:<workflowId>`
- `user:<profileId>:<userId>`

`none` and `session` scopes do not write long-term memory. Writes must pass `assertMemoryWriteAllowed`, size limits, JSON serializability, and obvious-secret rejection.

Plugin-backed long-term memory is opt-in through manifest metadata:

```json
{
  "metadata": {
    "agentCapabilities": {
      "memoryStore": {
        "enabled": true,
        "adapter": "plugin-memory-store",
        "label": "PostgreSQL Agent Memory",
        "description": "Stores and retrieves Agent memory records in PostgreSQL.",
        "searchMethodId": "searchAgentMemory",
        "putMethodId": "putAgentMemory"
      }
    }
  }
}
```

When an AI Memory node uses `adapter: "plugin-memory-store"`, the runtime calls the declared plugin methods through `PluginExecutor`; Core does not branch on plugin ids. The search method receives `profileId`, `namespace`, and `limit`, and must return memory records with a string `key` and JSON-serializable `value`. The put method receives `id`, `profileId`, `namespace`, `key`, `value`, and `source`.

## Plugin Tool Metadata

Plugin methods are agent tools only when the manifest marks them as agent-enabled. A tool definition must include a stable description, input schema, side-effect classification, timeout, and approval policy.

Side-effect classes:

- `read`
- `write`
- `delete`
- `external-message`
- `external-payment`
- `filesystem`

Non-read tools should require approval by default. Agents must never expose every plugin method automatically; the metadata is the safety and product boundary.

## Security Model

The runtime applies defense in depth:

- Node configs, chat payloads, tool configs, and memory settings are schema validated.
- Tool args are capped by depth, key count, and byte size before plugin execution.
- Tool results and agent events are redacted before entering execution timelines.
- Model credentials are resolved by model providers and never returned to routes or UI.
- Destructive/external/filesystem/payment tools pause for approval.
- Chat sessions are profile-scoped and must match workflow and trigger ownership.
- Public chat can enforce origin allowlists and rate limits.
- Raw LangGraph `thread_id` is not accepted from request bodies; the runtime derives thread identity from the Sailor session id.

## Chat Trigger Sessions

A Chat Trigger is resolved by `chatSlug` from active workflows. On first message, Sailor creates a chat session with profile, workflow, and trigger ownership. Follow-up messages can resume only when the supplied session id belongs to the same profile, workflow, and trigger.

The trigger payload sent into workflow execution includes:

- `type: "chat"`
- `profileId`
- `workflowId`
- `triggerNodeId`
- `sessionId`
- `userId`
- `message`
- `metadata`

The agent checkpointer uses the validated Sailor `sessionId` as the LangGraph thread id.

## Debugging Agent Runs

Use the workflow execution panel and Agent Trace section. Agent events are emitted as `agent:*` timeline events:

- model start/end
- tool start/end
- memory read/write
- approval created/resumed
- errors and run end

Trace payloads are capped, collapsible, and redacted. If an agent pauses for approval, inspect the approval event, review sanitized tool args, approve or reject, then rerun or resume according to the workflow surface.

## Anti-Patterns

- Do not store raw prompts as memory.
- Do not let plugins import core, engines, or other plugins.
- Do not expose unapproved destructive tools to agents.
- Do not accept raw `thread_id` from clients.
- Do not log model API keys, credential values, tool secrets, or full oversized payloads.
- Do not bypass `PluginExecutor` for plugin-backed agent tools.
- Do not add direct LangGraph concepts to Vue components; frontend should render Sailor contracts only.
