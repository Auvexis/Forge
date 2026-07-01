export interface AgentLoopHistoryItem {
  type: "tool_result" | "tool_error";
  toolName: string;
  result?: unknown;
  error?: string;
}

const LARGE_STRING_CHARS = 1200;
const MAX_ARRAY_ITEMS = 8;
const MAX_OBJECT_KEYS = 24;

export function sanitizeAgentToolValue(value: unknown): unknown {
  if (Buffer.isBuffer(value)) return { type: "buffer", bytes: value.byteLength };
  if (isBlob(value)) return { type: "blob", bytes: value.size };
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map(sanitizeAgentToolValue);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, MAX_OBJECT_KEYS)
      .map(([key, item]) => [key, sanitizeAgentToolValue(item)]),
  );
}

export function serializeAgentLoopHistory(items: AgentLoopHistoryItem[]): string {
  return items.map((item) => {
    if (item.type === "tool_error") {
      return `TOOL ${item.toolName} ERROR ${item.error ?? "Unknown error"}`;
    }
    return `TOOL ${item.toolName} RESULT ${JSON.stringify(sanitizeAgentToolValue(item.result))}`;
  }).join("\n");
}

function sanitizeString(value: string): unknown {
  if (isDataUrlBase64(value) || isLikelyBase64(value)) {
    return { type: "base64", chars: value.length };
  }
  if (value.length > LARGE_STRING_CHARS) {
    return { type: "large-string", chars: value.length };
  }
  return value;
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isDataUrlBase64(value: string): boolean {
  return /^data:[^;]+;base64,[a-z0-9+/=\s]+$/i.test(value) && value.length > LARGE_STRING_CHARS;
}

function isLikelyBase64(value: string): boolean {
  if (value.length <= LARGE_STRING_CHARS) return false;
  if (value.length % 4 !== 0) return false;
  return /^[a-z0-9+/=\s]+$/i.test(value);
}
