# Task List — Workflow Editor Feature Batch

## Features

- [x] **1. Switch Node — Vertical layout** — Restored height-growing layout (handles on right), kept key-remount fix. Commit: `085f1f2`
- [x] **2. Quick Add per handle** — New `QuickAddButton.vue` component. Added to IF (True/False), Loop (Body/Done), Split In Batches (batch/done), Switch (all cases + default). Canvas updated to pass `sourceHandle` when auto-connecting. Commit: `085f1f2`
- [x] **3. Emit Event — Structured payload params** — Replaced textarea with key-value assignment rows (like Set Fields). Saves to `payloadMapping`. Fixed `eventTopic` → `eventName` across node + editor. Commit: `085f1f2`
- [x] **4. Event Listener — No left handle + expected params** — Removed `has-target`. Added `outputParams?: { key }[]` to type + editor so downstream nodes can reference `steps.<id>.output.<key>`. Commit: `085f1f2`
