import type { FastifyInstance } from "fastify";

// ──────────── Webhook Update Types ────────────

/**
 * Represents a structured Telegram update payload.
 * The `updateType` field is derived by the receiver for easy consumption in workflows.
 */
interface TelegramUpdatePayload {
  updateType: "message" | "edited_message" | "callback_query" | "poll_answer" | "unknown";
  updateId: number;
  message?: Record<string, any>;
  editedMessage?: Record<string, any>;
  callbackQuery?: Record<string, any>;
  pollAnswer?: Record<string, any>;
  raw: Record<string, any>;
}

// ──────────── Update Parser ────────────

/**
 * Parses a raw Telegram update object into a structured payload.
 *
 * Telegram sends updates as JSON objects with one of several top-level keys
 * (`message`, `callback_query`, `poll_answer`, etc.) that identifies the update type.
 * This function normalises the update into a consistent shape for workflow consumption.
 *
 * @see https://core.telegram.org/bots/api#update
 */
function parseTelegramUpdate(raw: Record<string, any>): TelegramUpdatePayload {
  const base = { updateId: raw.update_id as number, raw };

  if (raw.message) {
    return { ...base, updateType: "message", message: raw.message };
  }
  if (raw.edited_message) {
    return { ...base, updateType: "edited_message", editedMessage: raw.edited_message };
  }
  if (raw.callback_query) {
    return { ...base, updateType: "callback_query", callbackQuery: raw.callback_query };
  }
  if (raw.poll_answer) {
    return { ...base, updateType: "poll_answer", pollAnswer: raw.poll_answer };
  }

  return { ...base, updateType: "unknown" };
}

// ──────────── Generic Webhook Payload ────────────

/**
 * Represents a structured webhook payload for non-Telegram sources.
 * Preserves all request metadata for downstream workflow nodes.
 */
interface GenericWebhookPayload {
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
 * - `POST /webhooks/telegram` is a special-cased path that parses Telegram updates.
 * - `POST /webhooks/:identifier` is the generic fallback for any other service.
 * - Both routes return `{ ok: true }` immediately — Telegram (and most webhook senders)
 *   require a fast 200 response to prevent retries. Processing happens asynchronously.
 * - Headers (X-Signature, Authorization, etc.) are preserved for HMAC verification
 *   in future workflow nodes.
 *
 * IMPORTANT: The Telegram-specific route MUST be registered BEFORE the generic one,
 * otherwise Fastify's router would match `/webhooks/telegram` as `:identifier = "telegram"`.
 */
export default async function webhooksRoutes(fastify: FastifyInstance) {

  // ── Telegram Webhook Receiver ──────────────────────────────────────────────

  fastify.post("/webhooks/telegram", {
    // Telegram sends JSON bodies — skip multipart parsing for this route
    config: { rawBody: false },
  }, async (req, reply) => {
    try {
      const raw = req.body as Record<string, any>;

      if (!raw || typeof raw !== "object") {
        // Return 200 even for malformed payloads — Telegram retries on non-200
        console.warn("[NOD8 | WEBHOOKS]: Received malformed Telegram update (non-object body)");
        return reply.code(200).send({ ok: true });
      }

      const payload = parseTelegramUpdate(raw);

      console.log(
        `[NOD8 | WEBHOOKS]: Telegram update received — type: ${payload.updateType}, updateId: ${payload.updateId}`
      );

      // TODO (Phase 2): Trigger active workflows that have trigger.type = "webhook"
      // and trigger.webhookSlug matching "telegram" or the bot's identifier.
      // WorkflowEngine.triggerWebhook("telegram", payload);

      return reply.code(200).send({ ok: true });
    } catch (err: any) {
      console.error("[NOD8 | WEBHOOKS]: Error processing Telegram update:", err.message);
      // Always return 200 to Telegram to prevent infinite retries
      return reply.code(200).send({ ok: true });
    }
  });

  // ── Generic Webhook Receiver ───────────────────────────────────────────────

  fastify.post("/webhooks/:identifier", async (req, reply) => {
    const { identifier } = req.params as { identifier: string };

    try {
      // Collect security-relevant headers that workflows may need for HMAC verification
      // (e.g. X-Hub-Signature-256 for GitHub, Stripe-Signature for Stripe)
      const rawHeaders = req.headers as Record<string, string | string[] | undefined>;
      const safeHeaders: Record<string, string> = {};

      for (const [key, value] of Object.entries(rawHeaders)) {
        if (value !== undefined) {
          safeHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
        }
      }

      const payload: GenericWebhookPayload = {
        identifier,
        body: req.body ?? null,
        headers: safeHeaders,
        query: req.query as Record<string, any>,
        method: req.method,
        contentType: (req.headers["content-type"] ?? "").split(";")[0].trim(),
        receivedAt: Date.now(),
      };

      console.log(
        `[NOD8 | WEBHOOKS]: Generic webhook received — identifier: '${identifier}', content-type: ${payload.contentType}`
      );

      // TODO (Phase 2): Trigger active workflows that have trigger.type = "webhook"
      // and trigger.webhookSlug = identifier.
      // WorkflowEngine.triggerWebhook(identifier, payload);

      return reply.code(200).send({ ok: true });
    } catch (err: any) {
      console.error(`[NOD8 | WEBHOOKS]: Error processing webhook '${identifier}':`, err.message);
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
      `[NOD8 | WEBHOOKS]: GET challenge received — identifier: '${identifier}', query:`,
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
