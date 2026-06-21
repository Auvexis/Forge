# Pages Toolbox, Selection, and Resize Design

## Scope

- Remove the floating canvas toolbar, contextual block toolbar, and Add Page canvas button.
- Add Page to the Explorer Toolbox.
- Create a page at the end on click or at the canvas drop position on drag.
- Replace the animated dashed selection with a solid offset frame and four corner handles.
- Resize selected elements through the corner handles.

## Page Toolbox Behavior

Page is a Toolbox entity distinct from HTML blocks. Clicking it creates a blank page after the last page. Dragging it uses a dedicated page MIME payload and displays a page insertion indicator between canvas page items. Dropping creates a blank page at that index, activates it, and preserves the canvas layout order.

## Selection and Resize Behavior

The selected block receives a thin solid accent frame outside its bounds and one square handle at each corner. Dragging a handle anchors the opposite corner. Images preserve aspect ratio by default; holding Shift enables free resizing. Text elements change box width from horizontal movement and font size from vertical movement. Other blocks resize width and height freely.

Resize values are clamped to usable minimums. A compact live indicator shows width and height, or width and font size for text. Pointer events on handles do not trigger block selection, dragging, or text editing. The final values are persisted through the existing block patch flow and participate in undo/redo.

## Architecture

- `PageToolboxPanel` emits click actions and dedicated page drag metadata.
- `PageEditor` owns page insertion intent because it already coordinates the Toolbox, BaseCanvas, routing, and page store.
- `pages.store` exposes indexed page creation so ordering remains a store concern.
- `BlockRenderer` owns resize interaction and emits style patches; `PageEditor` applies them through the editor store.
- Pure resize calculations live in a focused utility and are unit tested independently.

## Verification

Contract tests cover removed controls and event wiring. Store tests cover indexed page creation. Unit tests cover resize geometry, aspect locking, text sizing, and clamps. The client type check and affected web-pages tests must pass.
