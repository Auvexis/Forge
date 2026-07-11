# Workflow Editor Improvements

## Context

Polish the migrated Workflow Editor without regressing Fabric Pages or reintroducing Vue Flow dependencies.

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

- Keep shared BaseCanvas changes generic and covered by Fabric Pages regression tests.
- Make programmatic viewport animation opt-in for Workflow Editor.
- Use focused TDD and rendered validation for canvas and geometry changes.

## Tasks

### Batch 1

- [x] Test catalog ordering, categories, and color parity.
- [x] Put Trigger first in Utilities and remove it from Core.
- [x] Restrict utility items to Utilities.
- [x] Share canvas node colors with both pickers.
- [x] Run catalog and picker regression tests.

### Batch 2

- [x] Test smooth and pipe routing thresholds.
- [x] Restore automatic pipe routing.
- [x] Validate edge geometry and SVG contracts; browser QA unavailable.

### Batch 3

- [x] Test marquee release and empty-canvas deselection.
- [x] Fix canvas focus and selection gestures.
- [x] Add pan cursor states.
- [x] Add opt-in programmatic viewport transitions.
- [x] Validate Workflow Editor and Fabric Pages.

### Batch 4

- [x] Test selected outlines and Quick Add geometry.
- [x] Increase node selected outlines.
- [x] Align and lengthen bottom Quick Add.
- [x] Add opaque handle label backdrops.
- [x] Validate simple and advanced nodes; browser QA unavailable.

### Batch 5

- [x] Test removal scope for Changes.
- [x] Remove Changes window, action, and state.
- [x] Remove obsolete tests and exports.
- [x] Validate remaining Git workflows.

### Batch 4 Follow-up

- [x] Test vertical Quick Add center alignment.
- [x] Center and enlarge vertical Quick Add.
- [x] Render handler labels with BaseBadge.
- [x] Validate advanced node handle geometry; browser QA unavailable.

### Batch 4 Cable Correction

- [x] Test diamond-to-cable continuity.
- [x] Remove the vertical cable margin gap.
- [x] Lengthen only the cable and restore button size.
- [x] Validate advanced node Quick Add geometry; browser QA unavailable.

### Canvas Polish Follow-up

- [x] Test required marker color.
- [x] Render required marker in red.
- [x] Test zoom-only reset coordinates.
- [x] Preserve viewport x and y on Reset Zoom.
- [x] Validate node and canvas contracts; browser QA unavailable.

### New Workflow Save Failure

- [x] Test failed-save route preservation.
- [x] Return save success from the workflow store.
- [x] Skip Git refresh and navigation after save failure.
- [x] Validate draft and persisted save flows.
