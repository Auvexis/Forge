# Execution Run Tree

## Goal

Replace flat execution timelines with a two-level Runs and Run Detail experience in the Workflow Editor and global Automation Monitor.

## Experience

- Open on a list of all runs for the selected workflow.
- Selecting a run slides its detail view in from the right over the runs list.
- Back returns to the preserved runs list, scroll position, and filters.
- Run Detail uses a tree on the left and selected-node details on the right.
- The tree contains only nodes that participated in the selected execution.
- Parent-child relationships follow workflow edges, including advanced configuration nodes.
- Vertical and horizontal connector lines visually attach every child to its parent.
- Branches expand and collapse with token-based transitions.

## Presentation

- Tree rows and detail headers use each node's actual name, icon, and icon color.
- Icons are larger, borderless, and have no background container.
- UI icons use `LucideIcon`; actions use `BaseButton`.
- Colors, spacing, typography, durations, and easing use existing Fabric tokens.
- Dark and light themes require no component-specific hardcoded surface colors.

## Architecture

- Add shared execution-tree model helpers and focused UI components under `shared/components/execution`.
- Consumers provide workflow definitions and execution logs; shared code does not import Workflow Editor modules.
- Normalize live editor events and persisted logs into one run-detail model.
- Extend production status data with the published workflow definition so the global monitor has nodes and edges.
- Keep editor-specific live state adaptation inside `ExecutionBottomPanel`.
- Keep profile-scoped loading and monitor state inside `AppGlobalAutomationMonitor`.

## Tree Rules

- Filter the graph to executed node IDs before building hierarchy.
- Use the execution trigger as the first root when available.
- Preserve workflow edge order for siblings.
- Keep disconnected executed nodes as additional roots in execution order.
- Collapse branches independently; selecting a row does not collapse it.
- Show input, output, error, duration, attempts, and retries in the inspector when available.
- Large payloads retain the existing guarded preview behavior.

## Data Contract

- `ProductionWorkflowStatus` includes the published `WorkflowItem` definition.
- Execution logs remain the source of status, timing, payload, attempts, and retries.
- Missing graph or node metadata degrades to flat roots with generic icons, never invented relationships.

## Safety

- Preserve profile isolation in global monitor endpoints.
- Preserve live execution updates and existing history loading.
- Keep payload rendering text-only; do not use `v-html`.
- Cover hierarchy, fallback roots, adapters, transitions, icons, navigation, and both consumers with focused tests.

## Tasks

### Batch 1: Shared Model

- [x] Test executed graph hierarchy and fallback roots.
- [x] Add shared run, tree, and presentation types.
- [x] Build tree and run-detail adapters.
- [x] Validate model helpers.

### Batch 2: Shared UI

- [x] Test Runs and Run Detail component contracts.
- [x] Build runs list and right-slide navigation.
- [x] Build collapsible connector tree.
- [x] Build node payload inspector.
- [x] Validate tokens, icons, and base controls.

### Batch 3: Monitor Contract

- [x] Test published workflow definition exposure.
- [x] Include definition in production status.
- [x] Update frontend API types.
- [x] Validate profile isolation.

### Batch 4: Workflow Editor

- [x] Test live and historical run adapters.
- [x] Replace flat Execution panel timeline.
- [x] Preserve large-output guards and live updates.
- [x] Validate editor run navigation.

### Batch 5: Global Monitor

- [x] Test monitor run-tree integration.
- [x] Replace flat monitor timeline.
- [x] Preserve workflow, profile, and trigger filters.
- [x] Validate global run navigation.

### Batch 6: Final Validation

- [x] Run focused frontend and backend tests.
- [x] Run frontend type-check.
- [x] Verify dark/light token usage and responsive layout.
- [x] Record browser QA availability.

Browser QA was unavailable in this session because the workspace has no Playwright dependency or browser tool. Static token and responsive-layout checks passed.
