# Multi Trigger Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support multiple real trigger nodes per workflow, where each trigger starts a new execution for only its connected branch.

**Architecture:** Trigger configuration moves onto `WorkflowNode` entries with `type: "trigger"` while `workflow.trigger` remains a legacy compatibility source. Backend helpers centralize trigger discovery, identity, and disabled behavior so routes, scheduler, event bus, lifecycle, and executor do not duplicate rules.

**Tech Stack:** TypeScript, Fastify, Vue 3, Pinia, Vue Flow, node-cron.

---

### Task 1: Contract And Runtime Migration

**Files:**
- Modify: `server/src/shared/models/workflow-types.ts`
- Modify: `client-vue/src/core/types/workflow.types.ts`
- Create: `server/src/core/modules/workflows/workflow-triggers.ts`
- Modify: `server/src/core/modules/workflows/repository.ts`
- Test: `server/src/core/modules/workflows/workflow-triggers.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests proving legacy workflows expose a virtual trigger entry and new workflows expose all trigger nodes with disabled state.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ts-node/register --test src/core/modules/workflows/workflow-triggers.test.ts`
Expected: FAIL because `workflow-triggers.ts` does not exist.

- [ ] **Step 3: Implement minimal contract helpers**

Add `disabled?: boolean` to base nodes, add trigger config fields to `TriggerNode`, and implement helpers:
`listTriggerEntries(workflow)`, `getTriggerEntry(workflow, triggerNodeId)`, `resolveWebhookTrigger(workflows, path, opts)`, `resolveFormTrigger(workflows, formId, opts)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ts-node/register --test src/core/modules/workflows/workflow-triggers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add multi-trigger workflow contract`.

### Task 2: Executor Branch Entry

**Files:**
- Modify: `server/src/core/modules/workflows/executor.ts`
- Test: `server/src/core/modules/workflows/executor.test.ts`

- [ ] **Step 1: Write failing tests**

Test that `executeWorkflowFromTrigger(workflow, "trigger_b", payload)` executes only nodes downstream of `trigger_b`, skips disabled normal nodes by passing through to their children, and rejects disabled trigger nodes.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ts-node/register --test src/core/modules/workflows/executor.test.ts`
Expected: FAIL because `executeWorkflowFromTrigger` does not exist.

- [ ] **Step 3: Implement branch execution**

Add `executeWorkflowFromTrigger` and make legacy `executeWorkflow` delegate to trigger id `"trigger"`. Seed queue from the selected trigger outgoing edges. Treat disabled non-trigger nodes as pass-through. Persist logs exactly like existing executions.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ts-node/register --test src/core/modules/workflows/executor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: execute workflows from trigger nodes`.

### Task 3: Backend Ingresses

**Files:**
- Modify: `server/src/core/routes/workflows.routes.ts`
- Modify: `server/src/core/modules/forms/form-service.ts`
- Modify: `server/src/core/modules/forms/form-routes.ts`
- Modify: `server/src/core/modules/scheduler/scheduler.ts`
- Modify: `server/src/core/modules/events/internal-event-bus.ts`
- Modify: `server/src/core/modules/workflows/lifecycle.ts`
- Test: `server/src/core/modules/workflows/workflow-triggers.test.ts`

- [ ] **Step 1: Write failing tests**

Extend trigger helper tests for webhook, form, cron/event/plugin trigger matching and disabled triggers being ignored.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ts-node/register --test src/core/modules/workflows/workflow-triggers.test.ts`
Expected: FAIL for missing resolver behavior.

- [ ] **Step 3: Implement route and service integration**

Replace direct `workflow.trigger` matching with trigger helper resolution. Pass `triggerNodeId` into `executeWorkflowFromTrigger`. Schedule cron jobs by `workflowId:triggerNodeId`. Lifecycle activates plugin trigger nodes independently.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ts-node/register --test src/core/modules/workflows/workflow-triggers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: route ingress through trigger nodes`.

### Task 4: Frontend Canvas And Node Settings

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/Nod8WorkflowCanvas.vue`
- Modify: `client-vue/src/features/workflow-editor/stores/workflow.store.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/AddNodePanel.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/TriggerNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/NodeInspectorModal.vue`
- Modify: `client-vue/src/features/workflow-editor/components/settings/editors/TriggerEditor.vue`

- [ ] **Step 1: Write failing frontend type/build check**

Run: `npm run type-check` from `client-vue`.
Expected initially can fail after contract changes until UI is updated.

- [ ] **Step 2: Implement UI updates**

Render trigger nodes from `workflow.nodes`, keep one migrated legacy trigger, add trigger item to utilities, update inspector to edit selected trigger node data, and add enable/disable switch in settings.

- [ ] **Step 3: Run frontend verification**

Run: `npm run type-check` from `client-vue`.
Expected: PASS.

- [ ] **Step 4: Commit**

Commit message: `feat: manage trigger nodes in workflow editor`.

### Task 5: Final Verification

**Files:**
- Modify: `feats-map/MULTI_TRIGGER_WORKFLOWS.md`

- [ ] **Step 1: Run backend tests**

Run: `node --import ts-node/register --test src/core/modules/workflows/*.test.ts src/core/nodes/**/*.test.ts`
Expected: PASS.

- [ ] **Step 2: Run frontend type-check**

Run: `npm run type-check` from `client-vue`.
Expected: PASS.

- [ ] **Step 3: Mark feature map complete**

Update `feats-map/MULTI_TRIGGER_WORKFLOWS.md` with completed tasks.

- [ ] **Step 4: Commit**

Commit message: `chore: verify multi-trigger workflows`.
