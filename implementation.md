# Forge v2 — Implementation Plan

> **Author**: Staff Engineer Review · **Created**: 2026-04-13
> **Status**: Ready for Implementation · **Priority**: Critical Path
> **Prerequisite Reading**: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Table of Contents

1. [Feature 1: Real-Time Execution Visualization (SSE)](#feature-1-real-time-execution-visualization-sse)
2. [Feature 2: Node Output Inspector](#feature-2-node-output-inspector)
3. [Feature 3: Webhook Trigger](#feature-3-webhook-trigger)
4. [Feature 4: Cron / Schedule Trigger](#feature-4-cron--schedule-trigger)
5. [Feature 5: Event Trigger & Event Bus](#feature-5-event-trigger--event-bus)
6. [Feature 6: HTTP Request Node](#feature-6-http-request-node)
7. [Feature 7: Emit Event Node](#feature-7-emit-event-node)
8. [Implementation Order](#implementation-order)
9. [New Dependencies](#new-dependencies)

---

## Feature 1: Real-Time Execution Visualization (SSE)

### Goal
When a workflow executes, the user MUST see each node change state **live** on the ReactFlow canvas:
- `IDLE` → `RUNNING` (pulsing glow animation) → `SUCCESS` (green border) or `FAILED` (red border)
- Edges should animate along the path as data flows
- The trigger node lights up first, then each node in execution order

### Why SSE (Server-Sent Events) over WebSocket
- SSE is **unidirectional** (server → client only), which is perfect since the client never sends execution data back.
- SSE works over standard HTTP (no upgrade), simpler to deploy, and Fastify has native support.
- Automatic reconnection built into the browser `EventSource` API.
- WebSocket is overkill for a one-way stream of status events.

---

### Backend Changes

#### 1. Create `server/src/core/modules/workflows/event-bus.ts`

This is an **in-process EventEmitter** that the Workflow Executor will emit events to, and the SSE route will read from.

```typescript
import { EventEmitter } from "events";

export interface WorkflowEvent {
  executionId: string;
  workflowId: string;
  type: "node:start" | "node:success" | "node:failed" | "workflow:start" | "workflow:success" | "workflow:failed";
  nodeId?: string;
  timestamp: number;
  data?: any; // For node:success, this contains the sanitized output
  error?: string; // For node:failed
}

class WorkflowEventBus extends EventEmitter {
  emitWorkflowEvent(event: WorkflowEvent) {
    this.emit("workflow-event", event);
  }

  // Subscribe to events for a specific execution
  onExecution(executionId: string, handler: (event: WorkflowEvent) => void): () => void {
    const listener = (event: WorkflowEvent) => {
      if (event.executionId === executionId) {
        handler(event);
      }
    };
    this.on("workflow-event", listener);
    // Return cleanup function
    return () => this.off("workflow-event", listener);
  }
}

export const workflowEventBus = new WorkflowEventBus();
```

**Design Notes:**
- Singleton pattern — only one bus for the entire process.
- `onExecution` filters events by `executionId` so each SSE connection only receives its own events.
- Returns a cleanup function so the SSE route can unsubscribe when the client disconnects.
- Set `this.setMaxListeners(100)` in the constructor to avoid Node.js warnings during concurrent executions.

#### 2. Modify `server/src/core/modules/workflows/executor.ts`

Add event emissions at every node lifecycle stage. The executor currently has a `while (queue.length > 0)` loop. Modify it to emit events:

**Before the try block (line ~342):**
```typescript
// Emit node:start
workflowEventBus.emitWorkflowEvent({
  executionId,
  workflowId: workflow.metadata.id,
  type: "node:start",
  nodeId,
  timestamp: Date.now(),
});
```

**After successful execution (line ~358, inside the `success = true` block):**
```typescript
// Emit node:success with sanitized output
workflowEventBus.emitWorkflowEvent({
  executionId,
  workflowId: workflow.metadata.id,
  type: "node:success",
  nodeId,
  timestamp: Date.now(),
  data: sanitizeContextForLogging(context.steps[nodeId]?.output),
});
```

**On failure (line ~364, inside the catch block, when all retries are exhausted):**
```typescript
// Emit node:failed
workflowEventBus.emitWorkflowEvent({
  executionId,
  workflowId: workflow.metadata.id,
  type: "node:failed",
  nodeId,
  timestamp: Date.now(),
  error: lastError?.message,
});
```

**At workflow start (before the while loop):**
```typescript
workflowEventBus.emitWorkflowEvent({
  executionId,
  workflowId: workflow.metadata.id,
  type: "workflow:start",
  timestamp: Date.now(),
});
```

**At workflow end (inside the finally block):**
```typescript
workflowEventBus.emitWorkflowEvent({
  executionId,
  workflowId: workflow.metadata.id,
  type: status === "SUCCESS" ? "workflow:success" : "workflow:failed",
  timestamp: Date.now(),
});
```

**CRITICAL**: The `executeWorkflow` method must now **return the executionId synchronously** before the execution completes. This means the execution route should:
1. Start execution in the background (do NOT `await` it)
2. Return the `executionId` immediately to the client
3. The client uses the `executionId` to open an SSE connection

#### 3. Modify `server/src/core/routes/workflows.routes.ts`

Change the execute endpoint and add an SSE endpoint:

**Modify `POST /workflows/:id/execute`:**
```typescript
// Instead of awaiting the full execution, start it in the background
// and return the executionId immediately so the client can subscribe via SSE.

const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Fire and forget — execution runs in background
WorkflowEngine.executeWorkflow(workflow, triggerPayload, executionId)
  .catch((err) => console.error(`[FORGE | WORKFLOW]: Background execution failed: ${err.message}`));

return sendResponse(reply, {
  status_code: 202, // 202 Accepted = processing started
  message: "Workflow execution started",
  error: null,
  data: { executionId },
});
```

**Note**: `executeWorkflow` must now accept `executionId` as a third parameter instead of generating it internally.

**Add SSE endpoint `GET /workflows/executions/:executionId/stream`:**
```typescript
fastify.get("/workflows/executions/:executionId/stream", async (req, reply) => {
  const { executionId } = req.params as { executionId: string };

  // Set SSE headers
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": CLIENT_ORIGIN,
  });

  // Subscribe to events for this execution
  const unsubscribe = workflowEventBus.onExecution(executionId, (event) => {
    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);

    // Auto-close SSE when workflow completes
    if (event.type === "workflow:success" || event.type === "workflow:failed") {
      setTimeout(() => {
        reply.raw.end();
      }, 500); // Small delay to ensure client receives the final event
    }
  });

  // Heartbeat to keep connection alive (every 15 seconds)
  const heartbeat = setInterval(() => {
    reply.raw.write(": heartbeat\n\n");
  }, 15000);

  // Cleanup on client disconnect
  req.raw.on("close", () => {
    unsubscribe();
    clearInterval(heartbeat);
  });
});
```

**IMPORTANT**: The `CLIENT_ORIGIN` env variable must also be used here for CORS. Add it to the route scope.

---

### Frontend Changes

#### 4. Create `client/app/modules/forge/workflows/hooks/useWorkflowStream.ts`

This hook manages the SSE connection and node state updates:

```typescript
import { useState, useCallback, useRef } from "react";
import { API_BASE_URL } from "~/shared/constants";

export type NodeExecutionStatus = "idle" | "running" | "success" | "failed";

export interface NodeStatusMap {
  [nodeId: string]: {
    status: NodeExecutionStatus;
    output?: any;
    error?: string;
    startedAt?: number;
    completedAt?: number;
  };
}

export function useWorkflowStream() {
  const [nodeStatuses, setNodeStatuses] = useState<NodeStatusMap>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startStream = useCallback((executionId: string) => {
    // Close previous connection if exists
    eventSourceRef.current?.close();

    setIsStreaming(true);
    setNodeStatuses({}); // Reset

    const es = new EventSource(`${API_BASE_URL}/workflows/executions/${executionId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "node:start":
          setNodeStatuses((prev) => ({
            ...prev,
            [data.nodeId]: { status: "running", startedAt: data.timestamp },
          }));
          break;

        case "node:success":
          setNodeStatuses((prev) => ({
            ...prev,
            [data.nodeId]: {
              status: "success",
              output: data.data,
              startedAt: prev[data.nodeId]?.startedAt,
              completedAt: data.timestamp,
            },
          }));
          break;

        case "node:failed":
          setNodeStatuses((prev) => ({
            ...prev,
            [data.nodeId]: {
              status: "failed",
              error: data.error,
              startedAt: prev[data.nodeId]?.startedAt,
              completedAt: data.timestamp,
            },
          }));
          break;

        case "workflow:success":
        case "workflow:failed":
          setIsStreaming(false);
          es.close();
          break;
      }
    };

    es.onerror = () => {
      setIsStreaming(false);
      es.close();
    };
  }, []);

  const stopStream = useCallback(() => {
    eventSourceRef.current?.close();
    setIsStreaming(false);
  }, []);

  return { nodeStatuses, isStreaming, startStream, stopStream };
}
```

#### 5. Modify `client/app/modules/forge/workflows/components/WorkflowEditor.tsx`

Integrate the stream hook into the editor:

1. Import and use the hook:
```typescript
const { nodeStatuses, isStreaming, startStream, stopStream } = useWorkflowStream();
```

2. Modify `handleExecute` to start the stream:
```typescript
const handleExecute = async (inputParams: Record<string, any>) => {
  try {
    const result = await executeWorkflow(workflow.metadata.id, inputParams);
    // result.data now contains { executionId } instead of the full context
    if (result?.data?.executionId) {
      startStream(result.data.executionId);
    }
  } catch (e: any) {
    console.error("Workflow Execution Failed:", e);
  }
};
```

3. Pass `nodeStatuses` to the ReactFlow nodes via `data`:
```typescript
// In the useEffect that maps workflow nodes to ReactFlow nodes, or via
// a separate useEffect that updates node data when nodeStatuses change:

useEffect(() => {
  if (Object.keys(nodeStatuses).length === 0) return;
  setNodes((nds) =>
    nds.map((node) => ({
      ...node,
      data: {
        ...node.data,
        _executionStatus: nodeStatuses[node.id]?.status || "idle",
        _executionOutput: nodeStatuses[node.id]?.output,
        _executionError: nodeStatuses[node.id]?.error,
      },
    })),
  );
}, [nodeStatuses, setNodes]);
```

#### 6. Modify `client/app/modules/forge/workflows/components/nodes/ActionNodeRenderer.tsx`

Add visual execution state indicators:

1. Read the execution status from data:
```typescript
const executionStatus = (data as any)._executionStatus as NodeExecutionStatus | undefined;
```

2. Apply dynamic CSS classes to the `<Card>` based on status:
```typescript
const statusClasses = {
  idle: "",
  running: "ring-2 ring-blue-500/50 animate-pulse shadow-blue-500/20 shadow-lg",
  success: "ring-2 ring-emerald-500/50 shadow-emerald-500/20 shadow-lg",
  failed: "ring-2 ring-red-500/50 shadow-red-500/20 shadow-lg",
};
```

3. Add a small status indicator dot in the node header:
```typescript
{executionStatus && executionStatus !== "idle" && (
  <div className={`w-2 h-2 rounded-full ${
    executionStatus === "running" ? "bg-blue-500 animate-pulse" :
    executionStatus === "success" ? "bg-emerald-500" : "bg-red-500"
  }`} />
)}
```

4. Same for `TriggerNodeRenderer.tsx` — add identical status display reading from `_executionStatus`.

---

## Feature 2: Node Output Inspector

### Goal
When a node has completed execution (status `success` or `failed`), clicking on it should show a **floating panel** with:
- The node's sanitized output (JSON viewer)
- Execution time (completedAt - startedAt)
- Error message if failed
- A "Copy to Clipboard" button for the output

### Frontend Changes

#### 1. Create `client/app/modules/forge/workflows/components/NodeOutputPanel.tsx`

A new side panel (or bottom panel) component that renders when a user clicks on a node that has `_executionOutput` in its data:

```
┌────────────────────────────────┐
│  ✨ Node Output: list_files   │ ← Header with node ID
├────────────────────────────────┤
│  Status: ● SUCCESS             │
│  Duration: 1.2s               │
├────────────────────────────────┤
│  {                            │ ← JSON viewer (syntax highlighted)
│    "id": "abc123",            │    Use <pre> with monospace font
│    "name": "video.mp4",       │
│    ...                        │
│  }                            │
├────────────────────────────────┤
│  [ Copy JSON ]   [ Close ]    │ ← Action buttons
└────────────────────────────────┘
```

**Implementation details:**
- This panel should appear **inside** the existing `NodeEditorPanel.tsx` as a new tab or section at the top, labeled "Output".
- Only visible when the node has `_executionOutput` or `_executionError` data.
- Use `JSON.stringify(output, null, 2)` for display.
- Calculate duration: `(completedAt - startedAt) / 1000` seconds.
- Include a "Copy" button that uses `navigator.clipboard.writeText()`.

#### 2. Modify `NodeEditorPanel.tsx`

Add a conditional tab/section:
```typescript
// At the top of the panel, before the editor content:
{nodeData._executionOutput && (
  <NodeOutputPanel
    nodeId={selectedNodeId}
    output={nodeData._executionOutput}
    error={nodeData._executionError}
    startedAt={nodeData._executionStartedAt}
    completedAt={nodeData._executionCompletedAt}
  />
)}
```

---

## Feature 3: Webhook Trigger

### Goal
A workflow with a `webhook` trigger should expose a **public URL** that external services (GitHub, Stripe, Discord, etc.) can call to start the workflow. The HTTP body of the incoming request becomes the `triggerPayload`.

### Backend Changes

#### 1. Add webhook fields to `WorkflowTrigger` type

The current type in `workflow-types.ts` already has `webhookUrl`, `webhookMethods`, but we need to add a `webhookSecret` field:

```typescript
export interface WorkflowTrigger {
  type: "manual" | "webhook" | "cron" | "event";
  schema?: Record<string, any>;
  ui?: WorkflowNodeUI;
  // Webhook config
  webhookPath?: string;     // User-defined path segment (e.g., "my-hook")
  webhookMethods?: ("GET" | "POST" | "PUT" | "DELETE")[];
  webhookSecret?: string;   // HMAC secret for signature verification
  // Cron config
  cronExpression?: string;
  // Event config
  eventName?: string;
}
```

#### 2. Create `server/src/core/modules/webhooks/handler.ts`

A webhook request handler module:

```typescript
import crypto from "crypto";
import { WorkflowRepository } from "../workflows/repository.ts";
import { WorkflowEngine } from "../workflows/executor.ts";

export const WebhookHandler = {
  /**
   * Find the workflow that matches the webhook path.
   * Active, non-draft workflows with trigger.type === "webhook" are eligible.
   */
  findWorkflowByPath(webhookPath: string): WorkflowItem | null {
    const workflows = WorkflowRepository.getActiveWorkflows();
    return workflows.find(
      (wf) => wf.trigger.type === "webhook" && wf.trigger.webhookPath === webhookPath
    ) || null;
  },

  /**
   * Validates the HMAC-SHA256 signature if a secret is configured.
   * The signature is expected in the `X-Forge-Signature` header.
   * Format: sha256=<hex digest>
   */
  validateSignature(payload: string, secret: string, signature: string): boolean {
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  },
};
```

**Security Notes:**
- Use `crypto.timingSafeEqual` to prevent timing attacks.
- The `X-Forge-Signature` header format follows GitHub's webhook convention.
- If no secret is configured, skip signature validation (but warn in logs).

#### 3. Add webhook route to `server/src/core/routes/workflows.routes.ts`

```typescript
// ──────────── Webhook Ingress ────────────
// ALL method handler for incoming webhooks
// Route: /webhooks/:webhookPath

fastify.all("/webhooks/:webhookPath", async (req, reply) => {
  const { webhookPath } = req.params as { webhookPath: string };

  const workflow = WebhookHandler.findWorkflowByPath(webhookPath);
  if (!workflow) {
    return reply.code(404).send({ error: "Webhook not found" });
  }

  // Method validation
  const allowedMethods = workflow.trigger.webhookMethods || ["POST"];
  if (!allowedMethods.includes(req.method as any)) {
    return reply.code(405).send({ error: `Method ${req.method} not allowed` });
  }

  // Signature validation (if secret is configured)
  if (workflow.trigger.webhookSecret) {
    const signature = req.headers["x-forge-signature"] as string;
    if (!signature) {
      return reply.code(401).send({ error: "Missing X-Forge-Signature header" });
    }

    const rawBody = JSON.stringify(req.body);
    if (!WebhookHandler.validateSignature(rawBody, workflow.trigger.webhookSecret, signature)) {
      return reply.code(401).send({ error: "Invalid signature" });
    }
  }

  // Build trigger payload from the incoming request
  const triggerPayload = {
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body || {},
    ip: req.ip,
    timestamp: Date.now(),
  };

  // Execute asynchronously
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  WorkflowEngine.executeWorkflow(workflow, triggerPayload, executionId)
    .catch((err) => console.error(`[FORGE | WEBHOOK]: Execution failed: ${err.message}`));

  return reply.code(202).send({
    status: "accepted",
    executionId,
    message: `Workflow "${workflow.metadata.name}" triggered`,
  });
});
```

**IMPORTANT**: This route handler must be registered **before** the standard workflow routes, or in a separate Fastify plugin prefix, so it doesn't conflict with `/workflows/:workflowId`.

#### 4. Auto-generate webhook path on workflow save

When a workflow with `trigger.type === "webhook"` is saved and `webhookPath` is empty, the backend should auto-generate a unique path:

```typescript
// In the POST /workflows route, after validation:
if (workflow.trigger.type === "webhook" && !workflow.trigger.webhookPath) {
  workflow.trigger.webhookPath = `wh_${workflow.metadata.id}_${crypto.randomBytes(4).toString("hex")}`;
}
```

### Frontend Changes

#### 5. Update `TriggerEditor.tsx`

The webhook UI section already exists (lines 173-196) but needs updates:

- Display the **full webhook URL** using the server's base URL (from env):
  ```
  {API_BASE_URL}/webhooks/{webhookPath}
  ```
- Add a "Copy URL" button.
- Add a `webhookSecret` input field (type password).
- Add checkboxes for allowed HTTP methods (GET, POST, PUT, DELETE).
- Add a "Regenerate Path" button.

---

## Feature 4: Cron / Schedule Trigger

### Goal
A workflow with a `cron` trigger should execute automatically on a schedule. The cron expression follows standard 5-field syntax (`minute hour day month weekday`).

### Backend Changes

#### 1. Install `node-cron` dependency

```bash
npm install node-cron
npm install -D @types/node-cron   # if types exist, otherwise skip
```

#### 2. Create `server/src/core/modules/scheduler/scheduler.ts`

```typescript
import cron from "node-cron";
import { WorkflowRepository } from "../workflows/repository.ts";
import { WorkflowEngine } from "../workflows/executor.ts";

interface ScheduledJob {
  workflowId: string;
  task: cron.ScheduledTask;
}

const activeJobs = new Map<string, ScheduledJob>();

export const Scheduler = {
  /**
   * Initialize all cron jobs from active workflows.
   * Called once at server startup after plugins are loaded.
   */
  initialize() {
    const workflows = WorkflowRepository.getActiveWorkflows();
    let count = 0;

    for (const workflow of workflows) {
      if (workflow.trigger.type === "cron" && workflow.trigger.cronExpression) {
        this.scheduleWorkflow(workflow.metadata.id, workflow.trigger.cronExpression);
        count++;
      }
    }

    console.log(`[FORGE | SCHEDULER]: Initialized ${count} cron jobs`);
  },

  /**
   * Schedule a single workflow.
   */
  scheduleWorkflow(workflowId: string, cronExpression: string) {
    // Validate the cron expression
    if (!cron.validate(cronExpression)) {
      console.error(`[FORGE | SCHEDULER]: Invalid cron expression for ${workflowId}: "${cronExpression}"`);
      return;
    }

    // Remove existing job if re-scheduling
    this.unscheduleWorkflow(workflowId);

    const task = cron.schedule(cronExpression, async () => {
      console.log(`[FORGE | SCHEDULER]: Triggering workflow ${workflowId}`);

      const workflow = WorkflowRepository.getWorkflowById(workflowId);
      if (!workflow) {
        console.error(`[FORGE | SCHEDULER]: Workflow ${workflowId} not found, removing job`);
        this.unscheduleWorkflow(workflowId);
        return;
      }

      // Build trigger payload with schedule metadata
      const triggerPayload = {
        scheduledAt: new Date().toISOString(),
        cronExpression,
        type: "cron",
      };

      const executionId = `exec_cron_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      try {
        await WorkflowEngine.executeWorkflow(workflow, triggerPayload, executionId);
        console.log(`[FORGE | SCHEDULER]: Workflow ${workflowId} completed successfully`);
      } catch (err: any) {
        console.error(`[FORGE | SCHEDULER]: Workflow ${workflowId} failed: ${err.message}`);
      }
    });

    activeJobs.set(workflowId, { workflowId, task });
  },

  /**
   * Remove a scheduled job.
   */
  unscheduleWorkflow(workflowId: string) {
    const job = activeJobs.get(workflowId);
    if (job) {
      job.task.stop();
      activeJobs.delete(workflowId);
    }
  },

  /**
   * Re-sync all jobs (called after workflow save/delete).
   */
  resync() {
    // Stop all current jobs
    for (const [id, job] of activeJobs) {
      job.task.stop();
    }
    activeJobs.clear();

    // Re-initialize
    this.initialize();
  },

  /**
   * Get all active job IDs (for debugging/API).
   */
  getActiveJobs(): string[] {
    return Array.from(activeJobs.keys());
  },
};
```

#### 3. Modify `server/src/core/server.ts`

After `loadPlugins()`, initialize the scheduler:

```typescript
import { Scheduler } from "./modules/scheduler/scheduler.ts";

// ... after loadPlugins() ...
Scheduler.initialize();
```

#### 4. Modify workflow save/delete routes to resync

In `workflows.routes.ts`, after every `WorkflowRepository.saveWorkflow()` and `deleteWorkflow()` call:

```typescript
// After saving:
Scheduler.resync();

// After deleting:
Scheduler.resync();
```

**Design decision**: `resync()` is a simple "stop all, re-scan" approach. This is safe and correct for a single-instance deployment. For multi-instance, you'd need a distributed scheduler (Redis, etc.), but that's out of scope for now.

### Frontend Changes

#### 5. Update `TriggerEditor.tsx` (Cron Section)

The cron UI already exists (lines 199-218) but needs enhancements:

- Show a **human-readable description** of the cron expression (e.g., "Every Monday at 9:00 AM").
  Use the `cronstrue` npm package: `npm install cronstrue`
  ```typescript
  import cronstrue from "cronstrue";
  // ...
  const humanCron = cronstrue.toString(data.cronExpression);
  ```
- Add **preset buttons** for common schedules:
  - Every minute: `* * * * *`
  - Every hour: `0 * * * *`
  - Every day at midnight: `0 0 * * *`
  - Every Monday at 9 AM: `0 9 * * 1`
- Show the **next 3 execution times** (can be computed using the `cron-parser` library).
- Add a **timezone selector** (store as `trigger.timezone`, default to system timezone).

---

## Feature 5: Event Trigger & Event Bus

### Goal
Workflows can listen for **internal events** (e.g., `video.uploaded`, `order.created`). Other workflows or external code can emit these events to trigger subscribed workflows. This creates a **decoupled pub/sub system** between workflows.

### Backend Changes

#### 1. Create `server/src/core/modules/events/internal-event-bus.ts`

This is different from the workflow execution EventBus (Feature 1). This is for **business logic events** between workflows.

```typescript
import { WorkflowRepository } from "../workflows/repository.ts";
import { WorkflowEngine } from "../workflows/executor.ts";

export interface InternalEvent {
  name: string;
  payload: Record<string, any>;
  emittedBy?: string; // workflowId or "api"
  timestamp: number;
}

export const InternalEventBus = {
  /**
   * Emit an event. All active workflows with trigger.type === "event"
   * and trigger.eventName matching will be executed.
   */
  async emit(event: InternalEvent): Promise<{ triggered: string[] }> {
    const workflows = WorkflowRepository.getActiveWorkflows();
    const triggered: string[] = [];

    for (const workflow of workflows) {
      if (
        workflow.trigger.type === "event" &&
        workflow.trigger.eventName === event.name
      ) {
        const executionId = `exec_event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const triggerPayload = {
          event: event.name,
          payload: event.payload,
          emittedBy: event.emittedBy || "unknown",
          timestamp: event.timestamp,
        };

        // Fire and forget — each triggered workflow runs independently
        WorkflowEngine.executeWorkflow(workflow, triggerPayload, executionId)
          .catch((err) =>
            console.error(`[FORGE | EVENTS]: Workflow ${workflow.metadata.id} failed: ${err.message}`)
          );

        triggered.push(workflow.metadata.id);
      }
    }

    console.log(`[FORGE | EVENTS]: Event "${event.name}" triggered ${triggered.length} workflow(s)`);
    return { triggered };
  },
};
```

#### 2. Add API route for emitting events

In `workflows.routes.ts`:

```typescript
/**
 * Emit an internal event (triggers all subscribed workflows)
 * POST /events/emit
 * Body: { name: "video.uploaded", payload: { videoId: "abc" } }
 */
fastify.post("/events/emit", async (req, reply) => {
  const { name, payload } = req.body as { name: string; payload?: Record<string, any> };

  if (!name || typeof name !== "string") {
    return sendResponse(reply, {
      status_code: 400,
      message: "Event name is required",
      error: "Missing 'name' field",
      data: null,
    });
  }

  const event: InternalEvent = {
    name,
    payload: payload || {},
    emittedBy: "api",
    timestamp: Date.now(),
  };

  const result = await InternalEventBus.emit(event);

  return sendResponse(reply, {
    status_code: 200,
    message: `Event "${name}" emitted`,
    error: null,
    data: result,
  });
});
```

### Frontend Changes

#### 3. Update `TriggerEditor.tsx` (Event Section)

The event UI already exists (lines 221-239) and is mostly correct. Add:
- A **list of known event names** (scan all workflows for `EmitEvent` nodes and extract their event names).
- A note explaining that events are workflow-internal (not external APIs).

---

## Feature 6: HTTP Request Node

### Goal
A new node type (`http`) that allows users to make arbitrary HTTP requests to external APIs. This is the most fundamental utility node for any automation platform — it replaces the need to create a custom plugin for simple API integrations.

### Type System Changes

#### 1. Modify `server/src/shared/models/workflow-types.ts`

Add the new node type to the discriminated union:

```typescript
export type WorkflowNodeType =
  | "plugin"
  | "code"
  | "if"
  | "loop"
  | "subworkflow"
  | "trigger"
  | "http"      // ← NEW
  | "event";    // ← NEW (Feature 7)

// ──────────── HTTP Request Node ────────────

export interface HttpNode extends WorkflowNodeBase {
  type: "http";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;              // Supports template expressions: "https://api.example.com/{{ steps.prev.output.id }}"
  headers?: Record<string, string>;   // Key-value pairs, supports templates
  body?: string;            // Raw JSON body string, supports templates
  bodyType?: "json" | "form" | "raw";  // How to encode the body
  timeout?: number;         // Request timeout in milliseconds (default: 30000)
  followRedirects?: boolean; // Follow 3xx redirects (default: true)
  responseType?: "json" | "text" | "binary"; // How to parse the response
}

// Add to the discriminated union:
export type WorkflowNode =
  | PluginNode
  | CodeNode
  | IfNode
  | LoopNode
  | SubWorkflowNode
  | TriggerNode
  | HttpNode      // ← NEW
  | EventNode;    // ← NEW (Feature 7)
```

#### 2. Add `"http"` to `VALID_NODE_TYPES` in `workflows.routes.ts`

```typescript
const VALID_NODE_TYPES = new Set([
  "plugin", "code", "if", "loop", "subworkflow", "trigger", "http", "event",
]);
```

Add validation in the switch statement:
```typescript
case "http":
  if (!node.url || typeof node.url !== "string") {
    return `HTTP node "${nodeId}" must have a url string`;
  }
  if (!node.method) {
    return `HTTP node "${nodeId}" must have a method (GET, POST, etc.)`;
  }
  break;
```

### Backend Execution

#### 3. Add `executeHttpNode` to `server/src/core/modules/workflows/executor.ts`

```typescript
async function executeHttpNode(
  node: HttpNode,
  context: any,
): Promise<any> {
  // 1. Resolve template expressions in URL, headers, and body
  const resolvedUrl = WorkflowParser.evalParams({ url: node.url }, context).url as string;

  const resolvedHeaders: Record<string, string> = {};
  if (node.headers) {
    const cooked = WorkflowParser.evalParams(node.headers, context);
    for (const [k, v] of Object.entries(cooked)) {
      resolvedHeaders[k] = String(v);
    }
  }

  let resolvedBody: any = undefined;
  if (node.body && node.method !== "GET") {
    const cooked = WorkflowParser.evalParams({ body: node.body }, context);
    const bodyStr = String(cooked.body);

    if (node.bodyType === "json" || !node.bodyType) {
      try {
        resolvedBody = JSON.parse(bodyStr);
      } catch {
        resolvedBody = bodyStr; // If it's not valid JSON, send as-is
      }
      resolvedHeaders["Content-Type"] = resolvedHeaders["Content-Type"] || "application/json";
    } else if (node.bodyType === "form") {
      resolvedBody = bodyStr;
      resolvedHeaders["Content-Type"] = resolvedHeaders["Content-Type"] || "application/x-www-form-urlencoded";
    } else {
      resolvedBody = bodyStr;
    }
  }

  // 2. Execute the HTTP request using native fetch
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), node.timeout || 30000);

  try {
    const response = await fetch(resolvedUrl, {
      method: node.method,
      headers: resolvedHeaders,
      body: resolvedBody ? (typeof resolvedBody === "object" ? JSON.stringify(resolvedBody) : resolvedBody) : undefined,
      redirect: node.followRedirects !== false ? "follow" : "manual",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 3. Parse response based on responseType
    let responseData: any;
    const contentType = response.headers.get("content-type") || "";

    if (node.responseType === "binary") {
      const buffer = Buffer.from(await response.arrayBuffer());
      responseData = buffer;
    } else if (node.responseType === "text") {
      responseData = await response.text();
    } else {
      // Default: try JSON first, fall back to text
      if (contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      ok: response.ok,
    };
  } finally {
    clearTimeout(timeout);
  }
}
```

**Add to the `executeNode` switch:**
```typescript
case "http":
  return executeHttpNode(node as HttpNode, context);
```

### Frontend: Node Editor

#### 4. Create `client/app/modules/forge/workflows/components/node-editors/HttpEditor.tsx`

The HTTP Request editor must have:

- **Method selector** (Combobox): GET, POST, PUT, PATCH, DELETE
- **URL input** (text, full-width, monospace): Supports `{{ template }}` expressions
- **Headers editor** (key-value pair builder, same pattern as TriggerEditor's schema builder):
  - Add/remove header rows
  - Key input + Value input per row
  - Common presets: Authorization, Content-Type, Accept
- **Body editor** (Textarea, monospace): Only visible for POST/PUT/PATCH
  - Body type selector: JSON, Form-Encoded, Raw
  - Supports `{{ template }}` expressions
- **Advanced settings** (collapsible):
  - Timeout (number input, default 30000ms)
  - Follow Redirects (toggle)
  - Response Type: JSON, Text, Binary

#### 5. Register in `node-editors/index.ts`

```typescript
import { HttpEditor } from "./HttpEditor";
// Add to the editor map:
case "http": return <HttpEditor node={node} updateNodeData={updateNodeData} />;
```

#### 6. Add to `ActionNodeRenderer.tsx`

Add a new style entry and body renderer:
```typescript
http: {
  icon: "globe",
  color: "text-orange-500",
  bg: "bg-orange-500/10",
  badge: "HTTP",
},
```

Add a body renderer component `HttpBody`:
```typescript
const HttpBody = ({ data }: { data: HttpNode }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">
      {data.name || "HTTP Request"}
    </span>
    <div className="mt-1 flex items-center gap-2">
      <span className="text-[10px] font-black px-1.5 py-0.5 bg-orange-500/10 text-orange-500 rounded border border-orange-500/20">
        {data.method || "GET"}
      </span>
      <code className="text-[10px] font-mono text-muted-foreground truncate">
        {data.url || "https://..."}
      </code>
    </div>
  </>
);
```

#### 7. Add to `WorkflowEditor.tsx` `handleCreateLogicNode`

```typescript
case "http":
  baseData.method = "GET";
  baseData.url = "";
  baseData.headers = {};
  baseData.body = "";
  baseData.name = "HTTP Request";
  break;
```

#### 8. Add to `AddNodeOverlay.tsx`

Add "HTTP Request" to the list of logic/utility nodes alongside Code, If, Loop, and Sub-Workflow.

---

## Feature 7: Emit Event Node

### Goal
A new node type (`event`) that allows a workflow to **publish an internal event**. Other workflows listening on that event name (Feature 5) will be triggered. This creates inter-workflow communication.

### Type System Changes

#### 1. Add to `workflow-types.ts`

```typescript
// ──────────── Emit Event Node ────────────

export interface EventNode extends WorkflowNodeBase {
  type: "event";
  eventName: string;    // The event to emit (e.g., "video.processed")
  payloadMapping: Record<string, string>; // Maps context paths to event payload keys
  // Example: { "videoId": "{{ steps.upload.output.videoId }}", "title": "{{ steps.extract.output.title }}" }
}
```

#### 2. Add `"event"` to `VALID_NODE_TYPES` in `workflows.routes.ts`

Add validation:
```typescript
case "event":
  if (!node.eventName || typeof node.eventName !== "string") {
    return `Event node "${nodeId}" must have an eventName string`;
  }
  break;
```

### Backend Execution

#### 3. Add `executeEventNode` to `executor.ts`

```typescript
async function executeEventNode(
  node: EventNode,
  context: any,
): Promise<any> {
  // Resolve payload mappings via template expressions
  const resolvedPayload = WorkflowParser.evalParams(node.payloadMapping || {}, context);

  const event: InternalEvent = {
    name: node.eventName,
    payload: resolvedPayload,
    emittedBy: context._workflowId, // Set this at execution start
    timestamp: Date.now(),
  };

  const result = await InternalEventBus.emit(event);

  return {
    eventName: event.name,
    payload: resolvedPayload,
    triggeredWorkflows: result.triggered,
  };
}
```

**Add to the `executeNode` switch:**
```typescript
case "event":
  return executeEventNode(node as EventNode, context);
```

### Frontend: Node Editor

#### 4. Create `client/app/modules/forge/workflows/components/node-editors/EventEditor.tsx`

Fields:
- **Event Name** (text input): The name of the event to emit (e.g., `video.uploaded`)
- **Payload Mapping** (key-value builder):
  - Key: the field name in the event payload
  - Value: a `{{ template }}` expression referencing context data
  - Example: Key=`videoId`, Value=`{{ steps.upload.output.videoId }}`
- **Note**: Display a hint showing which workflows are currently listening for this event name (query from the workflow list).

#### 5. Add to `ActionNodeRenderer.tsx`

Style entry:
```typescript
event: {
  icon: "zap",
  color: "text-yellow-500",
  bg: "bg-yellow-500/10",
  badge: "EVENT",
},
```

Body renderer:
```typescript
const EventBody = ({ data }: { data: EventNode }) => (
  <>
    <span className="text-xs font-medium text-foreground truncate">
      {data.name || "Emit Event"}
    </span>
    <div className="mt-1">
      <code className="text-[10px] font-mono bg-yellow-500/5 text-yellow-400 px-2 py-1 rounded border border-yellow-500/10 block truncate">
        {data.eventName || "event.name"}
      </code>
    </div>
  </>
);
```

---

## Implementation Order

The features have dependencies. Implement in this exact order:

```
Phase 1: Infrastructure (Foundation)
├── 1.1  WorkflowEventBus (event-bus.ts)
├── 1.2  InternalEventBus (internal-event-bus.ts)
├── 1.3  Scheduler (scheduler.ts)
└── 1.4  Type system updates (workflow-types.ts — add http, event node types)

Phase 2: Backend Execution
├── 2.1  Modify executor.ts — accept executionId param, integrate WorkflowEventBus emissions
├── 2.2  Modify executor.ts — add executeHttpNode handler
├── 2.3  Modify executor.ts — add executeEventNode handler
├── 2.4  Modify workflows.routes.ts — async execution + SSE stream endpoint
├── 2.5  Modify workflows.routes.ts — add webhook ingress route
├── 2.6  Modify workflows.routes.ts — add /events/emit route
├── 2.7  Add VALID_NODE_TYPES updates + validation for http, event
└── 2.8  Modify server.ts — initialize Scheduler at boot

Phase 3: Frontend — Real-Time
├── 3.1  Create useWorkflowStream.ts hook
├── 3.2  Modify WorkflowEditor.tsx — integrate stream hook
├── 3.3  Modify ActionNodeRenderer.tsx — execution status visualization
├── 3.4  Modify TriggerNodeRenderer.tsx — execution status visualization
├── 3.5  Create NodeOutputPanel.tsx
└── 3.6  Modify NodeEditorPanel.tsx — add output tab

Phase 4: Frontend — New Nodes
├── 4.1  Create HttpEditor.tsx
├── 4.2  Create EventEditor.tsx
├── 4.3  Update node-editors/index.ts — register new editors
├── 4.4  Update ActionNodeRenderer.tsx — add http and event styles + body renderers
├── 4.5  Update AddNodeOverlay.tsx — add HTTP Request and Emit Event options
└── 4.6  Update WorkflowEditor.tsx handleCreateLogicNode — add http, event cases

Phase 5: Frontend — Trigger Enhancements
├── 5.1  Update TriggerEditor.tsx — enhance webhook section (copy URL, secret, methods)
├── 5.2  Update TriggerEditor.tsx — enhance cron section (human-readable, presets)
├── 5.3  Update TriggerEditor.tsx — enhance event section (known events list)
└── 5.4  Update useExecuteWorkflow.ts — handle 202 response with executionId

Phase 6: Polish & Resync
├── 6.1  Workflows.routes.ts — call Scheduler.resync() on save/delete
├── 6.2  Test full E2E flow: manual trigger → SSE stream → node visualization
├── 6.3  Test webhook trigger with curl
├── 6.4  Test cron trigger with short interval
└── 6.5  Test event trigger with inter-workflow communication
```

---

## New Dependencies

| Package        | Purpose                              | Backend/Frontend |
|----------------|--------------------------------------|------------------|
| `node-cron`    | Cron job scheduling                  | Backend          |
| `cronstrue`    | Human-readable cron descriptions     | Frontend         |

**Note:** SSE uses native Fastify `reply.raw` (no additional dependency). HTTP requests in the `http` node use the native `fetch` API (available in Node.js 22+). No additional HTTP client library is needed.

---

## Security Considerations

1. **Webhook Secret**: Always recommend users set a webhook secret. Log a warning when a webhook is triggered without a secret.
2. **HTTP Node Restrictions**: Consider adding an allowlist / blocklist for HTTP node target URLs to prevent SSRF attacks (e.g., blocking `localhost`, `127.0.0.1`, `10.x.x.x`, `192.168.x.x`). This is **critical** for multi-user deployments.
3. **Event Bus Isolation**: In a future multi-tenant version, events must be scoped per user/organization. For now, all events are global within the Forge instance.
4. **Cron Abuse**: Add a minimum interval check (e.g., no faster than every 10 seconds) to prevent accidental resource exhaustion.
5. **SSE Authentication**: The SSE endpoint should validate that the requesting user owns the execution. For now (single-user), this is acceptable without auth.

---

*This implementation plan covers 7 features, 30+ file changes, and is designed to be executed incrementally in 6 phases. Each phase is independently deployable and testable.*
