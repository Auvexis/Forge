# Agent Chat First Tool And Decline Fix

## Goal

Make tools available from the first chat prompt, render approved tool final text below the tool status row, and cleanly reset chat/node state when a tool approval is declined.

## Tasks

- [x] Add failing coverage for final tool reply rendering below the status row.
- [x] Add failing coverage for declined approvals clearing tool/status waiting state.
- [x] Add failing coverage for first prompt tool availability.
- [x] Fix chat message ordering/rendering for approved tool replies.
- [x] Fix decline handling so chat and node statuses resolve cleanly.
- [x] Fix first prompt tool availability/context.
- [x] Run focused backend/frontend tests and type-check.
- [x] Commit the fix.
