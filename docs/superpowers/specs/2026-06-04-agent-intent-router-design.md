# Agent Intent Router Design

## Goal

Add a language-agnostic intent routing step before the deterministic tool planner.

The Global Chat Agent must distinguish normal chat from tool execution requests without relying on fixed keywords or a specific language. Normal chat must not enter the planner, must not emit tool progress, and must not execute tools.

## Current Problem

The current runtime sends many user messages directly to `AgentPlanGenerator`. This causes three bad outcomes:

- Simple chat or questions about the agent can trigger planning.
- Tool catalog questions in unhandled wording/languages can stall inside the planner.
- The planner receives more tool detail than it needs for high-level planning.

Recent keyword fast-paths fixed specific phrases, but they do not scale to arbitrary wording or languages.

## Proposed Architecture

Add `AgentIntentRouter` between input validation and `AgentPlanGenerator`.

Runtime flow:

1. Validate agent input and resolve configured tools.
2. Run deterministic fast-paths for cases that do not need LLM:
   - explicit approval or choice continuations
   - exact internal control flows
   - already-known catalog answer when the user directly asks what tools are available
3. For normal user messages, call `AgentIntentRouter`.
4. If intent is `chat`, generate a direct natural response and stop.
5. If intent is `tool_plan`, call `AgentPlanGenerator`, then deterministic executor.

## Intent Contract

The router returns strict JSON:

```json
{
  "mode": "chat",
  "reason": "The user is greeting the assistant.",
  "confidence": 0.92,
  "answer": "Good evening! How can I help?"
}
```

Allowed modes:

- `chat`: no tool execution needed.
- `tool_plan`: tools are needed or likely needed.

Fields:

- `mode`: required.
- `reason`: short, required for debugging.
- `confidence`: number from 0 to 1.
- `answer`: optional for `chat`; if absent, use final response generator.

Low-confidence behavior:

- If confidence is below `0.65`, prefer `chat` unless the message clearly asks for an external action.
- This prevents accidental tool execution.

## Router Prompt Inputs

The router gets:

- user message
- compact recent chat context
- configured tool catalog with only:
  - `name`
  - `description`
  - `instructions`
  - `sideEffect`

The router must not receive schemas, credential data, full manifests, or plugin internals.

## Planner Prompt Inputs

The planner keeps receiving only:

- tool `name`
- `description`
- `instructions`

It must not receive `inputSchema`, `properties`, or `required` in its high-level catalog. Parameter generation can remain schema-aware through the structured output schema and executor validation/repair path.

## Error Handling

- Invalid router JSON becomes `chat` with a short direct answer fallback, not tool execution.
- Router timeout becomes `chat` fallback.
- Planner invalid output remains `AGENT_PLAN_INVALID`.
- Tool execution failures remain handled by executor/repairer.

## UI Behavior

For `chat` intent:

- No `Thinking`, `Generating Plan`, `Choosing the best tools`.
- No tool progress rows.
- No shimmer status rows.
- User sees normal assistant response only.

For `tool_plan` intent:

- Existing progress UX remains.
- Shimmer appears only for active planned/running/retrying tool work.
- Stop continues to settle active progress rows.

## Tests

Backend:

- Greeting in Portuguese routes to `chat`.
- Tool catalog question in English routes to `chat`.
- Tool execution request routes to `tool_plan`.
- Router receives no schemas.
- Low-confidence non-action routes to `chat`.
- Invalid router output routes to safe `chat` fallback.

Frontend:

- Chat intent streams only assistant text.
- Tool intent still renders progress rows.
- Stop still settles active progress rows.

## Non-Goals

- Do not build a full multi-agent classifier.
- Do not add plugin-specific rules in Core.
- Do not make every chat response deterministic.
- Do not remove deterministic plan execution.
