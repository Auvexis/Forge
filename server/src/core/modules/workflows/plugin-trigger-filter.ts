export type PluginTriggerFilterResult =
  | { accepted: true }
  | { accepted: false; reason: string };

const exactFilterKeys = [
  "channelId",
  "guildId",
  "userId",
  "resourceId",
  "resourceType",
  "eventAction",
  "messageId",
  "emoji",
  "commandName",
] as const;

export function evaluatePluginTriggerFilters(
  params: Record<string, unknown>,
  payload: Record<string, unknown>,
): PluginTriggerFilterResult {
  if (isTruthyFilter(params.ignoreBots) && isBotPayload(payload)) {
    return { accepted: false, reason: "bot event ignored" };
  }

  for (const key of exactFilterKeys) {
    const expected = normalizeFilterValue(params[key]);
    if (!expected) continue;

    const actual = normalizePayloadValue(payload[key] ?? payloadAlias(key, payload));
    if (actual !== expected) {
      return { accepted: false, reason: `${key} did not match` };
    }
  }

  const text = normalizePayloadValue(payload.text ?? payload.message ?? payload.content);
  const textContains = normalizeFilterValue(params.textContains ?? params.messageContains);
  if (textContains && !text.toLowerCase().includes(textContains.toLowerCase())) {
    return { accepted: false, reason: "textContains did not match" };
  }

  const textRegex = normalizeFilterValue(params.textRegex ?? params.messageRegex);
  if (textRegex) {
    try {
      if (!new RegExp(textRegex).test(text)) {
        return { accepted: false, reason: "textRegex did not match" };
      }
    } catch {
      return { accepted: false, reason: "textRegex is invalid" };
    }
  }

  return { accepted: true };
}

function normalizeFilterValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizePayloadValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

function isTruthyFilter(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return false;
  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

function isBotPayload(payload: Record<string, unknown>): boolean {
  return Boolean(
      payload.bot ||
      payload.isBot ||
      payload.authorBot ||
      payload.authorIsBot ||
      payload.userIsBot ||
      (payload.author && typeof payload.author === "object" && "bot" in payload.author && (payload.author as any).bot),
  );
}

function payloadAlias(key: string, payload: Record<string, unknown>): unknown {
  if (key === "eventAction") return payload.action ?? payload.operation;
  if (key === "commandName") return payload.command;
  return undefined;
}
