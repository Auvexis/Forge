import type { PluginTriggerHooks } from "@auvexis/fabric-sdk";

export interface MessagingTriggerPayload {
  eventId: string;
  messageId?: string;
  channelId?: string;
  userId?: string;
  text?: string;
  command?: string;
  isBot?: boolean;
  raw: unknown;
}

export function normalizeTelegramEvent(triggerName: string, raw: any): MessagingTriggerPayload {
  const message = raw?.message ?? raw?.callback_query?.message;
  const actor = raw?.message?.from ?? raw?.callback_query?.from;
  const text = raw?.message?.text ?? raw?.callback_query?.data;
  const command = triggerName === "onCommand" && typeof text === "string"
    ? text.trim().split(/\s+/)[0]
    : undefined;

  const payload: MessagingTriggerPayload = {
    eventId: String(raw?.update_id ?? raw?.callback_query?.id ?? raw?.message?.message_id ?? Date.now()),
    messageId: toOptionalString(message?.message_id),
    channelId: toOptionalString(message?.chat?.id),
    userId: toOptionalString(raw?.message?.from?.id ?? raw?.callback_query?.from?.id),
    text: typeof text === "string" ? text : undefined,
    raw,
  };
  if (command) payload.command = command;
  if (typeof actor?.is_bot === "boolean") payload.isBot = actor.is_bot;
  return payload;
}

export function createTelegramWebhookTrigger(): PluginTriggerHooks {
  return {
    async setup(ctx) {
      const token = ctx.credentials.bot_token?.trim();
      if (!token) {
        throw new Error("Telegram bot token is not configured. Please set credentials before publishing.");
      }

      const allowedTypesRaw = (ctx.params.allowedUpdateTypes as string | undefined)?.trim();
      const allowedUpdates = allowedTypesRaw
        ? allowedTypesRaw.split(",").map((type) => type.trim()).filter(Boolean)
        : [];

      const body: Record<string, unknown> = {
        url: ctx.webhookUrl,
        drop_pending_updates: true,
      };
      if (allowedUpdates.length > 0) {
        body.allowed_updates = allowedUpdates;
      }

      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json() as { ok: boolean; description?: string };
      if (!data.ok) {
        throw new Error(`Telegram setWebhook failed: ${data.description ?? "Unknown error"}`);
      }
    },

    async teardown(ctx) {
      const token = ctx.credentials.bot_token?.trim();
      if (!token) return;

      const response = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drop_pending_updates: false }),
      });

      const data = await response.json() as { ok: boolean; description?: string };
      if (!data.ok) {
        throw new Error(`Telegram deleteWebhook failed: ${data.description ?? "Unknown error"}`);
      }
    },
  };
}

function toOptionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}
