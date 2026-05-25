# Agent Tools, Chat Trigger, and Memory

Plan source: `docs/superpowers/plans/2026-05-25-agent-tools-chat-trigger-memory.md`

Goal: implement Sailor Agent Tools with Chat Trigger, provider/model nodes, memory nodes, plugin-backed tools, approvals, and execution traces with strong safety boundaries.

## Rules

- [x] Stay on branch `dev`.
- [x] Use TDD before implementation.
- [x] Do not let plugins import core, engines, or other plugins.
- [x] Keep agent runtime in core modules.
- [x] Commit after each completed implementation task.
- [x] Recheck LangChain/LangGraph advisories before installing dependencies.

## Task Map

- [x] Task 1: Dependency Audit and Install
- [x] Task 2: Agent Domain Types and Limits
- [x] Task 3: Workflow Node Types
- [x] Task 4: Agent Runtime Tables and Repositories
- [x] Task 5: Event Sanitizer and Agent Event Bus
- [x] Task 6: Plugin Agent Tool Metadata
- [x] Task 7: Plugin Tool Adapter
- [x] Task 8: Plugin Tool Executor Safety
- [x] Task 9: Model Provider Registry
- [x] Task 10: Short-Term Memory Checkpointer
- [x] Task 11: Long-Term Memory Policy
- [x] Task 12: Agent Graph Builder
- [x] Task 13: Agent Runner Facade
- [x] Task 14: AI Workflow Node Handlers
- [x] Task 15: Executor Config-Node Traversal Safety
- [x] Task 16: Chat Trigger Backend
- [x] Task 17: Agent Chat Routes
- [x] Task 18: Backend Integration Smoke
- [x] Task 19: Frontend API Contracts
- [x] Task 20: Frontend Workflow Node Components
- [x] Task 21: Add Node Panel and Node Previews
- [x] Task 22: Node Editors
- [x] Task 23: Agent Tool Picker
- [x] Task 24: Memory Scope Picker and Memory Admin UI
- [x] Task 25: Chat Session Panel
- [x] Task 26: Agent Trace and Execution Timeline
- [x] Task 27: Human Approval UI
- [x] Task 28: Security Hardening Backend
- [x] Task 29: Frontend Safety and Usability Polish
- [x] Task 30: Documentation and Feature Map Completion
- [x] Task 31: Full Verification
- [ ] Task 32: Move Chat Trigger Into Existing Trigger Type
- [ ] Task 33: Rework AI Agent Canvas UX To n8n-Style Cluster
- [ ] Task 34: Compatibility and Palette Cleanup For Agent Config Nodes
- [ ] Task 35: Agent Cluster UX Verification

## UX Rework Direction

- [ ] Chat Trigger must be configured inside the existing Trigger node through `Trigger Type = Chat`.
- [ ] Chat Trigger must not appear as a separate AI palette node.
- [ ] AI Agent should behave like the n8n Agent Tools cluster: one main Agent node with bottom config handles.
- [ ] Agent bottom handles must be `Chat Model*`, `Memory`, and `Tool`.
- [ ] Model, Memory, and Tool nodes should read visually as Agent config satellites, not normal execution steps.
- [ ] Multiple Tool config nodes may connect to the Agent `Tool` handle.
- [ ] Existing saved chat trigger workflows must remain compatible.

## Safety Notes

- [x] Agent tools must be explicit opt-in through plugin manifest metadata.
- [x] Side-effect tools must have visible policy and approval defaults.
- [x] Short-term memory must use a real checkpointer.
- [x] Long-term memory must use policy-controlled namespaces.
- [x] Chat Trigger must own session identity and never trust raw `thread_id` from request bodies.
- [x] Execution traces must be redacted and capped.
