# Agent Chat Ollama Stream Return Fix

Goal: fix Ollama/generic Chat Model runtime when model streaming returns a promise before the async iterable.

## Rules

- [x] Stay on branch `dev`.
- [ ] Use TDD before production changes.
- [ ] Keep Core generic: no Ollama-specific branch.
- [ ] Do not touch unrelated dirty files.

## Tasks

- [x] Task 1: Reproduce stream return bug
  - Add a failing graph-builder test where `model.stream()` returns `Promise<AsyncIterable>`.

- [x] Task 2: Fix generic stream handling
  - Await the model stream result before `for await`.
  - Validate the awaited value is async iterable before using streaming.
  - Keep invoke fallback for unsupported stream returns.

- [x] Task 3: Verification
  - Run focused agent-runtime tests.
  - Run server build.
