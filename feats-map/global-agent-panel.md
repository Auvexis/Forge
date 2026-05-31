# Global Agent Panel

Plan source: `docs/superpowers/plans/2026-05-28-global-agent-panel.md`

Goal: build a global published-agent chat panel so users can talk to agents from published workflows outside the Workflow Editor.

## Rules

- [x] Stay on branch `dev`.
- [x] Use TDD before implementation.
- [x] Keep plugins generic; plugins must not import core, engines, or other plugins.
- [x] Keep discovery, session ownership, and chat execution in core/backend modules.
- [x] Keep the Workflow Editor chat as a dev/testing surface; published agent chat belongs in the global panel.
- [x] Commit after each completed implementation task.

## Task Map

- [x] Task 1: Backend Agent Directory Discovery
- [x] Task 2: Agent Node Public Metadata
- [x] Task 3: Agent-Scoped Chat Session Schema
- [x] Task 4: Agent Panel Chat Service
- [x] Task 5: Agent Panel Routes
- [x] Task 6: Published-Agent Execution Targeting
- [x] Task 7: Frontend API Contracts and Types
- [x] Task 8: Agent Metadata Editor UI
- [x] Task 9: Global Agent Panel Shell
- [x] Task 10: Agent List and Session List UI
- [x] Task 11: Chat Composer and Message Stream UX
- [x] Task 12: Session Delete and Memory Cleanup UX
- [x] Task 13: Workflow Editor Chat Boundary Cleanup
- [x] Task 14: Global Agent Panel Verification

## Product Direction

- [x] Agents appear only when a published workflow has a Chat Trigger with a slug that reaches an AI Agent with a Chat Model.
- [x] Each eligible pair is represented by `profileId + workflowId + triggerNodeId + agentNodeId`.
- [x] Chat transcript is persistent chat history, not long-term memory.
- [x] Long-term memory remains owned by AI Memory nodes and their scopes.
- [x] Deleting a chat deletes transcript and session-scoped memory for that chat; profile/workflow/user memory requires explicit confirmation.
- [x] UI is Discord-like: agents left, sessions middle, chat right.

## Verification Notes

- Backend focused suite passed: `node --test src/core/modules/agent-runtime/directory/published-agent-directory.test.ts src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts src/core/routes/agent-panel.routes.test.ts src/core/modules/workflows/executor.test.ts src/core/modules/agent-runtime/chat/chat-trigger-service.test.ts src/core/routes/agent-chat.routes.test.ts` - 36 tests, 0 failures.
- Backend build passed: `npm run build`.
- Frontend focused suite passed: `node --test src/core/api/agent-panel.api.contract.test.ts src/features/agent-panel/__tests__/agentPanel.contract.test.ts src/features/workflow-editor/components/settings/editors/__tests__/agentEditors.contract.test.ts src/features/workflow-editor/components/agent/__tests__/ChatSessionPanel.contract.test.ts` - 41 tests, 0 failures.
- Frontend build passed: `npm run build`.
- Browser smoke on `http://localhost:23802/agents` passed for app load, profile entry, three-column panel shell, empty published-agent state, disabled new-chat action with no selected agent, and no new console errors on the `localhost` run.
- Full manual model/provider matrix below still needs a prepared published workflow and configured providers in the runtime environment.

## Manual Test Matrix Before Release

- [ ] Published Ollama Chat Model without tools.
- [ ] Published OpenAI Chat Model without tools.
- [ ] Short chat history: ask what the last assistant response was.
- [ ] AI Memory scope `session`.
- [ ] AI Memory scope `workflow`.
- [ ] AI Memory scope `profile`.
- [ ] One read-only tool.
- [ ] One tool with approval.
- [ ] Tool failure shows a useful error.
- [ ] Two chat agents in one published workflow.
- [ ] Same chat slug in two profiles stays profile-scoped.
