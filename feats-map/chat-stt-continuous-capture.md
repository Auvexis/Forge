# Chat STT Continuous Capture

## Goal

Keep the chat microphone listening until the user clicks the microphone button again.

## Tasks

- [x] Add a contract test for continuous STT capture and duplicate-safe result handling.
- [x] Configure Web Speech recognition for continuous listening.
- [x] Keep recognition alive across browser `onend` events until the user manually stops it.
- [x] Append only newly reported final speech results.
- [x] Run focused frontend contract tests.
- [x] Commit the fix.
