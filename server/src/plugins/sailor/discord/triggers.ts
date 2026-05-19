import type { PluginTriggerHooks } from "@auvexis/sailor-sdk";

interface MessagingTriggerPayload {
  eventId: string;
  messageId?: string;
  channelId?: string;
  userId?: string;
  text?: string;
  command?: string;
  raw: unknown;
}

export function normalizeDiscordEvent(triggerName: string, raw: any): MessagingTriggerPayload {
  const command = triggerName === "onSlashCommand" && typeof raw?.data?.name === "string"
    ? `/${raw.data.name}`
    : undefined;

  return {
    eventId: String(raw?.id ?? raw?.message_id ?? Date.now()),
    messageId: toOptionalString(raw?.message_id ?? raw?.id),
    channelId: toOptionalString(raw?.channel_id),
    userId: toOptionalString(raw?.author?.id ?? raw?.member?.user?.id ?? raw?.user?.id),
    text: typeof raw?.content === "string" ? raw.content : undefined,
    command,
    raw,
  };
}

export function createNoopWebhookTrigger(): PluginTriggerHooks {
  return {
    async setup() {},
    async teardown() {},
  };
}

function toOptionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}
