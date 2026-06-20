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
  background-color="#0b0b0d"
  pattern-color="rgba(255,255,255,0.08)"
  pattern-style="dot"
  :rulers="true"
  @items-move="applyItemMove"
  @canvas-click="handleCanvasClick"
  @item-click="handleItemClick"
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
- Pages-specific block editing remains in the Pages feature

The prototype should not migrate Workflow Editor yet.

## Testing

Add focused contract tests for:

- BaseCanvas does not require feature-specific item types
- item movement emits generic move events
- snap rounds movement by grid size
- Ctrl or Shift bypasses snap
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
