# Workflow Chat Status Bar Design

## Goal

Make Chat Trigger testing available from the Workflow Editor workspace, next to execution tooling, instead of hiding it inside the trigger inspector textarea.

## Product Shape

The Workflow Editor gets a VS Code-style status bar pinned to the bottom of the editor content. The bar is always visible and acts as the controller for bottom dock panels.

The first supported status bar actions are:

- `Chat`: opens the workflow chat bottom panel.
- `Execution`: opens the existing execution bottom panel.

The active button reflects the currently open bottom panel. Clicking a different button swaps the bottom panel content in place. Clicking the active button closes the panel.

## Chat Panel

Create `WorkflowChatBottomPanel.vue` as the chat sibling of `ExecutionBottomPanel.vue`. It follows the same operational layout: compact top bar, scrollable body, and dense controls. It reuses the same chat session behavior as `ChatSessionPanel`, but the user no longer needs to select or edit the Trigger node to send a test message.

When the workflow has no chat trigger slug, the panel shows a compact empty state telling the user to configure `Trigger Type = Chat`. When a chat slug exists, it renders the chat session with the trigger title or `Agent Chat`.

## Editor Wiring

`WorkflowEditorPage.vue` owns the status bar and opens bottom panels through `useAppPanelStore`.

Panel ids:

- `workflow-chat-bottom-panel`
- `workflow-execution-bottom-panel`

The old single-button `workflow-status-bar` becomes a real multi-action status bar. The chat button derives availability from `workflowStore.activeWorkflow.trigger.type === 'chat'` and `trigger.chatSlug`.

## Inspector Behavior

`ChatTriggerEditor.vue` should stop embedding a full chat test panel. It can expose chat configuration fields and a lightweight prompt to use the status bar. This avoids two disconnected chat surfaces with separate local session state.

## Testing

Add contract tests that prove:

- the workflow page imports and opens `WorkflowChatBottomPanel`;
- the status bar exposes `Chat` and `Execution` actions;
- the active panel state is derived from `appPanelStore.panelId`;
- `WorkflowChatBottomPanel` reuses `ChatSessionPanel`;
- empty chat state appears when no slug is configured;
- `ChatTriggerEditor` no longer embeds `ChatSessionPanel`.
