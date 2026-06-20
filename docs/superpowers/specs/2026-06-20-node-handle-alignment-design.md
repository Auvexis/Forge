# Node Handle Alignment Design

## Goal

Keep every workflow handle centered on its node border, with half of the handle inside and half outside, regardless of side, variant, or node shell.

## Root Cause

Automatic handles rely on Vue Flow positioning while configured handles override `position` and `inset` in `BaseNode`. Diamond handles also replace Vue Flow's translation with rotation. These competing transforms produce different offsets for automatic, configured, circle, bar, and diamond handles.

## Design

- `BaseHandle` owns handle size, border anchoring, side translation, and diamond rotation.
- Every side uses an explicit 50% perpendicular translation from the border.
- Diamond rotation is composed with the side translation instead of replacing it.
- `BaseNode` owns only the distribution of multiple configured handles along an edge.
- Configured-handle containers sit exactly on the corresponding node border.
- `BaseAdvancedNode` continues composing `BaseNode` without separate handle geometry.

## Behavior

- Left and right handles are vertically centered on their assigned edge position.
- Top and bottom handles are horizontally centered on their assigned edge position.
- Single automatic handles remain centered on the side.
- Multiple configured handles remain evenly distributed.
- Circle, bar, and diamond variants share the same border overlap.
- Labels and quick-add controls remain outside the node without changing handle alignment.

## Verification

- Add contract coverage for explicit four-side translations and composed diamond rotation.
- Add contract coverage preventing configured handlers from clearing required geometry.
- Run focused component tests and Vue type checking.
- Validate the workflow canvas visually when a runnable authenticated local flow is available.
