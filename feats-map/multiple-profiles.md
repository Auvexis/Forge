# Multiple Profiles Implementation Plan

> Owner: backend first, frontend after API is stable.
> Date: 2026-05-17.
> Rule: implement with TDD, mark each completed task here, and commit after each completed task.

## Goal

Add support for multiple Sailor profiles. Each profile owns its configuration, workflows, credentials, plugin settings, and installed plugin state. The app should run with one active profile at a time, and switching profiles must never mix data across profiles.

## Architecture Decision

Use one active profile per backend process/UI session.

- Global Sailor home keeps only global concerns: profile index, global plugin cache, global external plugin files, logs, and future app-wide metadata.
- Each profile gets its own directory under `SAILOR_HOME/profiles/{profileId}`.
- Each profile owns its own `data/app.db`, `data/workflows.db`, `data/plugins.db`, and `data/credentials.db`.
- Existing repositories and services must receive profile-scoped dependencies instead of reading static global database handles directly.
- Plugin code must stay isolated. Do not import core internals inside plugins.
- Switching profile closes active profile databases, opens target profile databases, runs migrations if needed, reloads profile plugin state, and resyncs workflow scheduling.
- It is acceptable during development to delete `%AppData%/Sailor` manually before testing. Application code must not delete user data implicitly.

## Target Profile Shape

```text
%AppData%/Sailor/
  profiles.json
  global/
    plugins/
  profiles/
    default/
      profile.json
      plugin-settings.json
      data/
        app.db
        workflows.db
        plugins.db
        credentials.db
    {profileId}/
      profile.json
      plugin-settings.json
      data/
        app.db
        workflows.db
        plugins.db
        credentials.db
```

## Backend Tasks

- [ ] Task 1: Baseline and safety check
  - Read `DEFAULT_PROMPT.md`, `ROADMAP.md`, current profile runtime files, database manager, plugin loader, workflow repository, credential store, and routes.
  - Run current backend tests before implementation.
  - Document known dirty files and do not include unrelated user changes in commits.
  - Commit only this plan when reviewed.

- [ ] Task 2: Define profile domain types
  - Add `server/src/core/profiles/profile-types.ts`.
  - Define `ProfileId`, `ProfileSummary`, `ProfileManifest`, `CreateProfileInput`, `UpdateProfileInput`, and validation helpers.
  - Add tests for valid IDs, invalid IDs, duplicate display names, reserved path names, and unsafe path traversal.
  - Expected result: profile identity rules are centralized and independent from filesystem/database logic.

- [ ] Task 3: Add profile path resolver
  - Add `server/src/core/profiles/profile-paths.ts`.
  - Resolve profile directories, profile manifest path, plugin settings path, and profile data directory from `SAILOR_HOME`.
  - Ensure all resolved paths stay under `SAILOR_HOME/profiles`.
  - Add tests for Windows-safe paths and traversal rejection.
  - Expected result: no service builds profile paths manually.

- [ ] Task 4: Add profile store
  - Add `server/src/core/profiles/profile-store.ts`.
  - Manage `profiles.json` as the global profile index.
  - Support list, get current profile, create, rename/update metadata, set current profile, and delete non-active profiles.
  - Ensure default profile exists on first boot.
  - Add tests for first-run bootstrap, persistence, duplicate IDs, switching, and delete guards.
  - Expected result: profile metadata is stored once and has no database dependency.

- [ ] Task 5: Split global runtime from active profile runtime
  - Refactor `server/src/core/runtime/sailor-home.ts` to expose global paths and active-profile path helpers separately.
  - Keep legacy compatibility only where needed for first development reset/migration.
  - Avoid copying legacy databases into global `data` for new profile-scoped databases.
  - Add tests for first boot with no Sailor home and with existing default profile files.
  - Expected result: runtime path ownership is explicit.

- [ ] Task 6: Add profile database manager
  - Add `server/src/core/profiles/profile-database-manager.ts`.
  - Manage database handles for one active profile.
  - Provide `open(profilePaths)`, `close()`, and getters for `app`, `workflows`, `plugins`, and `credentials`.
  - Ensure repeated switches close old handles before opening new ones.
  - Add tests that create two temp profiles and verify separate database files are opened.
  - Expected result: database lifetime belongs to active profile runtime.

- [ ] Task 7: Run migrations per profile
  - Refactor `server/src/core/database/index.ts` to initialize databases for the active profile manager.
  - Keep migration registry reusable per database group.
  - Add tests proving migrations run independently for profile A and profile B.
  - Expected result: every profile has complete schema without sharing rows.

- [ ] Task 8: Add active profile service
  - Add `server/src/core/profiles/active-profile-service.ts`.
  - Own startup activation and profile switching flow.
  - Sequence: load profile index, resolve profile paths, open DBs, run migrations, load profile plugin settings, load plugins, resync scheduler.
  - On switch failure, keep the previous active profile usable.
  - Add tests with fakes for database manager, plugin loader, and scheduler.
  - Expected result: profile switching is a single coordinated responsibility.

- [ ] Task 9: Refactor workflow repository to profile-scoped database access
  - Replace module-level `DatabaseManager.workflows` usage with injected database/provider access.
  - Preserve existing workflow API behavior.
  - Add isolation tests: create workflow in profile A, switch to profile B, verify it is absent, switch back and verify it returns.
  - Expected result: workflows are profile-owned.

- [ ] Task 10: Refactor credentials and OAuth sessions to profile-scoped database access
  - Replace module-level `DatabaseManager.credentials` usage in credential store and related routes/services.
  - Keep encryption behavior unchanged.
  - Add tests for credential isolation and OAuth session isolation between profiles.
  - Expected result: credentials never leak across profiles.

- [ ] Task 11: Refactor app settings/global variables to profile scope
  - Decide which current app settings are profile-owned.
  - Move public URL/global variables/settings reads to active profile `app.db` unless explicitly app-wide.
  - Add tests for settings isolation across profiles.
  - Expected result: profile configuration is independent.

- [ ] Task 12: Refactor plugin registry state to profile scope
  - Use active profile `plugins.db` for installed/registered plugin state.
  - Keep source plugin files global when installed for all profiles.
  - Keep `plugin-settings.json` per profile.
  - Add tests for enabled plugins per profile and registry row isolation.
  - Expected result: plugin install/enabled state is profile-owned.

- [ ] Task 13: Preserve external plugin install scopes
  - Update current `current_profile` and `all_profiles` install behavior to use real profiles.
  - `current_profile`: install/enable only active profile.
  - `all_profiles`: enable for every existing profile and set default behavior for future profiles if supported.
  - Add tests for both scopes.
  - Expected result: current profile scope becomes real, not an alias for default.

- [ ] Task 14: Add profile API routes
  - Add `server/src/core/routes/profiles.routes.ts`.
  - Endpoints:
    - `GET /profiles`
    - `GET /profiles/current`
    - `POST /profiles`
    - `PATCH /profiles/:profileId`
    - `POST /profiles/:profileId/switch`
    - `DELETE /profiles/:profileId`
  - Validate inputs and return stable error codes.
  - Protect active profile deletion.
  - Add route tests for happy paths and validation failures.
  - Expected result: frontend can manage profiles without touching filesystem details.

- [ ] Task 15: Wire existing backend routes through active profile dependencies
  - Update workflows, credentials, plugins, and app routes to read from active profile services.
  - Add current profile metadata to app bootstrap response if there is an existing endpoint for app info.
  - Add integration tests for profile switch followed by existing route calls.
  - Expected result: existing API surface automatically respects active profile.

- [ ] Task 16: Scheduler and runtime lifecycle safety
  - Stop or pause scheduled jobs before switching profile.
  - Reschedule only workflows from the new active profile.
  - Ensure in-flight execution uses the profile it started with or is rejected with a clear error if switching makes it unsafe.
  - Add tests for scheduler reset on profile switch.
  - Expected result: workflow execution cannot run under the wrong profile.

- [ ] Task 17: Backend smoke and development reset
  - Manually delete `%AppData%/Sailor` for a clean development boot if needed.
  - Start backend and verify default profile bootstrap.
  - Create a second profile, add data to both profiles, switch between them, and verify isolation.
  - Run backend test suite.
  - Expected result: backend is stable from clean state and after switching profiles.

## Frontend Tasks

- [ ] Task 18: Add profiles API client
  - Add `client-vue/src/core/api/profiles.api.ts`.
  - Use existing API client patterns.
  - Add types matching backend responses.
  - Expected result: profile API access is centralized.

- [ ] Task 19: Add profile store
  - Add a small profile store using the existing frontend state pattern.
  - Support loading profiles, creating profile, switching active profile, renaming, and deleting non-active profiles.
  - Ensure failed switch keeps current UI state.
  - Add tests if the project already has store tests for similar modules.
  - Expected result: profile state has one frontend owner.

- [ ] Task 20: Add profile switcher UI
  - Replace the current static profile/control area in `AppSidebar.vue` with a profile switcher component.
  - Add `client-vue/src/shared/components/layout/ProfileSwitcher.vue`.
  - Use compact app-sidebar styling, not a marketing-style panel.
  - Include loading, empty, active, error, create, rename, delete, and switch states.
  - Expected result: user can manage profiles from the app shell.

- [ ] Task 21: Refresh app state on profile switch
  - Clear and refetch workflows, plugin catalog/state, credentials/settings, and canvas data after successful switch.
  - Avoid stale active-profile data in stores.
  - Add focused tests or manual browser verification for switching profiles.
  - Expected result: UI always reflects the active profile.

- [ ] Task 22: Frontend smoke test
  - Start backend and frontend locally.
  - Open app in browser.
  - Create profile A and profile B.
  - Create or import workflows/plugins/settings in A.
  - Switch to B and verify A data is absent.
  - Switch back to A and verify data returns.
  - Expected result: user-facing profile isolation works.

## Final Verification Tasks

- [ ] Task 23: Full regression run
  - Run backend tests.
  - Run frontend tests/typecheck/build according to project scripts.
  - Run a manual profile isolation smoke.
  - Run `git diff --check`.
  - Expected result: no test, type, build, or whitespace regression.

- [ ] Task 24: Update docs and roadmap
  - Update `ROADMAP.md` only if requested or if the repo already tracks completed feature status there.
  - Add short development reset notes if there is an existing developer docs location.
  - Mark every completed task in this file.
  - Commit final docs separately.
  - Expected result: implementation status is discoverable.

## Risk Controls

- Do not spread raw `profileId` plumbing through every plugin method. Core owns profile context.
- Do not let plugins import profile/database internals.
- Do not keep static module-level database handles in repositories after this work.
- Do not auto-delete `%AppData%/Sailor`; manual deletion is allowed only for local development testing.
- Do not switch profiles without closing old SQLite handles.
- Do not allow path traversal or arbitrary filesystem profile paths.
- Do not mix global plugin source files with profile plugin enabled/installed state.
- Do not update unrelated dirty files in commits.

## Manual Acceptance Criteria

- Fresh boot creates the default profile.
- User can create, rename, switch, and delete non-active profiles.
- Workflows are isolated per profile.
- Credentials and OAuth sessions are isolated per profile.
- Plugin enabled/installed state is isolated per profile.
- Installing a plugin for current profile does not enable it in another profile.
- Installing a plugin for all profiles enables it everywhere expected.
- Scheduler only runs workflows from the active profile.
- UI never shows stale data from the previous profile after switching.
