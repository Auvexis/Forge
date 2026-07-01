import type { FastifyInstance } from "fastify";
import { TriggerListenerRegistry } from "../modules/workflows/trigger-listener-registry.ts";
import { WorkflowRepository } from "../modules/workflows/repository.ts";

// ──────────── Generic Webhook Payload ────────────

/**
 * Represents a structured webhook payload for any service.
 * Preserves all request metadata for downstream workflow nodes.
 */
interface WebhookPayload {
  body: any;
  headers: Record<string, string>;
  query: Record<string, any>;
  method: string;
  contentType: string;
  receivedAt: number;
  identifier: string;
}

// ──────────── Routes ────────────

/**
 * Registers the generic webhook receiver routes.
 *
 * Architecture notes:
 * - This must be 100% generic. No plugin-specific logic belongs here.
 * - `POST /webhooks/:identifier` receives updates for any service.
 * - It returns `{ ok: true }` immediately, as most webhook senders require a fast 200 response to prevent retries.
 * - Headers (X-Signature, Authorization, etc.) are preserved for HMAC verification in workflows.
 */
export default async function webhooksRoutes(fastify: FastifyInstance) {

  // ── Generic Webhook Receiver ───────────────────────────────────────────────

  fastify.post("/webhooks/:identifier", async (req, reply) => {
    const { identifier } = req.params as { identifier: string };

    try {
      // Collect security-relevant headers that workflows may need for HMAC verification
      const rawHeaders = req.headers as Record<string, string | string[] | undefined>;
      const safeHeaders: Record<string, string> = {};

      for (const [key, value] of Object.entries(rawHeaders)) {
        if (value !== undefined) {
          safeHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
        }
      }

      const payload: WebhookPayload = {
        identifier,
        body: req.body ?? null,
        headers: safeHeaders,
        query: req.query as Record<string, any>,
        method: req.method,
        contentType: (req.headers["content-type"] ?? "").split(";")[0].trim(),
        receivedAt: Date.now(),
      };

      console.log(
        `[SAILOR | WEBHOOKS]: Webhook received — identifier: '${identifier}', content-type: ${payload.contentType}`
      );

      // ── Listen for Event intercept ─────────────────────────────────
      // If the frontend is currently waiting for a webhook on this identifier,
      // capture the payload via SSE and skip workflow execution.
      if (TriggerListenerRegistry.has(identifier)) {
        const { consumed, workflowId } = TriggerListenerRegistry.consume(identifier, payload);
        if (consumed && workflowId) {
          WorkflowRepository.saveLastTriggerPayload(workflowId, payload);
          console.log(`[SAILOR | WEBHOOKS]: Captured payload for 'Listen for Event' on '${identifier}'`);
        }
        return reply.code(200).send({ ok: true });
      }
      // ────────────────────────────────────────────────

      return reply.code(200).send({ ok: true });
    } catch (err: any) {
      console.error(`[SAILOR | WEBHOOKS]: Error processing webhook '${identifier}':`, err.message);
      // Return 200 to prevent the sender from retrying indefinitely
      return reply.code(200).send({ ok: true });
    }
  });

  // ── GET variant for webhook verification challenges ─────────────────────────
  // Some services (e.g. WhatsApp, GitHub) perform a GET challenge on webhook registration.

  fastify.get("/webhooks/:identifier", async (req, reply) => {
    const { identifier } = req.params as { identifier: string };
    const query = req.query as Record<string, string>;

    console.log(
      `[SAILOR | WEBHOOKS]: GET challenge received — identifier: '${identifier}', query:`,
      Object.keys(query)
    );

    // WhatsApp verification challenge
    if (query["hub.mode"] === "subscribe" && query["hub.challenge"]) {
      return reply.code(200).send(query["hub.challenge"]);
    }

    // Generic fallback — return the challenge query param if present
    if (query.challenge) {
      return reply.code(200).send(query.challenge);
    }

    return reply.code(200).send({ ok: true, identifier });
  });
}
