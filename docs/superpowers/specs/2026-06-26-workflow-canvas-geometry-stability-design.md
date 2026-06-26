# Workflow Canvas Geometry Stability

## Context

The Vue Flow migration exposed timing and layer-order regressions in Quick Add and edge rendering. The shared `BaseCanvas.vue` already powers Sailor Pages and must remain unchanged.

## Design

- Place Quick Add nodes from the source handle geometry.
- Align the new input handle vertically with the source handle.
- Use a larger fixed horizontal gap between handles.
- Make handle geometry changes reactive to edge layers.
- Preserve the last valid edge geometry during transient UI updates.
- Render persistent edges below workflow nodes.

## Safety

- Do not modify `BaseCanvas.vue`.
- Keep changes inside Workflow Editor.
- Cover placement, invalidation, geometry retention, and layer order with regression tests.
- Validate Quick Add, zoom, pan, panels, BaseNode, and BaseAdvancedNode.

