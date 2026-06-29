# Global Notifications Design

## Goal

Add a profile-scoped global notification center for errors, warnings, and informational messages. Toasts remain temporary feedback; relevant toast events are also persisted and available from any Sailor shell.

Success notifications are not persisted.

## Architecture

The notification center is a core application capability. It does not belong to a plugin or feature and must not expose engines to plugins.

The implementation is split into independently testable units:

- A dedicated profile database and backend notification module own persistence.
- A frontend API client owns HTTP communication.
- A Pinia store owns notification data and unread state.
- A UI store owns panel and detail-view state.
- A reusable trigger opens the single global panel from different shells.
- The existing toast composable remains responsible for temporary feedback and forwards eligible events to the notification store.

## Profile Database

Each profile has a dedicated `notifications.db` inside its existing profile data directory.

Required profile infrastructure changes:

- Add `notificationsDbPath` to `ProfilePaths`.
- Add `notifications` to `ActiveProfileDatabases` and `ProfileDatabaseManager`.
- Open, migrate, and close the notification database with the active profile.
- Add migrations under `server/src/core/database/migrations/notifications/`.
- Include the database in profile-switch and profile-database tests.

The database uses the same WAL and foreign-key configuration as the other profile databases.

## Data Model

The `notifications` table contains:

- `id`: stable string primary key.
- `level`: `error`, `warning`, or `info`.
- `category`: free-form normalized identifier; defaults to `global`.
- `title`: optional short title.
- `message`: required description.
- `source`: optional producer or route identifier.
- `context_json`: optional structured diagnostic data serialized as JSON.
- `action_url`: optional internal Sailor route.
- `action_label`: optional action text.
- `is_read`: boolean stored as an integer.
- `occurrence_count`: number of coalesced occurrences.
- `created_at`: first occurrence timestamp.
- `last_occurred_at`: latest occurrence timestamp.

Indexes support newest-first listing, unread counts, and category filtering.

The backend retains at most 200 rows per profile. After insertion, rows older than the 200 most recent are removed in the same transaction.

## Categories

Categories are not a fixed backend enum or hardcoded tab list. Producers may supply any normalized category identifier, such as `workflows`, `pages`, or `agents`.

If a producer omits the category, the frontend may infer it from its known feature or route context. If no reliable context exists, it uses `global`.

The API returns category values present in the stored result set. The panel generates its category tabs dynamically and always includes `all`. A frontend metadata registry may optionally provide a friendly label and icon. Unknown categories remain usable and receive a label derived from their identifier.

Existing backend `throw` statements do not need to change. Structured backend errors may add domain metadata later, but are not required by this feature.

## Duplicate Coalescing

Notifications with the same level, category, title, and message within 30 seconds are coalesced. The backend increments `occurrence_count` and updates `last_occurred_at` instead of inserting another row.

Coalescing happens in the repository transaction so multiple frontend surfaces cannot create duplicate rows concurrently.

## Backend Module and API

The backend module lives under `server/src/core/modules/notifications/` and contains focused types, repository, and service units.

Routes use the existing `ApiResponse` envelope:

- `POST /notifications`: persist a notification or coalesce it with a recent match.
- `GET /notifications`: list newest first, with optional `category`, `level`, and `unread` filters.
- `GET /notifications/summary`: return unread count and available categories.
- `PATCH /notifications/:id/read`: mark one notification as read and return it.
- `PATCH /notifications/read-all`: explicitly mark every notification as read.
- `DELETE /notifications/:id`: delete one notification.
- `DELETE /notifications`: delete all notifications for the active profile.

Inputs are validated with Zod. `action_url` accepts internal application paths only and rejects absolute or protocol-relative URLs.

The active profile database provider determines the database used by each request; callers do not send a profile database path.

## Frontend Notification Flow

The existing `useToast` interface remains backward compatible.

`error`, `warning`, and `info` continue to create temporary toast feedback and asynchronously request notification persistence. `success` only creates a temporary toast.

New calls may provide optional notification metadata without requiring existing call sites to migrate immediately:

```ts
toast.error('Workflow could not be saved', {
  title: 'Save failed',
  category: 'workflows',
  source: 'workflow-editor',
  context: { workflowId },
  actionUrl: `/workflows/${workflowId}`,
  actionLabel: 'Open workflow',
})
```

The final overload must preserve existing calls that pass `title` and `duration` positionally.

The notification store loads the active profile's list and summary, performs mutations, and refreshes after profile switches. It may optimistically update read and delete state, but restores server state when a mutation fails.

Notification API failures must not pass through the notification persistence path. Toast display may report the failure once, while an internal suppression option prevents recursive persistence.

Global runtime, Vue, console, and unhandled-promise errors currently forwarded by `globalErrorToasts` are persisted with category `global`.

## UI Composition

`NotificationTrigger.vue` is a reusable component composed with `BaseButton.vue`.

It:

- Shows a bell icon.
- Shows the unread count badge.
- Opens or closes the global notification panel through the UI store.
- Has no knowledge of Sidebar, Topbar, Pages, or panel positioning.

Initial placements are:

- The main Sidebar footer.
- `AppTopbar`.
- The Pages editor topbar through `PageChromeToolbar` when the main Sailor shell is hidden.

All triggers control one `GlobalNotificationPanel.vue` instance mounted in the global overlay host.

The panel enters from the top of the viewport and is centered horizontally. It is not anchored to the trigger. It displays:

- All notifications by default.
- Dynamic category tabs.
- Level filters for errors, warnings, and information.
- Unread styling without changing read state.
- Delete-one, clear-all, and explicit mark-all-read actions.
- Empty, loading, and recoverable error states.

Clear-all requires confirmation.

## Detail Subview

Opening the panel does not mark notifications as read.

Selecting a notification marks only that notification as read through `PATCH /notifications/:id/read` and opens a detail subview inside the panel. The detail shows title, full message, level, category, source, timestamps, occurrence count, and structured context data.

The detail view provides back and delete actions. When both `action_url` and `action_label` are present, it also provides the contextual action. The action closes the panel and navigates through Vue Router.

The detail subview enters smoothly from the right and reverses when returning to the list. The reusable transition classes live in `client-vue/src/assets/styles/transitions.css`.

## Styling and Accessibility

The implementation uses Sailor theme variables from `client-vue/src/assets/styles/tokens.css` for colors, spacing, borders, shadows, typography, motion timing, and z-index. It does not introduce hardcoded visual values where an appropriate token exists.

The panel supports:

- Escape to close.
- Focus entry and restoration to the originating trigger.
- Keyboard navigation for tabs and controls.
- Accessible labels for the trigger, unread badge, filters, and actions.
- Reduced-motion behavior consistent with the existing transition system.

## Error Handling

- Toast feedback remains available when persistence fails.
- Persistence failure is reported at most once and never persisted recursively.
- Invalid or unavailable contextual routes do not prevent opening notification details.
- Missing optional metadata renders a reduced detail view without placeholders.
- A failed optimistic mutation restores or reloads authoritative server state.
- Profile switching clears the previous profile's in-memory notification state before loading the next profile.

## Testing

Backend tests cover:

- Notification database creation, migration, profile isolation, switch, and close behavior.
- Repository create, list, filter, coalescing, retention, read, delete-one, and delete-all behavior.
- Route validation, response envelopes, internal action URL validation, and active-profile isolation.

Frontend tests cover:

- Backward-compatible toast calls and persistence rules by level.
- Recursion suppression when notification persistence fails.
- Store loading, filters, unread count, read, delete, clear, and profile refresh behavior.
- Reusable trigger rendering and badge behavior.
- One global panel controlled by triggers in each initial shell.
- Detail selection marking only the selected item as read.
- Contextual navigation and right-side detail transition.
- Theme-token and accessibility contracts.

## Out of Scope

- Persisting success toasts.
- Rewriting existing backend exceptions.
- Plugin access to notification persistence.
- Cross-device synchronization or external push notifications.
- Arbitrary external action URLs.

## Implementation Batches

> Execute batches in order. Update these checkboxes and commit after every completed task.

### Batch 1: Profile Database Foundation

**Files:**

- Modify `server/src/core/profiles/profile-paths.ts`
- Modify `server/src/core/profiles/profile-database-manager.ts`
- Modify `server/src/core/database/index.ts`
- Create `server/src/core/database/migrations/notifications/001_initial_notifications.ts`
- Modify `server/src/core/profiles/profile-paths.test.ts`
- Modify `server/src/core/profiles/profile-database-manager.test.ts`
- Modify `server/src/core/database/profile-migrations.test.ts`

- [x] Add `notificationsDbPath` and open `notifications.db` per profile.
- [x] Add the notification database to active database lifecycle and migrations.
- [x] Create the notifications table, constraints, and indexes.
- [x] Test profile isolation, database lifecycle, and migration execution.
- [x] Run the three focused database tests with `node --test` and run `npm run build` in `server`.
- [x] Commit as `feat: add profile notification database`.

### Batch 2: Notification Domain and API

**Files:**

- Create `server/src/core/modules/notifications/notification-types.ts`
- Create `server/src/core/modules/notifications/notification-repository.ts`
- Create `server/src/core/modules/notifications/notification-service.ts`
- Create `server/src/core/modules/notifications/notification-repository.test.ts`
- Create `server/src/core/routes/notifications.routes.ts`
- Create `server/src/core/routes/notifications.routes.test.ts`
- Modify `server/src/core/server.ts`

- [x] Define create, list, summary, read, delete, and filter contracts.
- [x] Implement transactional insertion, 30-second coalescing, and 200-row retention.
- [x] Implement newest-first listing, unread summary, mark-one, mark-all, delete-one, and clear-all.
- [x] Validate levels, normalized categories, JSON context, and internal action URLs with Zod.
- [x] Register `/notifications` routes using the active profile database.
- [x] Test filters, coalescing, retention, mutations, validation, and profile isolation.
- [x] Run notification tests and `npm run build` in `server`.
- [x] Commit as `feat: add notification service and endpoints`.

### Batch 3: Frontend API and State

**Files:**

- Create `client-vue/src/core/types/notification.types.ts`
- Create `client-vue/src/core/api/notifications.api.ts`
- Create `client-vue/src/core/api/notifications.api.contract.test.ts`
- Create `client-vue/src/shared/stores/notification.store.ts`
- Create `client-vue/src/shared/stores/notification-ui.store.ts`
- Create `client-vue/src/shared/stores/notification.store.test.ts`
- Modify `client-vue/src/features/profiles/profileSwitchRefresh.ts`

- [x] Define frontend notification, summary, filter, and mutation types.
- [x] Implement API methods for every notification endpoint.
- [x] Implement list, categories, filters, unread count, detail selection, and loading state.
- [x] Implement read-one, read-all, delete-one, and clear-all with failure recovery.
- [x] Clear stale state and reload notifications after profile switches.
- [x] Test API paths, store mutations, unread state, filters, and profile refresh.
- [x] Run focused tests and `npm run type-check` in `client-vue`.
- [ ] Commit as `feat: add notification client state`.

### Batch 4: Toast Integration

**Files:**

- Modify `client-vue/src/shared/composables/useToast.ts`
- Modify `client-vue/src/shared/composables/globalErrorToasts.ts`
- Create `client-vue/src/shared/composables/__tests__/useToastNotifications.test.ts`
- Modify `client-vue/src/shared/composables/__tests__/globalErrorToasts.contract.test.ts`

- [ ] Add optional category, source, context, action, and persistence metadata.
- [ ] Preserve positional title and duration compatibility for existing callers.
- [ ] Persist only error, warning, and info toasts.
- [ ] Keep success toasts temporary only.
- [ ] Add a suppression path so persistence failures cannot persist themselves.
- [ ] Categorize global browser, console, Vue, and promise errors as `global`.
- [ ] Test eligible levels, compatibility, metadata, deduplication, and recursion suppression.
- [ ] Run composable tests and `npm run type-check` in `client-vue`.
- [ ] Commit as `feat: persist global toast notifications`.

### Batch 5: Global Panel and Detail View

**Files:**

- Create `client-vue/src/shared/components/feedback/NotificationTrigger.vue`
- Create `client-vue/src/shared/components/feedback/GlobalNotificationPanel.vue`
- Create `client-vue/src/shared/components/feedback/NotificationList.vue`
- Create `client-vue/src/shared/components/feedback/NotificationDetail.vue`
- Create `client-vue/src/shared/components/feedback/__tests__/globalNotifications.contract.test.ts`
- Modify `client-vue/src/assets/styles/transitions.css`
- Modify `client-vue/src/app/App.vue`

- [ ] Build the `BaseButton`-based bell trigger and unread badge.
- [ ] Build the top-centered global panel with level filters and dynamic category tabs.
- [ ] Build list states without marking items read when the panel opens.
- [ ] Mark one item read only when its detail is selected.
- [ ] Build the detail subview with metadata, context, deletion, and internal navigation action.
- [ ] Add reversible right-slide detail animation and reduced-motion behavior.
- [ ] Add explicit mark-all-read and confirmed clear-all actions.
- [ ] Use existing `tokens.css` variables for all visual decisions.
- [ ] Add Escape handling, focus restoration, keyboard navigation, and accessible labels.
- [ ] Mount exactly one panel in the global overlay host.
- [ ] Run component tests, `npm run type-check`, and `npm run build` in `client-vue`.
- [ ] Commit as `feat: add global notification panel`.

### Batch 6: Shell Integration and Final Verification

**Files:**

- Modify `client-vue/src/app/App.vue`
- Modify `client-vue/src/shared/components/layout/AppTopbar.vue`
- Modify `client-vue/src/features/web-pages/components/PageChromeToolbar.vue`
- Modify relevant layout and Pages contract tests under `client-vue/src/**/__tests__/`
- Create `feats-map/global-notifications-20260628.md`

- [ ] Add the reusable trigger to the main Sidebar footer.
- [ ] Add the reusable trigger to `AppTopbar`.
- [ ] Add the reusable trigger to the Pages editor topbar.
- [ ] Verify all triggers control the same global panel and unread count.
- [ ] Verify error, warning, and info persistence across reload and profile switches.
- [ ] Verify success toasts are never stored.
- [ ] Verify category filters, detail read state, actions, deletes, retention, and coalescing.
- [ ] Run `node --test "src/**/*.test.ts"` and `npm run build` in `server`.
- [ ] Run `node --test "src/**/*.test.ts"`, `npm run type-check`, and `npm run build` in `client-vue`.
- [ ] Update the feature map and mark every completed batch.
- [ ] Commit as `docs: complete global notifications tasks`.
