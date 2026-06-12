import type { PluginTriggerHooks } from "@auvexis/sailor-sdk";

interface MessagingTriggerPayload {
  eventId: string;
  messageId?: string;
  channelId?: string;
  userId?: string;
  text?: string;
  command?: string;
  isBot?: boolean;
  raw: unknown;
}

export function normalizeSlackEvent(triggerName: string, raw: any): MessagingTriggerPayload {
  const event = raw?.event ?? raw;
  const command = triggerName === "onSlashCommand" && typeof raw?.command === "string"
    ? raw.command
    : undefined;

  return {
    eventId: String(raw?.event_id ?? event?.event_ts ?? event?.ts ?? Date.now()),
    messageId: toOptionalString(event?.ts),
    channelId: toOptionalString(event?.channel),
    userId: toOptionalString(event?.user),
    text: typeof event?.text === "string" ? event.text : undefined,
    command,
    isBot: isSlackBotEvent(event),
    raw,
  };
}

function isSlackBotEvent(event: any): boolean | undefined {
  return event?.subtype === "bot_message" || event?.bot_id || event?.bot_profile
    ? true
    : undefined;
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
