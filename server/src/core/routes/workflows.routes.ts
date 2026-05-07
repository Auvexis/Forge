import crypto from "crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import type {
  WorkflowItem,
  WorkflowNode,
} from "../../shared/models/workflow-types.ts";
import { WorkflowRepository } from "../modules/workflows/repository.ts";
import {
  WorkflowEngine,
  sanitizeContextForLogging,
} from "../modules/workflows/executor.ts";
import { workflowEventBus } from "../modules/workflows/event-bus.ts";
import {
  InternalEventBus,
  type InternalEvent,
} from "../modules/events/internal-event-bus.ts";
import { CancellationRegistry } from "../modules/workflows/cancellation-registry.ts";
import { Scheduler } from "../modules/scheduler/scheduler.ts";
import { PluginManager } from "../modules/plugins/manager.ts";
import { TriggerListenerRegistry } from "../modules/workflows/trigger-listener-registry.ts";
import { WorkflowLifecycleManager } from "../modules/workflows/lifecycle.ts";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:23802";

// ──────────── Safe SSE serializer ────────────
// Handles circular references and non-JSON-safe values so a bad plugin
// output never silently drops an SSE event.
function safeSerialize(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === "object" && val !== null) {
      if (seen.has(val)) return "[Circular]";
      seen.add(val);
    }
    // Strip functions, Symbols, Buffers already handled by sanitizeContextForLogging
    if (typeof val === "function") return undefined;
    if (typeof val === "symbol") return val.toString();
    if (typeof val === "bigint") return val.toString();
    return val;
  });
}

// ──────────── Allowed node types ────────────
const VALID_NODE_TYPES = new Set([
  "plugin",
  "code",
  "if",
  "loop",
  "subworkflow",
  "trigger",
  "http",
  "event",
  "event-listener",
  "set",
  "switch",
  "merge",
]);

// ──────────── Validation helper ────────────

function validateWorkflowDefinition(workflow: WorkflowItem): string | null {
  if (!workflow.metadata?.id || !workflow.metadata?.name) {
    return "Workflow must have metadata with id and name";
  }

  if (!workflow.trigger?.type) {
    return "Workflow must have a trigger with type";
  }

  if (!workflow.nodes || typeof workflow.nodes !== "object") {
    return "Workflow must have a nodes map";
  }

  if (!Array.isArray(workflow.edges)) {
    return "Workflow must have an edges array";
  }

  // Validate each node has a recognized type
  for (const [nodeId, node] of Object.entries(workflow.nodes)) {
    if (!node.type || !VALID_NODE_TYPES.has(node.type)) {
      return `Node "${nodeId}" has invalid type: "${(node as any).type}". Valid types: ${[...VALID_NODE_TYPES].join(", ")}`;
    }

    switch (node.type) {
      case "plugin":
        if (!node.pluginId || !node.action) {
          return `Plugin node "${nodeId}" must have pluginId and action`;
        }
        break;
      case "code":
        if (!node.script || typeof node.script !== "string") {
          return `Code node "${nodeId}" must have a script string`;
        }
        break;
      case "if":
        if (!node.condition || typeof node.condition !== "string") {
          return `If node "${nodeId}" must have a condition string`;
        }
        break;
      case "loop":
        if (!node.collection || typeof node.collection !== "string") {
          return `Loop node "${nodeId}" must have a collection expression`;
        }
        break;
      case "subworkflow":
        if (!node.workflowId) {
          return `SubWorkflow node "${nodeId}" must have a workflowId`;
        }
        break;
      case "http":
        if (!node.url || typeof node.url !== "string") {
          return `HTTP node "${nodeId}" must have a url string`;
        }
        if (!node.method) {
          return `HTTP node "${nodeId}" must have a method (GET, POST, etc.)`;
        }
        break;
      case "event":
        if (!node.eventName || typeof node.eventName !== "string") {
          return `Event node "${nodeId}" must have an eventName string`;
        }
        break;
      case "event-listener":
        if (!node.eventName || typeof node.eventName !== "string") {
          return `Event Listener node "${nodeId}" must have an eventName string`;
        }
        break;
      case "set":
        if (!Array.isArray((node as any).assignments) || (node as any).assignments.length === 0) {
          return `Set node "${nodeId}" must have a non-empty assignments array`;
        }
        break;
      case "switch":
        if (!(node as any).inputExpression || typeof (node as any).inputExpression !== "string") {
          return `Switch node "${nodeId}" must have an inputExpression string`;
        }
        if (!Array.isArray((node as any).cases) || (node as any).cases.length === 0) {
          return `Switch node "${nodeId}" must have a non-empty cases array`;
        }
        break;
      case "merge":
        if (!((node as any).mode === "wait-any" || (node as any).mode === "wait-all")) {
          return `Merge node "${nodeId}" must have mode "wait-any" or "wait-all"`;
        }
        break;
    }
  }

  // Validate edges reference existing nodes
  const validNodeIds = new Set(["trigger", ...Object.keys(workflow.nodes)]);
  for (const edge of workflow.edges) {
    if (!validNodeIds.has(edge.source)) {
      return `Edge "${edge.id}" references unknown source node "${edge.source}"`;
    }
    if (!validNodeIds.has(edge.target)) {
      return `Edge "${edge.id}" references unknown target node "${edge.target}"`;
    }
  }

  return null; // Valid
}

// ──────────── Webhook signature validation ────────────

function validateWebhookSignature(
  payload: string,
  secret: string,
  signature: string,
): boolean {
  try {
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

export default async function workflowsRoutes(fastify: FastifyInstance) {
  const sendResponse = <T>(reply: FastifyReply, response: ApiResponse<T>) => {
    return reply.code(response.status_code).send(response);
  };

  // ──────────── Webhook Ingress ─ TEST MODE (draft / unpublished) ────────────
  // Executes synchronously and returns the full context state.
  // Useful for debugging from the workflow editor.

  fastify.all("/webhook-test/:webhookPath", async (req, reply) => {
    const { webhookPath } = req.params as { webhookPath: string };

    // ── Listen for Event intercept ─────────────────────────────────
    if (TriggerListenerRegistry.has(webhookPath)) {
      const payload = {
        body: req.body ?? null,
        headers: req.headers,
        query: req.query,
        method: req.method,
        contentType: req.headers["content-type"] ?? "",
        receivedAt: Date.now(),
        identifier: webhookPath,
      };

      const { consumed, workflowId } = TriggerListenerRegistry.consume(webhookPath, payload);
      if (consumed && workflowId) {
        WorkflowRepository.saveLastTriggerPayload(workflowId, payload);
      }
      return reply.code(200).send({ ok: true });
    }
    // ──────────────────────────────────────────────────────────────

    const workflows = WorkflowRepository.getWorkflows();
    const workflow = workflows.find(
      (wf) =>
        (wf.trigger.type === "webhook" || wf.trigger.type === "plugin") &&
        (wf.trigger.webhookSlug === webhookPath ||
          wf.trigger.webhookPath === webhookPath ||
          (wf.trigger.type === "plugin" && wf.metadata.id === webhookPath)),
    );

    if (!workflow) {
      return reply.code(404).send({ error: "Webhook not found" });
    }

    const allowedMethods = workflow.trigger.webhookMethods ?? ["POST"];
    if (!allowedMethods.includes(req.method as any)) {
      return reply
        .code(405)
        .send({ error: `Method ${req.method} not allowed` });
    }

    const triggerPayload = {
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body ?? {},
      ip: req.ip,
      timestamp: Date.now(),
    };

    const executionId = `exec_wh_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      // Synchronous — await the result so the caller gets the full context
      const result = await WorkflowEngine.executeWorkflow(
        workflow,
        triggerPayload,
        executionId,
      );
      return reply.code(200).send({
        status: "completed",
        executionId,
        context: sanitizeContextForLogging(result as any),
        message: `Test execution of "${workflow.metadata.name}" completed`,
      });
    } catch (err: any) {
      return reply.code(500).send({
        status: "failed",
        executionId,
        error: err.message,
      });
    }
  });

  // ──────────── Webhook Ingress ─ PRODUCTION MODE ────────────
  // Must be registered BEFORE /:workflowId routes to avoid conflicts
  // Resolves webhookSlug first, falls back to webhookPath.

  fastify.all("/webhook/:webhookPath", async (req, reply) => {
    const { webhookPath } = req.params as { webhookPath: string };

    console.log(
      `[NOD8 | WEBHOOK-IN]: ${req.method} /webhook/${webhookPath} — ` +
      `listen-active=${TriggerListenerRegistry.has(webhookPath)} ` +
      `body-keys=${Object.keys((req.body as any) ?? {}).join(",")}`
    );

    // ── Listen for Event intercept ─────────────────────────────────
    if (TriggerListenerRegistry.has(webhookPath)) {
      const payload = {
        body: req.body ?? null,
        headers: req.headers,
        query: req.query,
        method: req.method,
        contentType: req.headers["content-type"] ?? "",
        receivedAt: Date.now(),
        identifier: webhookPath,
      };

      const { consumed, workflowId } = TriggerListenerRegistry.consume(webhookPath, payload);
      if (consumed && workflowId) {
        WorkflowRepository.saveLastTriggerPayload(workflowId, payload);
      }
      return reply.code(200).send({ ok: true });
    }
    // ──────────────────────────────────────────────────────────────

    const workflows = WorkflowRepository.getActiveWorkflows();
    const workflow = workflows.find(
      (wf) =>
        (wf.trigger.type === "webhook" || wf.trigger.type === "plugin") &&
        (wf.trigger.webhookSlug === webhookPath ||
          wf.trigger.webhookPath === webhookPath ||
          (wf.trigger.type === "plugin" && wf.metadata.id === webhookPath)),
    );

    if (!workflow) {
      return reply.code(404).send({ error: "Webhook not found" });
    }

    // Method validation
    const allowedMethods = workflow.trigger.webhookMethods ?? ["POST"];
    if (!allowedMethods.includes(req.method as any)) {
      return reply
        .code(405)
        .send({ error: `Method ${req.method} not allowed` });
    }

    // HMAC signature validation when a secret is configured
    if (workflow.trigger.webhookSecret) {
      const signature = req.headers["x-nod8-signature"] as string | undefined;
      if (!signature) {
        return reply
          .code(401)
          .send({ error: "Missing X-Nod8-Signature header" });
      }
      const rawBody = JSON.stringify(req.body ?? {});
      if (
        !validateWebhookSignature(
          rawBody,
          workflow.trigger.webhookSecret,
          signature,
        )
      ) {
        return reply.code(401).send({ error: "Invalid webhook signature" });
      }
    } else {
      console.warn(
        `[NOD8 | WEBHOOK]: Webhook "${webhookPath}" has no secret configured — consider adding one`,
      );
    }

    const triggerPayload = {
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body ?? {},
      ip: req.ip,
      timestamp: Date.now(),
    };

    const contentType =
      (req.headers["content-type"] ?? "").split(";")[0].trim() ||
      "application/json";
    console.log(
      `[NOD8 | WEBHOOKS]: Webhook received — identifier: '${webhookPath}', content-type: ${contentType}`,
    );

    const executionId = `exec_wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    WorkflowEngine.executeWorkflow(workflow, triggerPayload, executionId).catch(
      (err: Error) =>
        console.error(
          `[NOD8 | WEBHOOK]: Execution failed for "${webhookPath}": ${err.message}`,
        ),
    );

    return reply.code(202).send({
      status: "accepted",
      executionId,
      message: `Workflow "${workflow.metadata.name}" triggered via webhook`,
    });
  });

  // ──────────── SSE Stream Endpoint ────────────

  fastify.get(
    "/workflows/executions/:executionId/stream",
    async (req, reply) => {
      const { executionId } = req.params as { executionId: string };

      // Hijack the request to prevent Fastify from auto-closing the SSE connection
      reply.hijack();

      // SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": CLIENT_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
      });

      const unsubscribe = workflowEventBus.onExecution(executionId, (event) => {
        try {
          reply.raw.write(`data: ${safeSerialize(event)}\n\n`);
        } catch {
          // Fallback: strip the data field so the node still advances in the UI
          const fallback = { ...event, data: "[unserializable output]" };
          try {
            reply.raw.write(`data: ${JSON.stringify(fallback)}\n\n`);
          } catch {
            // If even the fallback fails, skip this event silently
          }
        }

        if (
          event.type === "workflow:success" ||
          event.type === "workflow:failed" ||
          event.type === "workflow:cancelled"
        ) {
          // Small delay to ensure client receives the final event
          setTimeout(() => reply.raw.end(), 500);
        }
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        reply.raw.write(": heartbeat\n\n");
      }, 15000);

      // Cleanup on client disconnect
      req.raw.on("close", () => {
        unsubscribe();
        clearInterval(heartbeat);
      });

      // Keep the fastify async handler alive until the connection closes
      return new Promise((resolve) => {
        req.raw.on("close", resolve);
      });
    },
  );

  // ──────────── Cancel workflow execution ────────────

  fastify.post(
    "/workflows/executions/:executionId/cancel",
    async (req, reply) => {
      const { executionId } = req.params as { executionId: string };

      if (!executionId || typeof executionId !== "string") {
        return sendResponse(reply, {
          status_code: 400,
          message: "Invalid executionId",
          error: "Parameter required",
          data: null,
        });
      }

      CancellationRegistry.cancel(executionId);

      return sendResponse(reply, {
        status_code: 202,
        message: "Cancellation requested",
        error: null,
        data: { executionId },
      });
    },
  );

  // ──────────── Emit Internal Event ────────────

  fastify.post("/events/emit", async (req, reply) => {
    const { name, payload } = req.body as {
      name?: string;
      payload?: Record<string, any>;
    };

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
      payload: payload ?? {},
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

  // ──────────── Get all workflows ────────────

  fastify.get("/workflows", async (req, reply) => {
    try {
      const workflows = WorkflowRepository.getWorkflows();
      return sendResponse(reply, {
        status_code: 200,
        message: "Workflows fetched successfully",
        error: null,
        data: workflows,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch workflows",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Save or Update a workflow ────────────

  fastify.post("/workflows", async (req, reply) => {
    try {
      const workflow = req.body as WorkflowItem;

      if (workflow.metadata.isDraft === undefined) {
        workflow.metadata.isDraft = false;
      }

      // Auto-generate webhookPath if missing
      if (
        workflow.trigger.type === "webhook" &&
        !workflow.trigger.webhookPath
      ) {
        workflow.trigger.webhookPath = `wh_${workflow.metadata.id}_${crypto
          .randomBytes(4)
          .toString("hex")}`;
      }

      // Validate webhookSlug if provided
      if (workflow.trigger.type === "webhook" && workflow.trigger.webhookSlug) {
        const slugError = WorkflowRepository.validateWebhookSlug(
          workflow.trigger.webhookSlug,
          workflow.metadata.id,
        );
        if (slugError) {
          return sendResponse(reply, {
            status_code: 400,
            message: slugError,
            error: slugError,
            data: null,
          });
        }
      }

      const validationError = validateWorkflowDefinition(workflow);
      if (validationError) {
        return sendResponse(reply, {
          status_code: 400,
          message: `Invalid workflow: ${validationError}`,
          error: validationError,
          data: null,
        });
      }

      WorkflowRepository.saveWorkflow(workflow);
      Scheduler.resync();

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow saved successfully",
        error: null,
        data: workflow,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to save workflow",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Execute a workflow manually ────────────

  fastify.post("/workflows/:workflowId/execute", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };

    try {
      const workflow = WorkflowRepository.getWorkflowById(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }

      let triggerPayload: Record<string, any> = {};

      const headerExecRaw = req.headers["x-nod8-execution-id"];
      const headerExecutionId =
        typeof headerExecRaw === "string" &&
        headerExecRaw.length < 96 &&
        /^exec_\d+_[a-z0-9]+$/i.test(headerExecRaw)
          ? headerExecRaw
          : null;

      if (req.isMultipart()) {
        const parts = req.parts();
        for await (const part of parts) {
          if (part.type === "file") {
            triggerPayload[part.fieldname] = await part.toBuffer();
          } else {
            try {
              triggerPayload[part.fieldname] = JSON.parse(part.value as string);
            } catch {
              triggerPayload[part.fieldname] = part.value;
            }
          }
        }
      } else {
        triggerPayload = (req.body as Record<string, any>) || {};
      }

      const executionId =
        headerExecutionId ??
        `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const responseBody = {
        status_code: 202,
        message: "Workflow execution started",
        error: null,
        data: { executionId },
      } as const;

      // Defer engine start until after the 202 is sent so the client can open the
      // SSE stream first — otherwise early node:start events are dropped and the
      // first action node never shows "running" or a duration.
      await reply.code(202).send(responseBody);

      setImmediate(() => {
        WorkflowEngine.executeWorkflow(
          workflow,
          triggerPayload,
          executionId,
        ).catch((err: Error) =>
          console.error(
            `[NOD8 | WORKFLOW]: Background execution ${executionId} failed: ${err.message}`,
          ),
        );
      });

      return;
    } catch (error: any) {
      if (reply.sent) return;
      return sendResponse(reply, {
        status_code: 500,
        message: `Workflow execution failed: ${error.message}`,
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Execute a single node (Test Step) ────────────

  fastify.post(
    "/workflows/:workflowId/nodes/:nodeId/execute",
    async (req, reply) => {
      const { workflowId, nodeId } = req.params as {
        workflowId: string;
        nodeId: string;
      };
      const overrideNodeConfig = req.body as WorkflowNode;

      try {
        const workflow = WorkflowRepository.getWorkflowById(workflowId);
        if (!workflow) {
          return sendResponse(reply, {
            status_code: 404,
            message: "Workflow not found",
            error: "Not Found",
            data: null,
          });
        }

        // Try to find the most recent execution context
        let baseContext = null;
        const executions = WorkflowRepository.getWorkflowExecutions(workflowId);
        const lastExecution = executions.find(
          (e) => e.status === "SUCCESS" || e.status === "FAILED",
        );

        if (lastExecution && lastExecution.context) {
          baseContext = JSON.parse(JSON.stringify(lastExecution.context));
        }

        const result = await WorkflowEngine.executeSingleNode(
          workflow,
          nodeId,
          overrideNodeConfig,
          baseContext,
        );

        return sendResponse(reply, {
          status_code: 200,
          message: "Node executed successfully",
          error: null,
          data: result,
        });
      } catch (error: any) {
        return sendResponse(reply, {
          status_code: 400,
          message: `Node execution failed: ${error.message}`,
          error: error.message,
          data: null,
        });
      }
    },
  );

  // ──────────── Get workflow executions ────────────

  fastify.get("/workflows/:workflowId/executions", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      const executions = WorkflowRepository.getWorkflowExecutions(workflowId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Executions fetched successfully",
        error: null,
        data: executions,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch executions",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Get workflow schema ────────────

  fastify.get("/workflows/:workflowId/schema", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };

    try {
      const workflow = WorkflowRepository.getWorkflowById(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }

      const nodeSchemas: Record<string, any> = {};
      for (const [nodeId, node] of Object.entries(workflow.nodes)) {
        const baseSchema: any = {
          type: node.type,
          name: node.name,
        };

        switch (node.type) {
          case "plugin": {
            try {
              const plugin = PluginManager.getPlugin(node.pluginId);
              const methodManifest = plugin.manifest.methods[node.action];
              baseSchema.pluginId = node.pluginId;
              baseSchema.action = node.action;
              baseSchema.pluginName = plugin.manifest.metadata.name;
              baseSchema.pluginIcon = plugin.manifest.metadata.icon;
              baseSchema.parameters = methodManifest?.parameters ?? {};
              baseSchema.responseSchema =
                methodManifest?.responseSchema ?? null;
            } catch {
              baseSchema.pluginId = node.pluginId;
              baseSchema.action = node.action;
              baseSchema.parameters = {};
            }
            break;
          }
          case "code":
            baseSchema.language = node.language;
            break;
          case "if":
            baseSchema.condition = node.condition;
            baseSchema.handles = ["then", "else"];
            break;
          case "loop":
            baseSchema.collection = node.collection;
            baseSchema.maxIterations = node.maxIterations;
            baseSchema.handles = ["loop-body", "loop-done"];
            break;
          case "subworkflow":
            baseSchema.workflowId = node.workflowId;
            baseSchema.inputMapping = node.inputMapping;
            break;
          case "http":
            baseSchema.method = node.method;
            baseSchema.url = node.url;
            break;
          case "event":
            baseSchema.eventName = node.eventName;
            baseSchema.payloadMapping = node.payloadMapping;
            break;
        }

        nodeSchemas[nodeId] = baseSchema;
      }

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow schema retrieved",
        error: null,
        data: {
          workflowId: workflow.metadata.id,
          name: workflow.metadata.name,
          version: workflow.metadata.version,
          isDraft: workflow.metadata.isDraft,
          trigger: workflow.trigger,
          nodes: nodeSchemas,
          edges: workflow.edges,
          variables: workflow.variables || [],
          availableNodeTypes: [...VALID_NODE_TYPES],
        },
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch workflow schema",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Update a workflow ────────────

  fastify.put("/workflows/:workflowId", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      const workflow = req.body as WorkflowItem;
      workflow.metadata.id = workflowId;
      workflow.metadata.updatedAt = new Date().toISOString();

      if (workflow.metadata.isDraft === undefined) {
        workflow.metadata.isDraft = false;
      }

      // Auto-generate webhookPath if missing
      if (
        workflow.trigger.type === "webhook" &&
        !workflow.trigger.webhookPath
      ) {
        workflow.trigger.webhookPath = `wh_${workflow.metadata.id}_${crypto.randomBytes(4).toString("hex")}`;
      }

      // Validate webhookSlug if provided
      if (workflow.trigger.type === "webhook" && workflow.trigger.webhookSlug) {
        const slugError = WorkflowRepository.validateWebhookSlug(
          workflow.trigger.webhookSlug,
          workflowId,
        );
        if (slugError) {
          return sendResponse(reply, {
            status_code: 400,
            message: slugError,
            error: slugError,
            data: null,
          });
        }
      }

      const validationError = validateWorkflowDefinition(workflow);
      if (validationError) {
        return sendResponse(reply, {
          status_code: 400,
          message: `Invalid workflow: ${validationError}`,
          error: validationError,
          data: null,
        });
      }

      WorkflowRepository.saveWorkflow(workflow);
      Scheduler.resync();

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow updated successfully",
        error: null,
        data: workflow,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to update workflow",
        error: error.message,
        data: null,
      });
    }
  });


  // ──────────── Production Status ────────────

  fastify.get("/workflows/production-status", async (_req, reply) => {
    try {
      const status = WorkflowRepository.getProductionStatus();
      return sendResponse(reply, {
        status_code: 200,
        message: "Production status fetched",
        error: null,
        data: status,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch production status",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Listen for Event (SSE) ────────────
  // Opens a temporary SSE connection that waits for the NEXT webhook call on
  // this workflow's webhook path. Intercepted by the webhook ingress routes.
  // Automatically times out after 120 seconds.

  fastify.get("/workflows/:workflowId/trigger/listen", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };

    const workflow = WorkflowRepository.getWorkflowById(workflowId);
    if (!workflow) {
      return reply.code(404).send({ error: "Workflow not found" });
    }

    // Determine the webhook path used for this workflow
    const webhookPath =
      workflow.trigger.webhookSlug ||
      workflow.trigger.webhookPath ||
      (workflow.trigger.type === "plugin" ? workflowId : null);

    if (!webhookPath) {
      return reply.code(400).send({
        error: "Workflow trigger has no webhookPath — save the workflow first.",
      });
    }

    // Hijack the request so Fastify doesn't automatically close the connection
    reply.hijack();

    // SSE headers
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": CLIENT_ORIGIN,
      "Access-Control-Allow-Credentials": "true",
    });

    const isUnpublishedPluginTrigger =
      workflow.trigger.type === "plugin" && !workflow.metadata.isActive;

    let teardownDone = false;
    const performTeardown = () => {
      if (teardownDone) return;
      teardownDone = true;
      TriggerListenerRegistry.remove(webhookPath);
      if (isUnpublishedPluginTrigger) {
        // Teardown in background so we don't block SSE cleanup
        WorkflowLifecycleManager.deactivate(workflow).catch(console.error);
      }
    };

    if (isUnpublishedPluginTrigger) {
      try {
        await WorkflowLifecycleManager.activate(workflow);
      } catch (err: any) {
        console.error(`[NOD8 | LISTEN]: Failed to temporarily activate plugin trigger:`, err.message);
        reply.raw.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
        reply.raw.end();
        return;
      }
    }

    // Notify the frontend that listening started
    reply.raw.write(`data: ${JSON.stringify({ type: "listening", webhookPath })}\n\n`);

    const LISTEN_TIMEOUT_MS = 120_000; // 2 minutes

    const timeoutId = setTimeout(() => {
      performTeardown();
      try {
        reply.raw.write(`data: ${JSON.stringify({ type: "timeout" })}\n\n`);
        reply.raw.end();
      } catch { /* already closed */ }
    }, LISTEN_TIMEOUT_MS);

    // Register with SSE sender function
    TriggerListenerRegistry.register(webhookPath, workflowId, (payload) => {
      clearTimeout(timeoutId);
      performTeardown();
      try {
        reply.raw.write(`data: ${JSON.stringify({ type: "captured", payload })}\n\n`);
        reply.raw.end();
      } catch { /* already closed */ }
    });

    // Cleanup on client disconnect
    req.raw.on("close", () => {
      clearTimeout(timeoutId);
      performTeardown();
    });

    // Keep the fastify async handler alive until the connection closes
    return new Promise((resolve) => {
      req.raw.on("close", resolve);
    });
  });

  // ──────────── Get last trigger payload ────────────

  fastify.get("/workflows/:workflowId/trigger/last-payload", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    const payload = WorkflowRepository.getLastTriggerPayload(workflowId);
    return sendResponse(reply, {
      status_code: 200,
      message: "Last trigger payload fetched",
      error: null,
      data: payload,
    });
  });

  // ──────────── Publish a workflow ────────────

  fastify.post("/workflows/:workflowId/publish", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      const workflow = WorkflowRepository.publishWorkflow(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }
      Scheduler.resync();

      // Trigger lifecycle: call plugin setup() if trigger type is "plugin".
      // If setup() fails (e.g. invalid token), return 422 so the UI shows the error.
      try {
        await WorkflowLifecycleManager.activate(workflow);
      } catch (lifecycleErr: any) {
        // Rollback publish so the workflow isn't stuck in a broken active state
        WorkflowRepository.unpublishWorkflow(workflowId);
        Scheduler.resync();
        return sendResponse(reply, {
          status_code: 422,
          message: `Workflow published but trigger setup failed: ${lifecycleErr.message}`,
          error: lifecycleErr.message,
          data: null,
        });
      }

      console.log(
        `[NOD8 | WORKFLOWS]: Published workflow "${workflow.metadata.name}" (${workflowId})`,
      );
      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow published and running in production",
        error: null,
        data: workflow,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to publish workflow",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Unpublish a workflow ────────────

  fastify.post("/workflows/:workflowId/unpublish", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      // Capture the workflow BEFORE unpublishing so we have trigger data for teardown
      const workflowBeforeUnpublish = WorkflowRepository.getWorkflowById(workflowId);

      const workflow = WorkflowRepository.unpublishWorkflow(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }
      Scheduler.resync();

      // Lifecycle teardown — non-fatal (errors are logged, not propagated)
      if (workflowBeforeUnpublish) {
        await WorkflowLifecycleManager.deactivate(workflowBeforeUnpublish);
      }

      console.log(
        `[NOD8 | WORKFLOWS]: Unpublished workflow "${workflow.metadata.name}" (${workflowId})`,
      );
      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow unpublished — removed from production",
        error: null,
        data: workflow,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to unpublish workflow",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Delete a workflow ────────────

  fastify.delete("/workflows/:workflowId", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      // Capture workflow before deletion for lifecycle teardown
      const workflowBeforeDelete = WorkflowRepository.getWorkflowById(workflowId);

      WorkflowRepository.deleteWorkflowExecutions(workflowId);
      WorkflowRepository.deleteWorkflow(workflowId);
      Scheduler.resync();

      // Lifecycle teardown — non-fatal
      if (workflowBeforeDelete) {
        await WorkflowLifecycleManager.deactivate(workflowBeforeDelete);
      }

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow deleted successfully",
        error: null,
        data: null,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to delete workflow",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Clear workflow executions ────────────

  fastify.delete("/workflows/:workflowId/executions", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      WorkflowRepository.deleteWorkflowExecutions(workflowId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow execution history cleared successfully",
        error: null,
        data: null,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to clear execution logs",
        error: error.message,
        data: null,
      });
    }
  });
}
