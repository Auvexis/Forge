# Task List — Workflow Editor Feature Batch

## Features

- [ ] **1. Switch Node — Vertical layout** — Restore height-growing layout (handles on right), keep key-remount fix for edge anchoring.
- [ ] **2. Quick Add per handle** — Add Quick Add cable+button to each output handle of: Conditional (True/False), Loop (Body/Done), Split In Batches (batch/done), Switch (each case + default). Update canvas to pass `sourceHandle` when auto-connecting.
- [ ] **3. Emit Event — Structured payload params** — Replace textarea with key-value assignment rows (like Set Fields). Fix field name from `eventTopic` → `eventName`.
- [ ] **4. Event Listener — No left handle + expected params** — Remove `has-target` (it's a trigger-start node). Add `outputParams` to define what keys the event payload exposes to downstream nodes.
