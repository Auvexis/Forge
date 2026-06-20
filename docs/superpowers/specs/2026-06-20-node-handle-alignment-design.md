# Node Handle Alignment Design

## Goal

Keep every workflow handle centered on its node border, with half of the handle inside and half outside, regardless of side, variant, or node shell.

## Root Cause

`BaseEdge` renders paths from the `sourceX`, `sourceY`, `targetX`, and `targetY` coordinates measured by Vue Flow. Automatic handles preserve Vue Flow positioning, while configured handles override `position` and `inset` in `BaseNode`. Diamond handles also replace Vue Flow's positioning transform with rotation. The visible handle therefore moves away from the coordinate registered as the edge endpoint.

## Design

- `BaseEdge` consumes Vue Flow endpoint coordinates without visual compensation or side-specific offsets.
- The `BaseHandle` root remains the absolute element measured and positioned by Vue Flow.
- Every handle root stays centered on its assigned border coordinate.
- Variant visuals, including diamond rotation, are rendered inside the measured handle root so transforms cannot change its registered center.
- `BaseNode` owns only the distribution of multiple configured handles along an edge and does not clear Vue Flow positioning properties.
- Configured-handle containers provide explicit edge-relative coordinates to each handle.
- `BaseAdvancedNode` continues composing `BaseNode` without separate handle geometry.

## Behavior

- Left and right handles are vertically centered on their assigned edge position.
- Top and bottom handles are horizontally centered on their assigned edge position.
- Single automatic handles remain centered on the side.
- Multiple configured handles remain evenly distributed.
- Circle, bar, and diamond variants share the same border overlap.
- Edge paths start and end at the visible center of their source and target handles.
- Labels and quick-add controls remain outside the node without changing handle alignment.

## Verification

- Add contract coverage ensuring variant transforms do not affect the measured handle root.
- Add contract coverage preventing configured handlers from clearing Vue Flow positioning geometry.
- Add contract coverage ensuring `BaseEdge` uses measured endpoint coordinates without compensating offsets.
- Run focused component tests and Vue type checking.
- Validate the workflow canvas visually when a runnable authenticated local flow is available.
