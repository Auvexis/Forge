# Agent Chat Tool Status Layout Fix

## Goal

Keep a single tool status box per tool execution and append the final success message below it without replacing the approval continuation message.

## Tasks

- [x] Add contract coverage for stable tool status IDs.
- [x] Add contract coverage for separate tool completion message IDs.
- [x] Update store IDs so tool status boxes update instead of duplicating.
- [x] Append completion messages below the status box.
- [x] Run focused tests and type-checks.
- [x] Commit the fix.
