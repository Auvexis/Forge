import crypto from "crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import type { WorkflowItem, WorkflowNode } from "../../shared/models/workflow-types.ts";
import { WorkflowRepository } from "../modules/workflows/repository.ts";
import { WorkflowEngine, sanitizeContextForLogging } from "../modules/workflows/executor.ts";
import { workflowEventBus } from "../modules/workflows/event-bus.ts";
import { InternalEventBus, type InternalEvent } from "../modules/events/internal-event-bus.ts";
import { CancellationRegistry } from "../modules/workflows/cancellation-registry.ts";
import { Scheduler } from "../modules/scheduler/scheduler.ts";
import { PluginManager } from "../modules/plugins/manager.ts";

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
]);

// ──────────── Validation helper ────────────

function validateWorkflowDefinition(
  workflow: WorkflowItem,
): string | null {
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

  // ──────────── Webhook Ingress ────────────
  // Must be registered BEFORE /:workflowId routes to avoid conflicts

  fastify.all("/webhooks/:webhookPath", async (req, reply) => {
    const { webhookPath } = req.params as { webhookPath: string };

    const workflows = WorkflowRepository.getActiveWorkflows();
    const workflow = workflows.find(
      (wf) =>
        wf.trigger.type === "webhook" &&
        wf.trigger.webhookPath === webhookPath,
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

    const executionId = `exec_wh_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

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

      // SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": CLIENT_ORIGIN,
        "Access-Control-Allow-Credentials": "true",
      });

      const unsubscribe = workflowEventBus.onExecution(
        executionId,
        (event) => {
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
            event.type === "workflow:failed"  ||
            event.type === "workflow:cancelled"
          ) {
            // Small delay to ensure client receives the final event
            setTimeout(() => reply.raw.end(), 500);
          }
        },
      );

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        reply.raw.write(": heartbeat\n\n");
      }, 15000);

      // Cleanup on client disconnect
      req.raw.on("close", () => {
        unsubscribe();
        clearInterval(heartbeat);
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
              baseSchema.responseSchema = methodManifest?.responseSchema ?? null;
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
        workflow.trigger.webhookPath = `wh_${workflow.metadata.id}_${crypto
          .randomBytes(4)
          .toString("hex")}`;
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

  // ──────────── Publish a draft workflow ────────────

  fastify.post("/workflows/:workflowId/publish", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      const workflow = WorkflowRepository.publishDraft(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }

      Scheduler.resync();

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow published successfully",
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

  // ──────────── Delete a workflow ────────────

  fastify.delete("/workflows/:workflowId", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      WorkflowRepository.deleteWorkflowExecutions(workflowId);
      WorkflowRepository.deleteWorkflow(workflowId);
      Scheduler.resync();

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
