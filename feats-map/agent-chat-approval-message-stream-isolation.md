# Agent Chat Approval Message Stream Isolation

## Goal

Stop approved tool response chunks from writing into the approval continuation message.

## Tasks

- [x] Add failing contract for a separate approval message id.
- [x] Add failing contract for explicit approved-tool stream routing.
- [x] Store approval resolved text outside the stream assistant message.
- [x] Route approved execution chunks to the tool completion message.
- [x] Run focused tests and type-check.
- [x] Commit the fix.
