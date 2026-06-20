# BaseCanvas Design

## Goal

Create a generic infinite DOM/Vue canvas that can be reused by different Sailor features without knowing feature-specific concepts.

The first prototype will be tested in Sailor Pages. Workflow nodes, edges, handles, page blocks, whiteboard shapes, and future tools must live outside the base canvas.

## Boundaries

`BaseCanvas` is responsible for spatial interaction only:

- viewport pan and zoom
- world/screen coordinate conversion
- item positioning
- item selection
- item dragging
- marquee selection
- optional snap-to-grid
- optional visual pattern
- optional passive rulers

`BaseCanvas` must not know about:

- workflow nodes
- workflow edges
- handles
- page blocks
- whiteboard shapes
- persistence
- validation
- feature-specific tools

Feature layers own all permanent meaning and rules.

## Location

All base canvas code and direct helpers must live in a separate shared package:

`client-vue/src/shared/base-canvas/`

Pages-specific adapters, examples, or feature behavior must stay under:

`client-vue/src/features/web-pages/`

Workflow-specific graph behavior must stay under:

`client-vue/src/features/workflow-editor/`

## API Shape

The canvas receives permanent state from the feature and emits generic interaction events.

```vue
<BaseCanvas
  :items="items"
  v-model:selection="selection"
  v-model:viewport="viewport"
  :snap-to-grid="true"
  :grid-size="16"
  :marquee-selection="true"
  background-color="#0b0b0d"
  pattern-color="rgba(255,255,255,0.08)"
  pattern-style="dot"
  marquee-bg="rgba(59,130,246,0.12)"
  marquee-border-style="dashed"
  marquee-border-color="rgba(96,165,250,0.85)"
  :context-menu="true"
  :rulers="true"
  @items-move="applyItemMove"
  @canvas-click="handleCanvasClick"
  @item-click="handleItemClick"
  @context-menu="openFeatureContextMenu"
/>
```

Items are generic positioned records:

```ts
export interface BaseCanvasItem {
  id: string
  x: number
  y: number
  width?: number
  height?: number
  locked?: boolean
  data?: unknown
}
```

Features render item contents through slots, so the base canvas never imports feature components.

## State Model

Feature-controlled state:

- items
- selection
- viewport
- feature tool state
- persistence
- validation
- domain-specific drag rules

BaseCanvas internal temporary state:

- active pointer
- drag start point
- current drag delta
- hover item
- marquee rectangle
- pan gesture state

The base canvas emits final or incremental events. The feature updates the official data.

## Camera And Pointer Controls

Camera movement should follow the Figma-style interaction model.

- Hold `Space` and drag with the primary mouse button to pan the viewport
- Drag with the middle mouse button to pan the viewport
- The primary mouse button without `Space` is reserved for item selection, item dragging, and marquee selection
- Wheel gestures can zoom or scroll according to the final implementation plan, but they must not conflict with the primary selection model

This keeps camera movement explicit and prevents accidental pans during selection or editing.

## Marquee Selection

Marquee selection is part of the MVP.

MVP behavior:

- Enabled by default
- Starts with primary mouse drag on empty canvas space
- Selects items whose bounds intersect the marquee rectangle
- Does not start while panning with `Space`
- Does not start while panning with the middle mouse button
- Does not require the base canvas to know item meaning

The base canvas supports simple marquee customization:

- `marqueeSelection`
- `marqueeBg`
- `marqueeBorderStyle`: `line`, `dot`, or `dashed`
- `marqueeBorderColor`

The marquee rectangle is temporary internal state. The selected ids remain feature-controlled through `v-model:selection`.

## Context Menu

Context menu support is part of the generic canvas event layer, but menu contents live outside the base canvas.

`BaseCanvas` is responsible for:

- detecting the native `contextmenu` gesture
- preventing the browser menu when `contextMenu` is enabled
- calculating screen coordinates
- calculating world coordinates
- distinguishing between empty canvas and generic item targets
- emitting one generic `context-menu` event

Features are responsible for:

- rendering the menu UI
- deciding menu options
- deciding labels, icons, shortcuts, and disabled states
- executing actions
- closing the menu

The event shape should stay generic:

```ts
export interface BaseCanvasContextMenuEvent {
  screen: { x: number; y: number }
  world: { x: number; y: number }
  target: { type: 'canvas' } | { type: 'item'; itemId: string }
  selection: string[]
}
```

Target detection uses the generic item wrapper, not feature knowledge:

- every rendered item wrapper exposes a base canvas item id
- context menu inside that wrapper emits `target.type = 'item'`
- context menu on empty surface emits `target.type = 'canvas'`

The base canvas must not render workflow, Pages, or whiteboard menu options.

## Snap And Movement

Snap-to-grid is enabled by default.

- Default grid size: `16`
- Holding `Ctrl` or `Shift` temporarily disables snap
- On macOS, `Ctrl` and `Shift` remain supported; `Meta` is not a default snap bypass
- Locked items cannot be moved by the base canvas

The snap rule applies only to spatial movement. Feature-specific alignment rules stay outside the base canvas.

## Appearance

The base canvas supports simple visual customization:

- `backgroundColor`
- `patternColor`
- `patternStyle`: `dot`, `square`, or `none`
- `rulers`

The pattern is visual only. It must not affect item data unless snap is enabled.

## Rulers

Rulers are part of the MVP as passive UX aids.

MVP behavior:

- top and left rulers
- fixed visual size
- follow pan and zoom
- show world coordinates
- origin fixed at `0,0`
- no dragging
- no guides
- no unit customization

Implementation preference:

- DOM/Vue for user items
- CSS background for pattern
- small Canvas 2D overlays for ruler ticks and labels

This keeps rulers useful without making them an editing tool.

## Pages Prototype

The first prototype should integrate with Sailor Pages as a feature consumer.

The prototype should prove:

- Pages can render page surfaces as generic canvas items
- Pages owns item data and selection
- BaseCanvas handles pan, zoom, selection, movement, grid, pattern, and rulers
- Pages can use marquee selection without moving camera accidentally
- Pages can open its own context menu from generic canvas or item context events
- Pages-specific block editing remains in the Pages feature

The prototype should not migrate Workflow Editor yet.

## Testing

Add focused contract tests for:

- BaseCanvas does not require feature-specific item types
- item movement emits generic move events
- snap rounds movement by grid size
- Ctrl or Shift bypasses snap
- primary mouse drag on empty space starts marquee selection
- Space with primary mouse drag pans instead of starting marquee selection
- middle mouse drag pans instead of starting marquee selection
- context menu on empty space emits a canvas target
- context menu on an item wrapper emits an item target
- viewport changes emit generic viewport updates
- rulers derive ticks from viewport and zoom without mutating items

Visual verification should include the Pages prototype at desktop size.

## Non-Goals

The MVP will not include:

- workflow edges
- handles
- graph routing
- freehand drawing
- guide dragging from rulers
- undo/redo engine
- clipboard engine
- auto-layout
- item virtualization

These can be added as feature layers or later shared complements after the base canvas proves stable.
