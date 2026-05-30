import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { WorkflowItem } from "../../shared/models/workflow-types.ts";
import { WorkflowEngine } from "../modules/workflows/executor.ts";
import { WorkflowRepository } from "../modules/workflows/repository.ts";
import { getTriggerEntry, getTriggerWebhookPath } from "../modules/workflows/workflow-triggers.ts";
import { evaluatePluginTriggerFilters } from "../modules/workflows/plugin-trigger-filter.ts";
import { TriggerListenerRegistry } from "../modules/workflows/trigger-listener-registry.ts";
import { devWorkflowSessionRuntime } from "../modules/workflows/dev-session/runtime.ts";
import { activeProfileRuntime } from "../profiles/active-profile-runtime.ts";

interface PluginEventWorkflowStore {
  getWorkflowById(id: string): WorkflowItem | null;
  saveLastTriggerPayload(workflowId: string, payload: Record<string, unknown>): void;
}

interface PluginEventEngine {
  executeWorkflowFromTrigger(
    workflow: WorkflowItem,
    triggerNodeId: string,
    triggerPayload: Record<string, unknown>,
    executionId: string,
  ): Promise<unknown>;
}

type PluginEventNormalizer = (args: {
  workflow: WorkflowItem;
  triggerNodeId: string;
  pluginId: string;
  triggerName: string;
  rawPayload: unknown;
}) => Promise<Record<string, unknown>>;

interface PluginEventsRoutesOptions {
  workflows?: PluginEventWorkflowStore;
  engine?: PluginEventEngine;
  normalizer?: PluginEventNormalizer;
  devSessions?: PluginEventDevSessions;
}

const defaultNormalizer: PluginEventNormalizer = async ({ rawPayload }) => {
  if (rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)) {
    return rawPayload as Record<string, unknown>;
  }
  return { value: rawPayload };
};

function validateSignature(payload: unknown, secret: string, signature: string | undefined): boolean {
  if (!signature) return false;

  try {
    const expected = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payload ?? {}))
      .digest("hex")}`;

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

function dedupeKey(pluginId: string, triggerName: string, payload: Record<string, unknown>): string | null {
  const eventId = payload.eventId ?? payload.id ?? payload.event_id;
  if (typeof eventId !== "string" && typeof eventId !== "number") return null;
  return `${pluginId}:${triggerName}:${String(eventId)}`;
}

export default async function pluginEventsRoutes(
  fastify: FastifyInstance,
  options: PluginEventsRoutesOptions = {},
) {
  const workflows = options.workflows ?? WorkflowRepository;
  const engine = options.engine ?? WorkflowEngine;
  const normalize = options.normalizer ?? defaultNormalizer;
  const devSessions = options.devSessions ?? devWorkflowSessionRuntime.manager;
  const acceptedEventKeys = new Set<string>();

  async function handlePluginEvent(req: FastifyRequest, reply: FastifyReply) {
    const { workflowId, triggerNodeId, pluginId, triggerName } = req.params as {
      workflowId: string;
      triggerNodeId: string;
      pluginId: string;
      triggerName: string;
    };

    const devTrigger = devSessions.findPluginTrigger(workflowId, triggerNodeId, pluginId, triggerName);
    const workflow = workflows.getWorkflowById(workflowId) ?? devTrigger?.workflow;
    if (!workflow) {
      return reply.code(404).send({ error: "Plugin event trigger not found" });
    }

    const entry = getTriggerEntry(workflow, triggerNodeId);
    if (
      !entry ||
      entry.disabled ||
      entry.trigger.type !== "plugin" ||
      entry.trigger.pluginId !== pluginId ||
      entry.trigger.triggerName !== triggerName
    ) {
      return reply.code(404).send({ error: "Plugin event trigger not found" });
    }

    if (entry.trigger.webhookSecret) {
      const signature = req.headers["x-sailor-signature"] as string | undefined;
      if (!validateSignature(req.body ?? {}, entry.trigger.webhookSecret, signature)) {
        return reply.code(401).send({ error: "Invalid plugin event signature" });
      }
    }

    const normalizedPayload = await normalize({
      workflow,
      triggerNodeId,
      pluginId,
      triggerName,
      rawPayload: req.body ?? {},
    });

    const filterResult = evaluatePluginTriggerFilters(
      entry.trigger.triggerParams ?? {},
      normalizedPayload,
    );
    if (!filterResult.accepted) {
      return reply.code(202).send({
        status: "ignored",
        reason: filterResult.reason,
      });
    }

    const webhookPath = getTriggerWebhookPath(workflow, entry);
    if (webhookPath && TriggerListenerRegistry.has(webhookPath)) {
      const { consumed, workflowId: consumedWorkflowId } = TriggerListenerRegistry.consume(
        webhookPath,
        normalizedPayload,
      );
      if (consumed && consumedWorkflowId) {
        workflows.saveLastTriggerPayload(consumedWorkflowId, normalizedPayload);
      }
      return reply.code(200).send({ ok: true });
    }

    const key = dedupeKey(pluginId, triggerName, normalizedPayload);
    if (key && acceptedEventKeys.has(key)) {
      return reply.code(202).send({
        status: "duplicate",
        message: "Plugin event already accepted",
      });
    }
    if (key) acceptedEventKeys.add(key);

    if (
      devTrigger &&
      devSessions.enqueuePluginEvent(
        workflowId,
        triggerNodeId,
        pluginId,
        triggerName,
        normalizedPayload,
      )
    ) {
      return reply.code(202).send({
        status: "accepted",
        mode: "dev-session",
      });
    }

    if (!workflow.metadata.isActive) {
      return reply.code(404).send({ error: "Plugin event trigger not found" });
    }

    workflows.saveLastTriggerPayload(workflowId, normalizedPayload);

    const executionId = `exec_plugin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await engine.executeWorkflowFromTrigger(
      workflow,
      triggerNodeId,
      normalizedPayload,
      executionId,
    );

    return reply.code(202).send({
      status: "accepted",
      executionId,
    });
  }

  fastify.post(
    "/plugin-events/:workflowId/:triggerNodeId/:pluginId/:triggerName",
    handlePluginEvent,
  );

  fastify.post(
    "/p/:profileId/plugin-events/:workflowId/:triggerNodeId/:pluginId/:triggerName",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { profileId } = req.params as { profileId: string };
      return activeProfileRuntime.profileScopeRunner.runWithProfile(profileId, () =>
        handlePluginEvent(req, reply),
      );
    },
  );
}

interface PluginEventDevSessions {
  findPluginTrigger(
    workflowId: string,
    triggerNodeId: string,
    pluginId: string,
    triggerName: string,
  ): { workflow: WorkflowItem; triggerNodeId: string } | null;
  enqueuePluginEvent(
    workflowId: string,
    triggerNodeId: string,
    pluginId: string,
    triggerName: string,
    payload: unknown,
  ): boolean;
}
