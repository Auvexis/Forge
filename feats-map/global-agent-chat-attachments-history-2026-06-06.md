# Global Agent Chat Attachments And History - 2026-06-06

## Goal
Add safe file attachments to the global agent chat, restore the session history aside, and disable speech language controls when speech recognition is unavailable.

## Tasks
- [x] Add frontend contract coverage for composer attachments, drag/drop, paste images, disabled language control, and restored session aside.
- [x] Add backend contract coverage for attachment refs reaching the agent payload and cache cleanup after success/error.
- [x] Restore the session history aside in the global modal and remove the old header history menu.
- [x] Add composer attachment state, previews, drag/drop, paste image support, and disabled speech language control.
- [x] Add agent panel attachment upload API and payload types.
- [x] Wire backend chat attachment refs into the agent runtime payload without exposing real file paths to plugins.
- [x] Clean cached chat attachment files after success, error, and cancellation.
- [x] Run targeted tests, type-check, and build.
