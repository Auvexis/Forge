# Agent Chat Approved Tool Message Order Fix

## Goal

Keep approved-tool continuation text out of the approval message, render the final assistant response below the tool status box, and animate incoming messages by role direction.

## Tasks

- [x] Add failing contracts for approved-tool stream redirection.
- [x] Add failing contracts for role-based message enter animations.
- [x] Redirect post-approval assistant deltas to the tool completion message.
- [x] Keep the approval continuation message stable.
- [x] Add user/assistant directional enter transitions.
- [x] Run focused tests and type-check.
- [x] Commit the fix.
