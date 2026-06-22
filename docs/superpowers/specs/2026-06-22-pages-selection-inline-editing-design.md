# Pages Selection and Inline Editing Design

## Scope

- Replace the low-contrast selection frame with a clear blue frame and larger corner handles.
- Add an editable block ID badge at the top-left of the selected element.
- Add duplicate and delete actions at the top-right.
- Enable direct text editing for text, button, and link blocks.

## Selection Controls

The selected editable block renders a blue solid frame with four white-centered blue handles. A badge above the top-left corner displays the internal `block.id`, matching the Tree label. Double-clicking the badge opens a compact input. Enter or blur confirms, Escape cancels. Empty or duplicate IDs are rejected and the previous value remains.

A compact action group above the top-right corner contains duplicate and delete icon buttons. These controls reuse the existing `duplicate-block` and `delete-block` events. Pointer events on badges, buttons, and handles never start block drag or resize accidentally.

## Inline Text Editing

Double-clicking a text, button, or link block enters inline edit mode instead of opening the Inspector. The rendered element becomes contenteditable, receives focus, selects its text, and disables block dragging. Enter confirms single-line content, Shift+Enter is allowed, Escape restores the original value, and blur confirms. The final value is emitted as a block patch for `props.text`, preserving the existing Inspector and undo/redo synchronization.

Non-text blocks keep the existing double-click behavior that opens the Inspector.

## Architecture

- `BlockRenderer` owns selection chrome and transient inline editing state.
- `PageCanvas` forwards rename, patch, duplicate, and delete events.
- `PageEditor` applies rename and text patches through `page-editor.store`.
- Existing store operations remain the source of truth, so Tree and Inspector update automatically.

## Verification

Focused component contracts cover blue selection chrome, four handles, ID editing, action buttons, and contenteditable scope. Existing store tests cover rename, duplicate, delete, patch, and undo behavior. The Pages suite and client type-check must pass.
