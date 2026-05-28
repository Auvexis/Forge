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
- [x] Task 32: Move Chat Trigger Into Existing Trigger Type
- [x] Task 33: Rework AI Agent Canvas UX To n8n-Style Cluster
- [ ] Task 34: Agent Cluster UX Verification
- [x] Task 35: Workflow Editor Chat Status Bar Contracts
- [x] Task 36: Workflow Chat Bottom Panel
- [x] Task 37: Workflow Status Bar Panel Switcher
- [x] Task 38: Chat Trigger Inspector Cleanup and Verification
- [x] Task 39: Chat Panel Composer Polish, Ctrl+Enter, STT, and Toast Errors
- [x] Task 40: Plugin Auth Panels for AI Agent, Chat Model, Memory, and Tool Editors
- [x] Task 41: Chat Panel and Agent Editor Regression Contracts
- [x] Task 42: Publish Dirty Chat Trigger Workflow Before Chat Send
- [x] Task 43: Preserve Agent Provider Error Details in Chat Failures
- [x] Task 44: Chat Panel Layout and Composer Polish
- [x] Task 45: Editor Chat Sends to Active Dev Session
- [x] Task 46: Editor Chat History and Run Response Sync
- [x] Task 47: Left Chat Panel Layout
- [x] Task 48: Chat Panel Receives Agent End Output
- [x] Task 49: Move Agent Plugin Auth to Node Settings
- [x] Task 50: Model Provider Uses Plugin Auth Credentials

## UX Rework Direction

- [x] Chat Trigger must be configured inside the existing Trigger node through `Trigger Type = Chat`.
- [x] Chat Trigger must not appear as a separate AI palette node.
- [x] AI Agent should behave like the n8n Agent Tools cluster: one main Agent node with bottom config handles.
- [x] Agent bottom handles must be `Chat Model*`, `Memory`, and `Tool`.
- [x] Model, Memory, and Tool nodes should read visually as Agent config satellites, not normal execution steps.
- [x] Multiple Tool config nodes may connect to the Agent `Tool` handle.
- [x] Chat testing should be available from the Workflow Editor status bar.
- [x] Chat and Execution should open sibling bottom panels through the same dock system.
- [x] Chat Trigger inspector should configure chat, not own the primary chat testing surface.
- [x] Chat composer should use inline icon actions, Ctrl+Enter submit, Chrome speech recognition, and global toast errors.
- [x] Agent-related node editors should expose plugin auth status where credentials can apply.
- [x] Publishing from the editor should persist pending trigger changes before activating production chat routes.
- [x] Agent runtime failures should expose sanitized provider/configuration details instead of only "Agent execution failed".
- [x] Chat panel should open as `lg`, show the composer immediately at the top, and keep only messages scrollable.
- [x] Chat panel sends into the active Workflow Editor Run dev session when a Chat trigger is waiting, and only uses the published route when no Run session is active.
- [x] Chat panel preserves active Run-session history and renders the AI Agent response from live dev-session events.
- [x] Chat panel opens on the left side with a bottom composer, while Execution remains a bottom panel.
- [x] Chat panel receives `agent:end.output` from dev-session streams so the assistant response appears in Chat after Run-session sends.
- [x] Plugin auth for Chat Model, Memory, and Tool config nodes lives in the Node Settings tab, not the main node editor.
- [x] Chat Model providers resolve credentials from the provider plugin auth when no manual credential id is set.

## Verification Notes

- [x] Automated frontend cluster suite passed.
- [x] Backend agent suite passed.
- [x] Frontend and backend builds passed.
- [x] Focused chat/editor contract tests passed.
- [x] Frontend type-check and production build passed after chat panel polish.
- [x] Publish dirty-state regression test passed.
- [x] Agent runner and chat route regression suites passed.
- [x] Server TypeScript build passed.
- [x] Chat panel layout contracts passed.
- [x] Editor chat dev-session contracts passed.
- [x] Editor chat history/response sync contracts passed.
- [x] Left Chat panel layout contracts passed.
- [x] Agent end output chat sync contracts passed.
- [x] Agent config auth placement contracts passed.
- [x] Model provider plugin-auth credential fallback test passed.
- [x] `npm audit --omit=dev --audit-level=high` exited 0; moderate transitive advisories remain in `ajv` and `uuid`.
- [x] Browser smoke confirmed the AI palette no longer lists `Chat Trigger`, the AI Agent renders `Chat Model*`, `Memory`, and `Tool` handles, and no new console warnings/errors appear.
- [ ] Full manual chat-send smoke with a connected model/tool approval flow still needs a configured model credential.

## Safety Notes

- [x] Agent tools must be explicit opt-in through plugin manifest metadata.
- [x] Side-effect tools must have visible policy and approval defaults.
- [x] Short-term memory must use a real checkpointer.
- [x] Long-term memory must use policy-controlled namespaces.
- [x] Chat Trigger must own session identity and never trust raw `thread_id` from request bodies.
- [x] Execution traces must be redacted and capped.
