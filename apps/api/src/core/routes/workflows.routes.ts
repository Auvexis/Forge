import crypto from "crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import type {
  CallableWorkflowTriggerMetadata,
  CallableWorkflowTriggerType,
  FormTriggerField,
  WebhookBodyField,
  WorkflowItem,
  WorkflowNode,
  ReturnNode,
  WorkflowTrigger,
} from "../../shared/models/workflow-types.ts";
import { normalizeFormFields } from "../modules/forms/form-fields.ts";
import { registerFormRoutes } from "../modules/forms/form-routes.ts";
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
import { PendingWebhookResponseRegistry } from "../modules/workflows/pending-webhook-registry.ts";
import { Scheduler } from "../modules/scheduler/scheduler.ts";
import { PluginManager } from "../modules/plugins/manager.ts";
import { TriggerListenerRegistry } from "../modules/workflows/trigger-listener-registry.ts";
import { WorkflowLifecycleManager } from "../modules/workflows/lifecycle.ts";
import { devWorkflowSessionRuntime } from "../modules/workflows/dev-session/runtime.ts";
import { activeProfileRuntime } from "../profiles/active-profile-runtime.ts";
import { buildWorkflowSchema } from "../modules/workflows/workflow-schema.ts";
import { validateWorkflowDefinition } from "../modules/workflows/workflow-validation.ts";
import {
  getTriggerEntry,
  getTriggerWebhookPath,
  listTriggerEntries,
  resolveWebhookTrigger,
} from "../modules/workflows/workflow-triggers.ts";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:23802";
const DEV_SESSION_STREAM_RECONNECT_GRACE_MS = 5000;
const devSessionStreamConnections = new Map<string, number>();
const devSessionStopTimers = new Map<string, ReturnType<typeof setTimeout>>();
const CALLABLE_WORKFLOW_TRIGGER_TYPES = new Set<WorkflowTrigger["type"]>([
  "manual",
  "form",
  "webhook",
]);

interface ProfileScopeRunnerLike {
  listProfileIds(): string[];
  runWithProfile<T>(profileId: string, callback: () => T): T;
}

interface WorkflowsRoutesOptions {
  profileScopeRunner?: ProfileScopeRunnerLike;
}

interface CallableWorkflowSummary {
  id: string;
  name: string;
  description?: string;
  triggers: CallableWorkflowTriggerMetadata[];
}

const EMPTY_OBJECT_SCHEMA = { type: "object", properties: {} };

function callableTriggerIcon(type: CallableWorkflowTriggerType): string {
  if (type === "form") return "clipboard-list";
  if (type === "webhook") return "webhook";
  return "play-circle";
}

function formFieldJsonSchema(field: FormTriggerField): Record<string, any> {
  const schema: Record<string, any> = {
    type: field.type === "number"
      ? "number"
      : field.type === "checkbox"
        ? "boolean"
        : field.type === "multiselect" || field.type === "checkbox-group" || field.type === "file"
          ? "array"
          : "string",
    title: field.label,
  };
  if (field.description) schema.description = field.description;
  if (field.type === "email") schema.format = "email";
  if (field.type === "url") schema.format = "uri";
  if (field.type === "date") schema.format = "date";
  if (field.options?.length) {
    const values = field.options.map((option) => option.value);
    if (schema.type === "array") {
      schema.items = { type: "string", enum: values };
    } else {
      schema.enum = values;
    }
  }
  return schema;
}

function normalizeFormTriggerSchema(fields: unknown): Record<string, any> {
  const normalized = normalizeFormFields(fields);
  const properties = Object.fromEntries(
    normalized.map((field) => [field.name, formFieldJsonSchema(field as FormTriggerField)]),
  );
  const required = normalized.filter((field) => field.required).map((field) => field.name);
  return {
    type: "object",
    properties,
    ...(required.length ? { required } : {}),
  };
}

function normalizeWebhookTriggerSchema(
  fields: Record<string, WebhookBodyField> | undefined,
): Record<string, any> {
  const entries = Object.entries(fields ?? {});
  const properties = Object.fromEntries(
    entries.map(([name, field]) => [
      name,
      {
        type: field.type,
        ...(field.description ? { description: field.description } : {}),
      },
    ]),
  );
  const required = entries
    .filter(([, field]) => field.required)
    .map(([name]) => name);
  return {
    type: "object",
    properties,
    ...(required.length ? { required } : {}),
  };
}

function normalizeManualTriggerSchema(schema: Record<string, any> | undefined): Record<string, any> {
  if (!schema) return EMPTY_OBJECT_SCHEMA;
  if (schema.type === "object" && schema.properties && typeof schema.properties === "object") {
    return schema;
  }
  const properties = Object.fromEntries(
    Object.entries(schema).map(([name, field]) => {
      const { required: _required, ...propertySchema } = field && typeof field === "object"
        ? field as Record<string, any>
        : { type: "string" };
      return [name, propertySchema];
    }),
  );
  const required = Object.entries(schema)
    .filter(([, field]) => Boolean((field as Record<string, any> | undefined)?.required))
    .map(([name]) => name);
  return {
    type: "object",
    properties,
    ...(required.length ? { required } : {}),
  };
}

function normalizeCallableTriggerSchema(trigger: WorkflowTrigger): Record<string, any> {
  if (trigger.type === "manual") return normalizeManualTriggerSchema(trigger.schema);
  if (trigger.type === "form") return normalizeFormTriggerSchema(trigger.formFields);
  if (trigger.type === "webhook") return normalizeWebhookTriggerSchema(trigger.webhookBodySchema);
  return EMPTY_OBJECT_SCHEMA;
}

function inferCallableReturnFields(workflow: WorkflowItem): Array<{ key: string; type: string }> {
  return Object.values(workflow.nodes)
    .filter((node): node is ReturnNode => node.type === "return")
    .filter((node) => node.mode === "fields")
    .flatMap((node) => node.fields ?? [])
    .map((field) => field.key.trim())
    .filter(Boolean)
    .filter((key, index, keys) => keys.indexOf(key) === index)
    .map((key) => ({ key, type: "unknown" }));
}

function listCallableWorkflowSummaries(): CallableWorkflowSummary[] {
  return WorkflowRepository.getActiveWorkflows()
    .map((workflow) => {
      const returns = inferCallableReturnFields(workflow);
      const triggers = listTriggerEntries(workflow)
        .filter((entry) => !entry.disabled)
        .filter((entry) => CALLABLE_WORKFLOW_TRIGGER_TYPES.has(entry.trigger.type))
        .map((entry) => {
          const type = entry.trigger.type as CallableWorkflowTriggerType;
          return {
            id: entry.id,
            name: entry.name,
            type,
            icon: callableTriggerIcon(type),
            schema: normalizeCallableTriggerSchema(entry.trigger),
            returns,
          };
        });

      return {
        id: workflow.metadata.id,
        name: workflow.metadata.name,
        description: workflow.metadata.description,
        triggers,
      };
    })
    .filter((workflow) => workflow.triggers.length > 0);
}

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


// ──────────── Webhook signature validation ────────────

async function parseTriggerPayload(req: FastifyRequest): Promise<Record<string, any>> {
  const multipartReq = req as FastifyRequest & {
    isMultipart?: () => boolean;
    parts?: () => AsyncIterable<any>;
  };

  if (!multipartReq.isMultipart?.()) {
    return (req.body as Record<string, any>) || {};
  }

  const payload: Record<string, any> = {};
  for await (const part of multipartReq.parts?.() ?? []) {
    if (part.type === "file") {
      const current = payload[part.fieldname];
      const file = {
        content: await part.toBuffer(),
        filename: part.filename,
        mimeType: part.mimetype,
      };
      payload[part.fieldname] = current === undefined
        ? file
        : Array.isArray(current)
          ? [...current, file]
          : [current, file];
    } else {
      try {
        payload[part.fieldname] = JSON.parse(part.value as string);
      } catch {
        payload[part.fieldname] = part.value;
      }
    }
  }
  return payload;
}

function extractTriggerNodeId(payload: Record<string, any>): string | undefined {
  const triggerNodeId =
    typeof payload.triggerNodeId === "string"
      ? String(payload.triggerNodeId)
      : typeof payload._triggerNodeId === "string"
        ? String(payload._triggerNodeId)
        : undefined;
  delete payload.triggerNodeId;
  delete payload._triggerNodeId;
  return triggerNodeId;
}

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

async function handleProductionWebhook(
  req: FastifyRequest,
  reply: FastifyReply,
  webhookPath: string,
  options: { awaitBackgroundExecution?: boolean } = {},
) {
  console.log(
    `[FABRIC | WEBHOOK-IN]: ${req.method} /webhook/${webhookPath} - ` +
      `listen-active=${TriggerListenerRegistry.has(webhookPath)} ` +
      `body-keys=${Object.keys((req.body as any) ?? {}).join(",")}`,
  );

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

    const { consumed, workflowId } = TriggerListenerRegistry.consume(
      webhookPath,
      payload,
    );
    if (consumed && workflowId) {
      WorkflowRepository.saveLastTriggerPayload(workflowId, payload);
    }
    return reply.code(200).send({ ok: true });
  }

  const resolved = resolveWebhookTrigger(WorkflowRepository.getWorkflows(), webhookPath);
  if (!resolved) {
    return reply.code(404).send({ error: "Webhook not found" });
  }
  const { workflow, triggerNodeId, entry } = resolved;

  const allowedMethods = entry.trigger.webhookMethods ?? ["POST"];
  if (!allowedMethods.includes(req.method as any)) {
    return reply
      .code(405)
      .send({ error: `Method ${req.method} not allowed` });
  }

  if (entry.trigger.webhookSecret) {
    const signature = req.headers["x-fabric-signature"] as string | undefined;
    if (!signature) {
      return reply
        .code(401)
        .send({ error: "Missing X-Fabric-Signature header" });
    }
    const rawBody = JSON.stringify(req.body ?? {});
    if (
      !validateWebhookSignature(
        rawBody,
        entry.trigger.webhookSecret,
        signature,
      )
    ) {
      return reply.code(401).send({ error: "Invalid webhook signature" });
    }
  } else {
    console.warn(
      `[FABRIC | WEBHOOK]: Webhook "${webhookPath}" has no secret configured - consider adding one`,
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
    `[FABRIC | WEBHOOKS]: Webhook received - identifier: '${webhookPath}', content-type: ${contentType}`,
  );

  const executionId = `exec_wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const hasRespondNode = Object.values(workflow.nodes).some(
    (n: any) => n.type === "respond-webhook",
  );

  if (hasRespondNode) {
    const correlationId = `wh_${executionId}`;
    const enrichedPayload = {
      ...triggerPayload,
      _webhookCorrelationId: correlationId,
    };

    WorkflowEngine.executeWorkflowFromTrigger(
      workflow,
      triggerNodeId,
      enrichedPayload,
      executionId,
    ).catch((err: Error) =>
      console.error(
        `[FABRIC | WEBHOOK]: Execution failed for "${webhookPath}": ${err.message}`,
      ),
    );

    try {
      const webhookResponse =
        await PendingWebhookResponseRegistry.waitForResponse(
          correlationId,
          30_000,
        );

      if (webhookResponse.headers) {
        for (const [k, v] of Object.entries(webhookResponse.headers)) {
          reply.header(k, v);
        }
      }

      return reply
        .code(webhookResponse.statusCode)
        .send(webhookResponse.body);
    } catch {
      return reply
        .code(504)
        .send({
          error: "Gateway Timeout - workflow did not respond in time",
        });
    }
  }

  const execution = WorkflowEngine.executeWorkflowFromTrigger(
    workflow,
    triggerNodeId,
    triggerPayload,
    executionId,
  );

  if (options.awaitBackgroundExecution) {
    await execution;
  } else {
    execution.catch((err: Error) =>
      console.error(
        `[FABRIC | WEBHOOK]: Execution failed for "${webhookPath}": ${err.message}`,
      ),
    );
  }

  return reply.code(202).send({
    status: "accepted",
    executionId,
    message: `Workflow "${workflow.metadata.name}" triggered via webhook`,
  });
}

export default async function workflowsRoutes(
  fastify: FastifyInstance,
  options: WorkflowsRoutesOptions = {},
) {
  const profileScopeRunner =
    options.profileScopeRunner ?? activeProfileRuntime.profileScopeRunner;
  const sendResponse = <T>(reply: FastifyReply, response: ApiResponse<T>) => {
    return reply.code(response.status_code).send(response);
  };
  const withActiveProfilePayload = (payload: Record<string, any> = {}) => {
    const activeProfileId =
      activeProfileRuntime.activeProfileService.getActiveProfile()?.id ?? "default";
    return {
      ...payload,
      profileId: payload.profileId ?? activeProfileId,
    };
  };

  // ──────────── Webhook Ingress ─ TEST MODE (draft / unpublished) ────────────
  // Executes synchronously and returns the full context state.
  // Useful for debugging from the workflow editor.

  fastify.all("/webhook-test/:webhookPath", async (req, reply) => {
    const { webhookPath } = req.params as { webhookPath: string };

    const devPayload = {
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body ?? {},
      ip: req.ip,
      timestamp: Date.now(),
    };

    if (devWorkflowSessionRuntime.manager.enqueueWebhook(webhookPath, devPayload)) {
      return reply.code(202).send({
        status: "accepted",
        mode: "dev-session",
        webhookPath,
      });
    }

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

      const { consumed, workflowId } = TriggerListenerRegistry.consume(
        webhookPath,
        payload,
      );
      if (consumed && workflowId) {
        WorkflowRepository.saveLastTriggerPayload(workflowId, payload);
      }
      return reply.code(200).send({ ok: true });
    }
    // ──────────────────────────────────────────────────────────────

    const resolved = resolveWebhookTrigger(WorkflowRepository.getWorkflows(), webhookPath);

    if (!resolved) {
      return reply.code(404).send({ error: "Webhook not found" });
    }
    const { workflow, triggerNodeId, entry } = resolved;

    const allowedMethods = entry.trigger.webhookMethods ?? ["POST"];
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
      const result = await WorkflowEngine.executeWorkflowFromTrigger(
        workflow,
        triggerNodeId,
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

  fastify.all("/p/:profileId/webhook/:webhookPath", async (req, reply) => {
    const { profileId, webhookPath } = req.params as {
      profileId: string;
      webhookPath: string;
    };

    try {
      return await profileScopeRunner.runWithProfile(profileId, () =>
        handleProductionWebhook(req, reply, webhookPath, {
          awaitBackgroundExecution: true,
        }),
      );
    } catch (error: any) {
      if (error instanceof Error && /Profile '.+' not found/.test(error.message)) {
        return reply.code(404).send({ error: "Profile not found" });
      }
      throw error;
    }
  });

  fastify.all("/webhook/:webhookPath", async (req, reply) => {
    const { webhookPath } = req.params as { webhookPath: string };
    return handleProductionWebhook(req, reply, webhookPath);
  });

  // Form Trigger routes are owned by the forms module.
  registerFormRoutes(fastify, {
    clientOrigin: CLIENT_ORIGIN,
    sendResponse,
    profileScopeRunner,
  });

  fastify.get("/p/:profileId/workflows/:workflowId/executions", async (req, reply) => {
    const { profileId, workflowId } = req.params as {
      profileId: string;
      workflowId: string;
    };

    try {
      const executions = await profileScopeRunner.runWithProfile(profileId, () =>
        WorkflowRepository.getWorkflowExecutions(workflowId),
      );
      return sendResponse(reply, {
        status_code: 200,
        message: "Executions fetched successfully",
        error: null,
        data: executions,
      });
    } catch (error: any) {
      if (error instanceof Error && /Profile '.+' not found/.test(error.message)) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Profile not found",
          error: error.message,
          data: null,
        });
      }

      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch executions",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── SSE Stream Endpoint ────────────

  fastify.get(
    "/workflows/dev-sessions/:sessionId/stream",
    async (req, reply) => {
      const { sessionId } = req.params as { sessionId: string };

      if (!devWorkflowSessionRuntime.manager.getSession(sessionId)) {
        return reply.code(404).send({ error: "Dev workflow session not found" });
      }

      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": CLIENT_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
      });
      reply.raw.write(": connected\n\n");

      let stoppedBySession = false;
      const pendingStop = devSessionStopTimers.get(sessionId);
      if (pendingStop) {
        clearTimeout(pendingStop);
        devSessionStopTimers.delete(sessionId);
      }
      devSessionStreamConnections.set(
        sessionId,
        (devSessionStreamConnections.get(sessionId) ?? 0) + 1,
      );
      const unsubscribe = devWorkflowSessionRuntime.eventBus.onSession(
        sessionId,
        (event) => {
          try {
            reply.raw.write(`data: ${safeSerialize(event)}\n\n`);
          } catch {
            const fallback = { ...event, data: "[unserializable output]" };
            try {
              reply.raw.write(`data: ${JSON.stringify(fallback)}\n\n`);
            } catch {
              /* skip */
            }
          }

          if (event.type === "session:stopped") {
            stoppedBySession = true;
            const stopTimer = devSessionStopTimers.get(sessionId);
            if (stopTimer) clearTimeout(stopTimer);
            devSessionStopTimers.delete(sessionId);
            devSessionStreamConnections.delete(sessionId);
            setTimeout(() => reply.raw.end(), 250);
          }
        },
      );

      const heartbeat = setInterval(() => {
        reply.raw.write(": heartbeat\n\n");
      }, 15000);

      req.raw.on("close", () => {
        unsubscribe();
        clearInterval(heartbeat);
        const connections = Math.max(
          0,
          (devSessionStreamConnections.get(sessionId) ?? 1) - 1,
        );
        if (connections > 0) {
          devSessionStreamConnections.set(sessionId, connections);
          return;
        }
        devSessionStreamConnections.delete(sessionId);
        if (stoppedBySession) return;

        const timer = setTimeout(() => {
          devSessionStopTimers.delete(sessionId);
          if ((devSessionStreamConnections.get(sessionId) ?? 0) > 0) return;
          devWorkflowSessionRuntime.manager
            .stopSession(sessionId, "sse disconnected")
            .catch(console.error);
        }, DEV_SESSION_STREAM_RECONNECT_GRACE_MS);
        devSessionStopTimers.set(sessionId, timer);
      });

      return new Promise((resolve) => {
        req.raw.on("close", resolve);
      });
    },
  );

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
      reply.raw.write(": connected\n\n");

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

  fastify.get("/workflows/callable", async (_req, reply) => {
    try {
      return sendResponse(reply, {
        status_code: 200,
        message: "Callable workflows fetched successfully",
        error: null,
        data: listCallableWorkflowSummaries(),
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch callable workflows",
        error: error.message,
        data: null,
      });
    }
  });

  fastify.get("/workflows/:workflowId", async (req, reply) => {
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

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow fetched successfully",
        error: null,
        data: workflow,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch workflow",
        error: error.message,
        data: null,
      });
    }
  });

  // ──────────── Save or Update a workflow ────────────

  fastify.get("/workflows/:workflowId/git/status", async (req, reply) => {
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

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow git status fetched successfully",
        error: null,
        data: WorkflowRepository.getWorkflowGitSnapshotStatus(workflowId),
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch workflow git status",
        error: error.message,
        data: null,
      });
    }
  });

  fastify.get("/workflows/:workflowId/git/snapshots", async (req, reply) => {
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

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow git snapshots fetched successfully",
        error: null,
        data: WorkflowRepository.listWorkflowGitSnapshots(workflowId),
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch workflow git snapshots",
        error: error.message,
        data: null,
      });
    }
  });

  fastify.post("/workflows/:workflowId/git/commit", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    const { message } = (req.body ?? {}) as { message?: string };

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

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow git commit completed successfully",
        error: null,
        data: WorkflowRepository.commitWorkflowGitSnapshot(workflowId, message),
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to commit workflow git snapshot",
        error: error.message,
        data: null,
      });
    }
  });

  fastify.get("/workflows/:workflowId/git/snapshots/:hash", async (req, reply) => {
    const { workflowId, hash } = req.params as { workflowId: string; hash: string };

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

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow git snapshot fetched successfully",
        error: null,
        data: WorkflowRepository.readWorkflowGitSnapshot(workflowId, hash),
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch workflow git snapshot",
        error: error.message,
        data: null,
      });
    }
  });

  fastify.post("/workflows/:workflowId/git/snapshots/:hash/restore", async (req, reply) => {
    const { workflowId, hash } = req.params as { workflowId: string; hash: string };

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

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow git snapshot restored successfully",
        error: null,
        data: WorkflowRepository.restoreWorkflowGitSnapshot(workflowId, hash),
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to restore workflow git snapshot",
        error: error.message,
        data: null,
      });
    }
  });

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

      if (workflow.trigger.type === "form" && workflow.trigger.formSlug) {
        const slugError = WorkflowRepository.validateFormSlug(
          workflow.trigger.formSlug,
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

      const triggerError = prepareTriggerNodesForSave(workflow);
      if (triggerError) {
        return sendResponse(reply, {
          status_code: 400,
          message: triggerError,
          error: triggerError,
          data: null,
        });
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

  fastify.post("/workflows/:workflowId/dev-sessions", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };

    try {
      const rawBody = await parseTriggerPayload(req);
      const body = rawBody.payload && typeof rawBody.payload === "object" && !Array.isArray(rawBody.payload)
        ? {
            payload: rawBody.payload as Record<string, any>,
            triggerNodeId: typeof rawBody.triggerNodeId === "string" ? rawBody.triggerNodeId : undefined,
          }
        : {
            payload: rawBody,
            triggerNodeId: extractTriggerNodeId(rawBody),
          };
      const workflow = WorkflowRepository.getWorkflowById(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }

      const session = await devWorkflowSessionRuntime.manager.createSession(workflow, {
        initialPayload: withActiveProfilePayload(body.payload ?? {}),
        initialTriggerNodeId: body.triggerNodeId,
        profileId: activeProfileRuntime.activeProfileService.getActiveProfile()?.id ?? "default",
      });
      const triggers = listTriggerEntries(workflow)
        .filter((entry) => !entry.disabled)
        .map((entry) => ({
          triggerNodeId: entry.id,
          type: entry.trigger.type,
          name: entry.name,
          webhookPath: getTriggerWebhookPath(workflow, entry),
        }));

      return sendResponse(reply, {
        status_code: 201,
        message: "Dev workflow session started",
        error: null,
        data: {
          sessionId: session.id,
          status: session.status,
          triggers,
          initialPayload: body.payload ?? {},
        },
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: `Failed to start dev workflow session: ${error.message}`,
        error: error.message,
        data: null,
      });
    }
  });

  fastify.post("/workflows/dev-sessions/:sessionId/stop", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };

    await devWorkflowSessionRuntime.manager.stopSession(sessionId, "manual stop");

    return sendResponse(reply, {
      status_code: 202,
      message: "Dev workflow session stop requested",
      error: null,
      data: { sessionId },
    });
  });

  fastify.post("/workflows/dev-sessions/:sessionId/triggers/:triggerNodeId/execute", async (req, reply) => {
    const { sessionId, triggerNodeId } = req.params as {
      sessionId: string;
      triggerNodeId: string;
    };
    const rawBody = await parseTriggerPayload(req);
    const body = rawBody.payload && typeof rawBody.payload === "object" && !Array.isArray(rawBody.payload)
      ? { payload: rawBody.payload as Record<string, any> }
      : { payload: rawBody };
    const session = devWorkflowSessionRuntime.manager.getSession(sessionId);

    if (!session) {
      return sendResponse(reply, {
        status_code: 404,
        message: "Dev workflow session not found",
        error: "Not Found",
        data: null,
      });
    }

    const triggerEntry = getTriggerEntry(session.workflow, triggerNodeId);
    if (
      !triggerEntry ||
      triggerEntry.disabled ||
      (triggerEntry.trigger.type !== "manual" && triggerEntry.trigger.type !== "chat")
    ) {
      return sendResponse(reply, {
        status_code: 400,
        message: "Manual or chat trigger not available for this dev session",
        error: "Bad Request",
        data: null,
      });
    }

    const source = triggerEntry.trigger.type === "chat" ? "chat" : "manual";
    const payload = withActiveProfilePayload(body.payload ?? {});
    const job = devWorkflowSessionRuntime.manager.enqueueJob(sessionId, {
      triggerNodeId,
      source,
      payload,
    });
    devWorkflowSessionRuntime.eventBus.emitSessionEvent({
      type: "trigger:received",
      sessionId,
      workflowId: session.workflowId,
      executionId: job.executionId,
      triggerNodeId,
      jobId: job.id,
      source,
      timestamp: Date.now(),
      data: payload,
    });

    return sendResponse(reply, {
      status_code: 202,
      message: source === "chat" ? "Chat trigger queued" : "Manual trigger queued",
      error: null,
      data: {
        sessionId,
        jobId: job.id,
        executionId: job.executionId,
        triggerNodeId,
      },
    });
  });

  fastify.get("/workflows/dev-sessions/:sessionId", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const session = devWorkflowSessionRuntime.manager.getSession(sessionId);

    if (!session) {
      return sendResponse(reply, {
        status_code: 404,
        message: "Dev workflow session not found",
        error: "Not Found",
        data: null,
      });
    }

    return sendResponse(reply, {
      status_code: 200,
      message: "Dev workflow session fetched",
      error: null,
      data: {
        sessionId: session.id,
        workflowId: session.workflowId,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        stopReason: session.stopReason,
      },
    });
  });

  fastify.post("/workflows/:workflowId/execute", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    const query = req.query as { triggerNodeId?: string; waitForResult?: string };

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

      const headerExecRaw = req.headers["x-fabric-execution-id"];
      const headerExecutionId =
        typeof headerExecRaw === "string" &&
        headerExecRaw.length < 96 &&
        /^exec_\d+_[a-z0-9]+$/i.test(headerExecRaw)
          ? headerExecRaw
          : null;

      const multipartReq = req as typeof req & {
        isMultipart(): boolean;
        parts(): AsyncIterable<any>;
      };
      if (multipartReq.isMultipart()) {
        const parts = multipartReq.parts();
        for await (const part of parts) {
          if (part.type === "file") {
            triggerPayload[part.fieldname] = {
              content: await part.toBuffer(),
              filename: part.filename,
              mimeType: part.mimetype,
            };
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
      const bodyTriggerNodeId =
        typeof triggerPayload._triggerNodeId === "string"
          ? String(triggerPayload._triggerNodeId)
          : undefined;
      delete triggerPayload._triggerNodeId;
      const triggerNodeId = query.triggerNodeId || bodyTriggerNodeId || "trigger";

      const executionId =
        headerExecutionId ??
        `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      if (query.waitForResult === "true") {
        const execution = await WorkflowEngine.executeWorkflowFromTrigger(
          workflow,
          triggerNodeId,
          triggerPayload,
          executionId,
        );
        return sendResponse(reply, {
          status_code: execution.status === "SUCCESS" ? 200 : 500,
          message: execution.status === "SUCCESS"
            ? "Workflow execution completed"
            : `Workflow execution finished with status ${execution.status}`,
          error: execution.status === "SUCCESS" ? null : execution.status,
          data: {
            executionId,
            status: execution.status,
            result: sanitizeContextForLogging(execution.context?.result ?? null),
          },
        });
      }

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
        WorkflowEngine.executeWorkflowFromTrigger(
          workflow,
          triggerNodeId,
          triggerPayload,
          executionId,
        ).catch((err: Error) =>
          console.error(
            `[FABRIC | WORKFLOW]: Background execution ${executionId} failed: ${err.message}`,
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
      const body = req.body as WorkflowNode | {
        nodeConfig?: WorkflowNode;
        context?: any;
      };
      const overrideNodeConfig = "nodeConfig" in body && body.nodeConfig
        ? body.nodeConfig
        : body as WorkflowNode;

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

        if ("context" in body && body.context) {
          baseContext = body.context;
        } else if (lastExecution && lastExecution.context) {
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

      const schema = buildWorkflowSchema(workflow, {
        getPlugin: (pluginId) => PluginManager.getPlugin(pluginId),
      });

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow schema retrieved",
        error: null,
        data: schema,
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

      if (workflow.trigger.type === "form" && workflow.trigger.formSlug) {
        const slugError = WorkflowRepository.validateFormSlug(
          workflow.trigger.formSlug,
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

      const triggerError = prepareTriggerNodesForSave(workflow);
      if (triggerError) {
        return sendResponse(reply, {
          status_code: 400,
          message: triggerError,
          error: triggerError,
          data: null,
        });
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

  fastify.get("/workflows/production-status/global", async (_req, reply) => {
    try {
      const profileIds = profileScopeRunner.listProfileIds();
      const statuses = profileIds.flatMap((profileId) =>
          profileScopeRunner.runWithProfile(profileId, () =>
            WorkflowRepository.getProductionStatus().map((item) => ({
              ...item,
              profileId,
            })),
          ),
        );

      return sendResponse(reply, {
        status_code: 200,
        message: "Global production status fetched",
        error: null,
        data: statuses,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch global production status",
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
    const query = req.query as { triggerNodeId?: string };
    const triggerNodeId = query.triggerNodeId || "trigger";

    const workflow = WorkflowRepository.getWorkflowById(workflowId);
    if (!workflow) {
      return reply.code(404).send({ error: "Workflow not found" });
    }

    // Determine the webhook path used for this trigger
    const triggerEntry = getTriggerEntry(workflow, triggerNodeId);
    if (!triggerEntry) {
      return reply.code(404).send({ error: "Trigger not found" });
    }
    const webhookPath = getTriggerWebhookPath(workflow, triggerEntry);

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
      triggerEntry.trigger.type === "plugin" && !workflow.metadata.isActive;

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
        await WorkflowLifecycleManager.activate(workflow, {
          profileId: activeProfileRuntime.activeProfileService.getActiveProfile()?.id,
        });
      } catch (err: any) {
        console.error(
          `[FABRIC | LISTEN]: Failed to temporarily activate plugin trigger:`,
          err.message,
        );
        reply.raw.write(
          `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`,
        );
        reply.raw.end();
        return;
      }
    }

    // Notify the frontend that listening started
    reply.raw.write(
      `data: ${JSON.stringify({ type: "listening", webhookPath })}\n\n`,
    );

    const LISTEN_TIMEOUT_MS = 120_000; // 2 minutes

    const timeoutId = setTimeout(() => {
      performTeardown();
      try {
        reply.raw.write(`data: ${JSON.stringify({ type: "timeout" })}\n\n`);
        reply.raw.end();
      } catch {
        /* already closed */
      }
    }, LISTEN_TIMEOUT_MS);

    // Register with SSE sender function
    TriggerListenerRegistry.register(webhookPath, workflowId, (payload) => {
      clearTimeout(timeoutId);
      performTeardown();
      try {
        reply.raw.write(
          `data: ${JSON.stringify({ type: "captured", payload })}\n\n`,
        );
        reply.raw.end();
      } catch {
        /* already closed */
      }
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

  fastify.get(
    "/workflows/:workflowId/trigger/last-payload",
    async (req, reply) => {
      const { workflowId } = req.params as { workflowId: string };
      const payload = WorkflowRepository.getLastTriggerPayload(workflowId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Last trigger payload fetched",
        error: null,
        data: payload,
      });
    },
  );

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
        `[FABRIC | WORKFLOWS]: Published workflow "${workflow.metadata.name}" (${workflowId})`,
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
      const workflowBeforeUnpublish =
        WorkflowRepository.getWorkflowById(workflowId);

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
        await WorkflowLifecycleManager.deactivate(workflowBeforeUnpublish, {
          profileId: activeProfileRuntime.activeProfileService.getActiveProfile()?.id,
        });
      }

      console.log(
        `[FABRIC | WORKFLOWS]: Unpublished workflow "${workflow.metadata.name}" (${workflowId})`,
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
      const workflowBeforeDelete =
        WorkflowRepository.getWorkflowById(workflowId);

      WorkflowRepository.deleteWorkflowExecutions(workflowId);
      WorkflowRepository.deleteWorkflow(workflowId);
      Scheduler.resync();

      // Lifecycle teardown — non-fatal
      if (workflowBeforeDelete) {
        await WorkflowLifecycleManager.deactivate(workflowBeforeDelete, {
          profileId: activeProfileRuntime.activeProfileService.getActiveProfile()?.id,
        });
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

function prepareTriggerNodesForSave(workflow: WorkflowItem): string | null {
  const webhookSlugs = new Set<string>();
  const formSlugs = new Set<string>();

  for (const entry of listTriggerEntries(workflow)) {
    const trigger = entry.trigger;
    if ((trigger.type === "webhook" || trigger.type === "plugin") && !trigger.webhookPath) {
      trigger.webhookPath = `wh_${workflow.metadata.id}_${entry.id}_${crypto
        .randomBytes(4)
        .toString("hex")}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    if ((trigger.type === "webhook" || trigger.type === "plugin") && trigger.webhookSlug) {
      if (webhookSlugs.has(trigger.webhookSlug)) {
        return `webhookSlug '${trigger.webhookSlug}' is duplicated in this workflow`;
      }
      webhookSlugs.add(trigger.webhookSlug);
      const slugError = WorkflowRepository.validateWebhookSlug(
        trigger.webhookSlug,
        workflow.metadata.id,
      );
      if (slugError) return slugError;
    }

    if (trigger.type === "form" && trigger.formSlug) {
      if (formSlugs.has(trigger.formSlug)) {
        return `formSlug '${trigger.formSlug}' is duplicated in this workflow`;
      }
      formSlugs.add(trigger.formSlug);
      const slugError = WorkflowRepository.validateFormSlug(
        trigger.formSlug,
        workflow.metadata.id,
      );
      if (slugError) return slugError;
    }
  }

  return null;
}
