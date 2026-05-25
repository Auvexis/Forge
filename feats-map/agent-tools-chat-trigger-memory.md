# Agent Tools, Chat Trigger, and Memory

Plan source: `docs/superpowers/plans/2026-05-25-agent-tools-chat-trigger-memory.md`

Goal: implement Sailor Agent Tools with Chat Trigger, provider/model nodes, memory nodes, plugin-backed tools, approvals, and execution traces with strong safety boundaries.

## Rules

- [x] Stay on branch `dev`.
- [x] Use TDD before implementation.
- [ ] Do not let plugins import core, engines, or other plugins.
- [x] Keep agent runtime in core modules.
- [x] Commit after each completed implementation task.
- [x] Recheck LangChain/LangGraph advisories before installing dependencies.

## Task Map

- [x] Task 1: Dependency Audit and Install
- [x] Task 2: Agent Domain Types and Limits
- [ ] Task 3: Workflow Node Types
- [ ] Task 4: Agent Runtime Tables and Repositories
- [ ] Task 5: Event Sanitizer and Agent Event Bus
- [ ] Task 6: Plugin Agent Tool Metadata
- [ ] Task 7: Plugin Tool Adapter
- [ ] Task 8: Plugin Tool Executor Safety
- [ ] Task 9: Model Provider Registry
- [ ] Task 10: Short-Term Memory Checkpointer
- [ ] Task 11: Long-Term Memory Policy
- [ ] Task 12: Agent Graph Builder
- [ ] Task 13: Agent Runner Facade
- [ ] Task 14: AI Workflow Node Handlers
- [ ] Task 15: Executor Config-Node Traversal Safety
- [ ] Task 16: Chat Trigger Backend
- [ ] Task 17: Agent Chat Routes
- [ ] Task 18: Backend Integration Smoke
- [ ] Task 19: Frontend API Contracts
- [ ] Task 20: Frontend Workflow Node Components
- [ ] Task 21: Add Node Panel and Node Previews
- [ ] Task 22: Node Editors
- [ ] Task 23: Agent Tool Picker
- [ ] Task 24: Memory Scope Picker and Memory Admin UI
- [ ] Task 25: Chat Session Panel
- [ ] Task 26: Agent Trace and Execution Timeline
- [ ] Task 27: Human Approval UI
- [ ] Task 28: Security Hardening Backend
- [ ] Task 29: Frontend Safety and Usability Polish
- [ ] Task 30: Documentation and Feature Map Completion
- [ ] Task 31: Full Verification

## Safety Notes

- [ ] Agent tools must be explicit opt-in through plugin manifest metadata.
- [ ] Side-effect tools must have visible policy and approval defaults.
- [ ] Short-term memory must use a real checkpointer.
- [ ] Long-term memory must use policy-controlled namespaces.
- [ ] Chat Trigger must own session identity and never trust raw `thread_id` from request bodies.
- [ ] Execution traces must be redacted and capped.
