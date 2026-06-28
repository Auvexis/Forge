# Profile Password Confirmation Design

## Goal

Require password confirmation before accessing a password-protected profile from the Monitoring Panel or switching to it from the Agents Panel.

## Shared component

Create `ProfilePasswordConfirmationDialog.vue` in `client-vue/src/shared/components/overlay/`, composed with `AppDialog.vue`.

The component receives the target profile and open state. It owns the password field, loading state, and validation error. On submit, it verifies the password through the profile store. It emits `confirmed` with the entered password only after successful verification. Closing by Cancel, backdrop, close button, or Escape emits cancellation and clears local state.

Invalid passwords keep the dialog open and show `Invalid password`. Duplicate submissions are disabled while verification is running.

## Monitoring Panel flow

`AppGlobalAutomationMonitor.vue` keeps its current local filter behavior.

- Selecting an unprotected profile updates the filter immediately.
- Selecting a protected profile stores it as pending and opens the confirmation dialog.
- Confirmation applies the pending filter without changing the active global profile.
- Cancellation or validation failure preserves the previous filter.
- The active profile is selected when the panel opens; there is no Global option.

## Agents Panel flow

`AgentDirectoryList.vue` keeps its current active-profile switching behavior.

- Selecting the current profile only closes the menu.
- Selecting an unprotected profile calls `switchProfile(profileId)` immediately.
- Selecting a protected profile stores it as pending and opens the confirmation dialog.
- Confirmation calls `switchProfile(profileId, password)`.
- Cancellation or validation failure preserves the active profile.
- The profile menu closes after a successful switch or cancellation.

## Error handling

Password validation errors are contained in the dialog and cleared from the shared profile store. A switch failure after successful validation leaves the active profile unchanged and keeps the existing store error behavior.

## Tests

Add contract tests for the shared dialog and both integrations. Cover protected and unprotected selection, password forwarding, cancellation preserving state, validation errors, and use of `AppDialog.vue`.

## Implementation tasks

- [x] Add failing shared dialog contract tests.
- [x] Implement the shared confirmation dialog.
- [x] Add failing Monitoring Panel integration tests.
- [x] Gate protected Monitoring profile filters.
- [x] Add failing Agents Panel integration tests.
- [x] Gate protected Agents profile switches.
- [x] Run focused tests, type-check, and build.
- [x] Update `feats-map/` and commit each completed task.

## Panel profile selector follow-up

### Monitoring Panel

- Remove the Global profile option.
- Select the active profile whenever the panel opens.
- Ignore repeated selection before checking password protection.
- Remove automatic polling and refresh only on open or explicit user action.

### Agents Panel

- Replace the custom profile menu with `BaseDropdownSelect`.
- Keep active-profile switching and password confirmation behavior.
- Ignore repeated selection before checking password protection.
- Render no numeric placeholder when the agent list is empty.

### Dialog backdrop

Add a reusable modal backdrop variant to `AppDialog`. The profile password dialog uses the same `rgba(0, 0, 0, 0.55)` backdrop as `BaseModal`, without the blue tint.

### Follow-up tasks

- [x] Add failing Monitoring selector and refresh tests.
- [x] Remove Global, default to active profile, and remove polling.
- [x] Add failing Agents selector test.
- [x] Migrate Agents to `BaseDropdownSelect`.
- [x] Add failing Agents empty-state test.
- [x] Remove the Agents zero placeholder.
- [x] Add failing backdrop contract test.
- [x] Match the password dialog backdrop to `BaseModal`.
- [x] Run focused tests, type-check, and build.
