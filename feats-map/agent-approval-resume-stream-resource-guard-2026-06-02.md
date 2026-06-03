# Agent approval resume stream and resource guard - 2026-06-02

## Context
- User approved a Gmail tool call in the Global Agent Panel, but the UI stopped at `Preparing to use google_gmail_send_message`.
- The email sometimes arrived without a PDF attachment, or with an `agent-ref://...` placeholder/invalid binary.
- After the approval flow, local Ollama/backend kept consuming excessive RAM/GPU.

## Root-cause hypotheses to prove with tests/evidence
- Attachment resolver treats `content: "agent-ref://..."` as a whole file object instead of raw binary content, so Gmail receives a malformed nested object or empty content.
- Global Agent Panel approval uses the shared approval endpoint, which resumes the workflow in the background while the panel's SSE stream is already closed.
- Approval resume re-enters the agent node and can invoke extra LLM calls after the pause; Ollama may also keep the model resident after requests.

## Tasks
- [x] Add a regression test for attachment objects whose `content` points to an agent binary ref.
- [x] Fix binary ref resolution so attachment arrays keep file metadata, while `content` fields resolve to raw binary content.
- [x] Add a regression test for Global Agent Panel approval continuation after `waiting-approval`.
- [x] Fix the panel approval flow so the Gmail tool progress/result and final assistant message are observable after approval.
- [x] Inspect Ollama/model adapter and workflow resume behavior for avoidable background resource use.
- [x] Add a focused resource guard or configuration fix with test coverage where feasible.
- [x] Run focused server/client tests and record the verification commands.

## Verification
- `server`: `node --test src/core/modules/agent-runtime/agent-graph-builder.test.ts src/core/modules/agent-runtime/model-adapters/ollama-adapter.test.ts`
- `client-vue`: `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- `server`: `npm run build`
- `client-vue`: `npm run build`

## Follow-up: approval scope duplication - 2026-06-02
- [x] Add a regression test showing one approved tool must not approve a second side-effect tool in the same resumed agent run.
- [x] Scope approval resume to the approved tool name/request instead of a broad `approvalToken`.
- [x] Add a replay guard so already executed side-effect tools in the same execution are not sent again during later approval resumes.
- [x] Stop duplicate progress/final UI rows caused by replayed approval events where possible.
- [x] Re-run focused server/client tests and builds.

## Follow-up verification
- `server`: `node --test src/core/modules/agent-runtime/plugin-tool-executor.test.ts src/core/modules/agent-runtime/agent-graph-builder.test.ts src/core/modules/agent-runtime/model-adapters/ollama-adapter.test.ts`
- `client-vue`: `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`
- `server`: `npm run build`
- `client-vue`: `npm run build`
