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
- The Global option never requires confirmation.

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

- [ ] Add failing shared dialog contract tests.
- [ ] Implement the shared confirmation dialog.
- [ ] Add failing Monitoring Panel integration tests.
- [ ] Gate protected Monitoring profile filters.
- [ ] Add failing Agents Panel integration tests.
- [ ] Gate protected Agents profile switches.
- [ ] Run focused tests, type-check, and build.
- [ ] Update `feats-map/` and commit each completed task.
