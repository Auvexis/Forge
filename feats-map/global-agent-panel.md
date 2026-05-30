# Global Agent Panel

Plan source: `docs/superpowers/plans/2026-05-28-global-agent-panel.md`

Goal: build a global published-agent chat panel so users can talk to agents from published workflows outside the Workflow Editor.

## Rules

- [ ] Stay on branch `dev`.
- [ ] Use TDD before implementation.
- [ ] Keep plugins generic; plugins must not import core, engines, or other plugins.
- [ ] Keep discovery, session ownership, and chat execution in core/backend modules.
- [ ] Keep the Workflow Editor chat as a dev/testing surface; published agent chat belongs in the global panel.
- [ ] Commit after each completed implementation task.

## Task Map

- [x] Task 1: Backend Agent Directory Discovery
- [x] Task 2: Agent Node Public Metadata
- [x] Task 3: Agent-Scoped Chat Session Schema
- [x] Task 4: Agent Panel Chat Service
- [x] Task 5: Agent Panel Routes
- [x] Task 6: Published-Agent Execution Targeting
- [ ] Task 7: Frontend API Contracts and Types
- [ ] Task 8: Agent Metadata Editor UI
- [ ] Task 9: Global Agent Panel Shell
- [ ] Task 10: Agent List and Session List UI
- [ ] Task 11: Chat Composer and Message Stream UX
- [ ] Task 12: Session Delete and Memory Cleanup UX
- [ ] Task 13: Workflow Editor Chat Boundary Cleanup
- [ ] Task 14: Global Agent Panel Verification

## Product Direction

- [ ] Agents appear only when a published workflow has a Chat Trigger with a slug that reaches an AI Agent with a Chat Model.
- [ ] Each eligible pair is represented by `profileId + workflowId + triggerNodeId + agentNodeId`.
- [ ] Chat transcript is persistent chat history, not long-term memory.
- [ ] Long-term memory remains owned by AI Memory nodes and their scopes.
- [ ] Deleting a chat deletes transcript and session-scoped memory for that chat; profile/workflow/user memory requires explicit confirmation.
- [ ] UI is Discord-like: agents left, sessions middle, chat right.

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
