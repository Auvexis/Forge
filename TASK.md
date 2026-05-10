# Universe Mode MVP Tasks

## Discovery Summary

- Branch: `dev` at `ddab681` (`style(ui): replace textarea with realistic radio button group in form theme preview`).
- Current worktree note: root `TASK.md` was deleted before this task started; this file replaces it for Universe Mode tracking.
- Server architecture: Fastify routes expose generic plugin data through `/plugins`; plugin loading/registration lives under `server/src/core/modules/plugins/` and should stay unchanged for this MVP.
- Client architecture: Vue Router is defined in `client-vue/src/app/router.ts`; non-public routes render inside `client-vue/src/app/App.vue` through `AppShell`, `AppSidebar`, `SidebarGlobalPanel`, `AppPage`, and `GlobalAppPanel`.
- UI state: Pinia stores already exist for sidebar panels, app panels, and settings. Universe Mode needs a dedicated global UI mode store that can close/hide chrome without embedding that logic in the Universe page.
- Plugin data: client plugin summaries are already available through `pluginsApi.getAll()` and `PluginSummary`; Universe should consume those summaries as presentation data only.
- 3D stack: the client currently has no `three` or TresJS dependency installed. The MVP should add the smallest needed Three.js/TresJS dependencies on the client only.

## Implementation Tasks

- [x] **Task 1: Analyze architecture and create Universe task plan**
  - Read latest commits and inspect `server/` and `client-vue/`.
  - Identify routing, shell/layout, plugin API, plugin engine boundaries, and UI stores.
  - Create this root `TASK.md`.
  - Commit message: `docs: plan universe mode mvp`

- [x] **Task 2: Add global Universe Mode UI state**
  - Create a Pinia store for app UI mode with `isUniverseMode`, `enterUniverseMode()`, and `quitUniverseMode()`.
  - The store should remember and restore relevant global UI state: sidebar panel, app panel, and settings panel visibility.
  - Keep this store generic to app chrome; do not reference plugin runtime details.
  - Wire `App.vue` and layout chrome so Universe Mode can hide sidebar, docks, panels, and overlays while preserving the routed page.
  - Mark this task done and commit with `feat(ui): add universe mode chrome state`.

- [x] **Task 3: Replace `/plugins` route with `/universe` shell**
  - Replace the sidebar navigation target from `/plugins` to `/universe`.
  - Replace the router page entry with a Universe page and title.
  - Keep `/plugins` out of the primary route surface; if a compatibility redirect is needed, redirect `/plugins` to `/universe` without creating a second explorer.
  - Add `client-vue/src/features/universe/` with `components/`, `composables/`, `systems/`, `stores/`, `shaders/`, `utils/`, `types/`, and `universe.css`.
  - Import the feature CSS through the global CSS entry.
  - Mark this task done and commit with `feat(universe): add immersive route shell`.

- [x] **Task 4: Build plugin universe data layer**
  - Add Universe-specific types that adapt `PluginSummary` into scene nodes without changing the core plugin contract.
  - Fetch plugin summaries with `pluginsApi.getAll()`.
  - Derive stable node positions, colors, labels, icon URLs/Lucide icon names, category grouping, and lightweight LOD metadata in feature-local utilities.
  - Provide loading and error states for the Universe page.
  - Mark this task done and commit with `feat(universe): map plugins to scene nodes`.

- [ ] **Task 5: Add Three.js/TresJS dependencies and base scene**
  - Add client dependencies for Three.js/TresJS using the smallest current stable package set.
  - Implement a fullscreen Universe scene component with renderer lifecycle cleanup.
  - Add ND8 logo/loading transition and fade into the scene.
  - Add a dark cinematic background, galaxy core, spiral particles, slow rotation, and a safe camera minimum distance from the core.
  - Avoid heavy post-processing and physics.
  - Mark this task done and commit with `feat(universe): render galaxy scene`.

- [ ] **Task 6: Add plugin nodes, LOD, and interactions**
  - Render nearby plugins as square cards with plugin logo/icon and far plugins as lightweight colored particles.
  - Implement distance-based LOD/culling in the Universe feature systems.
  - Add hover glow, focused state, click-to-focus, and a future-ready details panel.
  - Keep marketplace language/data hooks feature-local and presentation-only.
  - Mark this task done and commit with `feat(universe): add plugin orbit nodes`.

- [ ] **Task 7: Add camera controls and exit behavior**
  - Implement smooth camera damping, simple controlled movement, orbit/focus mode, and cinematic fly-to-plugin transitions.
  - Add ESC handling that calls `quitUniverseMode()` and restores normal UI chrome.
  - Ensure entering `/universe` calls `enterUniverseMode()` and leaving the route restores the UI.
  - Mark this task done and commit with `feat(universe): add camera and exit controls`.

- [ ] **Task 8: Polish MVP and verify**
  - Run client type-check/build and any relevant server checks if touched.
  - Start the local app and visually QA `/universe` at desktop and one mobile viewport.
  - Confirm `/workflows` normal UI restores after exiting Universe Mode.
  - Fix layout overlap, blank canvas, console errors, and obvious FPS hazards.
  - Mark this task done and commit with `test(universe): verify mvp experience`.
