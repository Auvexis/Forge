import { AGENT_LIMITS } from "./agent-limits.ts";

const SECRET_KEY_PATTERN = /(api[_-]?key|authorization|credential|password|secret|token)/i;
const REDACTED = "[REDACTED]";

export function sanitizeAgentEventPayload(input: unknown): unknown {
  return sanitizeValue(input);
}

export function truncateAgentText(
  value: string,
  maxChars = AGENT_LIMITS.maxEventBodyChars,
): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}[truncated ${value.length - maxChars} chars]`;
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return truncateAgentText(value);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  const record = value as Record<string, unknown>;
  if (typeof record.delta === "string") {
    return { delta: truncateAgentText(record.delta) };
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? REDACTED : sanitizeValue(item),
    ]),
  );
}
