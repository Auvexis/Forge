# Workflow Editor Improvements

## Context

Polish the migrated Workflow Editor without regressing Sailor Pages or reintroducing Vue Flow dependencies.

## Batch 1: Catalog And Colors

- Put Trigger first in Utilities.
- Remove Trigger from Core.
- Keep utility nodes and utility plugins only in Utilities.
- Keep real plugins in their own categories.
- Resolve picker colors from the same presentation source as canvas nodes.

## Batch 2: Edge Routing

- Keep smooth routing for normal forward edges.
- Use orthogonal pipe routing when the target is behind the source or horizontal space is too small.

## Batch 3: Canvas Interaction

- Preserve marquee selection after pointer release.
- Clear selection consistently on empty canvas clicks.
- Add grab and grabbing cursor states for Space and middle-button pan.
- Smooth only programmatic zoom, reset, and fit actions.
- Keep wheel zoom and pan immediate.

## Batch 4: Node Polish

- Increase selected node outline for BaseNode and BaseAdvancedNode.
- Align bottom Quick Add cables with diamond handles and increase their length.
- Give handle labels an opaque backdrop above Quick Add cables.

## Batch 5: Remove Changes

- Remove WorkflowGitChangesWindow and its status-bar action, state, and tests.
- Preserve WorkflowGitModal, history, commits, and remaining Git behavior.

## Safety

- Keep shared BaseCanvas changes generic and covered by Sailor Pages regression tests.
- Make programmatic viewport animation opt-in for Workflow Editor.
- Use focused TDD and rendered validation for canvas and geometry changes.

## Tasks

### Batch 1

- [ ] Test catalog ordering, categories, and color parity.
- [ ] Put Trigger first in Utilities and remove it from Core.
- [ ] Restrict utility items to Utilities.
- [ ] Share canvas node colors with both pickers.
- [ ] Run catalog and picker regression tests.

### Batch 2

- [ ] Test smooth and pipe routing thresholds.
- [ ] Restore automatic pipe routing.
- [ ] Validate edge geometry and rendering.

### Batch 3

- [ ] Test marquee release and empty-canvas deselection.
- [ ] Fix canvas focus and selection gestures.
- [ ] Add pan cursor states.
- [ ] Add opt-in programmatic viewport transitions.
- [ ] Validate Workflow Editor and Sailor Pages.

### Batch 4

- [ ] Test selected outlines and Quick Add geometry.
- [ ] Increase node selected outlines.
- [ ] Align and lengthen bottom Quick Add.
- [ ] Add opaque handle label backdrops.
- [ ] Validate simple and advanced nodes.

### Batch 5

- [ ] Test removal scope for Changes.
- [ ] Remove Changes window, action, and state.
- [ ] Remove obsolete tests and exports.
- [ ] Validate remaining Git workflows.
