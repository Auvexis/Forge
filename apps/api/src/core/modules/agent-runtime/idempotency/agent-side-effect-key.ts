import { createHash } from "node:crypto";

export function createAgentSideEffectKey(input: {
  profileId: string;
  runId: string;
  actionId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}): { idempotencyKey: string; argumentsHash: string } {
  const argumentsHash = hash(stableStringify(input.arguments));
  return {
    argumentsHash,
    idempotencyKey: hash(stableStringify({
      profileId: input.profileId,
      runId: input.runId,
      actionId: input.actionId,
      toolName: input.toolName,
      argumentsHash,
    })),
  };
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Buffer.isBuffer(value)) {
    return {
      type: "Buffer",
      size: value.byteLength,
      sha256: createHash("sha256").update(value).digest("hex"),
    };
  }
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, sortJsonValue(item)]),
  );
}
