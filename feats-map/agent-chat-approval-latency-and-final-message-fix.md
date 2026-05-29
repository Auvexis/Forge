# Agent Chat Approval Latency And Final Message Fix

## Goal

Keep the final tool response visible below the completed tool box, keep approval text above the tool flow, and investigate why approval resume takes too long.

## Tasks

- [x] Add failing coverage for approval message ordering above tool status.
- [x] Add failing coverage so agent end cannot overwrite an existing streamed tool completion.
- [x] Fix final message preservation and ordering.
- [x] Investigate approval resume latency path.
- [x] Add focused latency/approval notes or fix if scoped.
- [x] Run focused tests and type-check.
- [x] Commit the fix.
