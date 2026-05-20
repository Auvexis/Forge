import type { PluginTriggerHooks, TriggerRegistrationContext } from "@auvexis/sailor-sdk";

interface MessagingTriggerPayload {
  eventId: string;
  messageId?: string;
  channelId?: string;
  guildId?: string;
  userId?: string;
  text?: string;
  command?: string;
  emoji?: string;
  authorIsBot?: boolean;
  raw: unknown;
}

interface GatewaySession {
  socket: WebSocket;
  heartbeat?: ReturnType<typeof setInterval>;
}

const DISCORD_API_BASE = "https://discord.com/api/v10";
const MESSAGE_INTENTS = 1 << 9 | 1 << 12 | 1 << 15;
const REACTION_INTENTS = 1 << 10 | 1 << 13;
const INTERACTION_INTENTS = 1;
const activeSessions = new Map<string, GatewaySession>();

export function normalizeDiscordEvent(triggerName: string, raw: any): MessagingTriggerPayload {
  const command = triggerName === "onSlashCommand" && typeof raw?.data?.name === "string"
    ? `/${raw.data.name}`
    : undefined;
  const emoji = raw?.emoji?.name ?? raw?.emoji?.id;

  return {
    eventId: String(raw?.id ?? raw?.message_id ?? `${raw?.channel_id ?? "discord"}:${raw?.user_id ?? Date.now()}:${emoji ?? ""}`),
    messageId: toOptionalString(raw?.message_id ?? raw?.id),
    channelId: toOptionalString(raw?.channel_id),
    guildId: toOptionalString(raw?.guild_id),
    userId: toOptionalString(raw?.author?.id ?? raw?.member?.user?.id ?? raw?.user?.id ?? raw?.user_id),
    text: typeof raw?.content === "string" ? raw.content : undefined,
    command,
    emoji: toOptionalString(emoji),
    authorIsBot: typeof raw?.author?.bot === "boolean" ? raw.author.bot : undefined,
    raw,
  };
}

export function createDiscordGatewayTrigger(triggerName: "onMessage" | "onSlashCommand" | "onReaction"): PluginTriggerHooks {
  return {
    async setup(ctx) {
      const token = ctx.credentials.bot_token?.trim();
      if (!token) {
        throw new Error("Discord bot token is not configured. Please set credentials before publishing.");
      }

      const key = sessionKey(ctx, triggerName);
      await closeSession(key);

      const gatewayUrl = await fetchGatewayUrl(token);
      const socket = new WebSocket(`${gatewayUrl}/?v=10&encoding=json`);
      const session: GatewaySession = { socket };
      activeSessions.set(key, session);

      socket.onmessage = (event) => {
        void handleGatewayMessage(session, triggerName, token, ctx, event.data);
      };
      socket.onerror = (event) => {
        console.error(`[SAILOR | DISCORD TRIGGER]: Gateway error for ${key}`, event);
      };
      socket.onclose = () => {
        if (session.heartbeat) clearInterval(session.heartbeat);
        if (activeSessions.get(key) === session) activeSessions.delete(key);
      };
    },

    async teardown(ctx) {
      await closeSession(sessionKey(ctx, triggerName));
    },
  };
}

export function createNoopWebhookTrigger(): PluginTriggerHooks {
  return createDiscordGatewayTrigger("onMessage");
}

async function fetchGatewayUrl(token: string): Promise<string> {
  const response = await fetch(`${DISCORD_API_BASE}/gateway/bot`, {
    headers: { Authorization: `Bot ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord gateway lookup failed: ${text || response.statusText}`);
  }

  const data = await response.json() as { url?: string };
  if (!data.url) throw new Error("Discord gateway lookup did not return a websocket URL.");
  return data.url;
}

async function handleGatewayMessage(
  session: GatewaySession,
  triggerName: "onMessage" | "onSlashCommand" | "onReaction",
  token: string,
  ctx: TriggerRegistrationContext,
  data: unknown,
) {
  const packet = JSON.parse(String(data)) as { op: number; t?: string; d?: any };

  if (packet.op === 10) {
    const interval = Number(packet.d?.heartbeat_interval);
    if (Number.isFinite(interval) && interval > 0) {
      session.heartbeat = setInterval(() => {
        sendGatewayPayload(session.socket, { op: 1, d: null });
      }, interval);
    }
    sendGatewayPayload(session.socket, {
      op: 2,
      d: {
        token,
        intents: intentsForTrigger(triggerName),
        properties: {
          os: "sailor",
          browser: "sailor",
          device: "sailor",
        },
      },
    });
    return;
  }

  if (packet.op !== 0 || !eventMatchesTrigger(triggerName, packet.t, packet.d)) return;

  const normalized = normalizeDiscordEvent(triggerName, packet.d);
  await forwardEvent(ctx.webhookUrl, normalized);
}

function eventMatchesTrigger(
  triggerName: "onMessage" | "onSlashCommand" | "onReaction",
  eventName: string | undefined,
  payload: any,
): boolean {
  if (triggerName === "onMessage") return eventName === "MESSAGE_CREATE";
  if (triggerName === "onReaction") return eventName === "MESSAGE_REACTION_ADD";
  if (triggerName === "onSlashCommand") {
    return eventName === "INTERACTION_CREATE" && Number(payload?.type) === 2;
  }
  return false;
}

function intentsForTrigger(triggerName: "onMessage" | "onSlashCommand" | "onReaction"): number {
  if (triggerName === "onMessage") return MESSAGE_INTENTS;
  if (triggerName === "onReaction") return REACTION_INTENTS;
  return INTERACTION_INTENTS;
}

async function forwardEvent(webhookUrl: string, payload: MessagingTriggerPayload): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(
      `[SAILOR | DISCORD TRIGGER]: Failed to forward event to Sailor (${response.status}): ${text || response.statusText}`,
    );
  }
}

function sendGatewayPayload(socket: WebSocket, payload: unknown) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

async function closeSession(key: string): Promise<void> {
  const session = activeSessions.get(key);
  if (!session) return;
  activeSessions.delete(key);
  if (session.heartbeat) clearInterval(session.heartbeat);
  session.socket.close();
}

function sessionKey(ctx: TriggerRegistrationContext, triggerName: string): string {
  return `${ctx.workflowId}:${triggerName}:${ctx.webhookUrl}`;
}

function toOptionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}
