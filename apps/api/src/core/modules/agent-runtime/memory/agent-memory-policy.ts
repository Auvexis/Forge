import { AgentRuntimeError } from "../agent-errors.ts";
import { AGENT_LIMITS } from "../agent-limits.ts";
import type { AgentMemoryScope, AiMemoryNodeConfig } from "../agent-types.ts";

const MEMORY_IDENTIFIER_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const SECRET_PATTERNS = [
  /\b(api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret)\b/i,
  /\bsk-(?:live|test|proj|ant|or)-[A-Za-z0-9_-]{8,}\b/i,
  /\b[A-Za-z0-9+/]{32,}={0,2}\b/,
];

export function buildMemoryNamespace(input: {
  scope: AgentMemoryScope;
  profileId: string;
  workflowId?: string;
  userId?: string;
  agentNodeId?: string;
}): string | null {
  assertIdentifier("profile id", input.profileId);

  switch (input.scope) {
    case "none":
    case "session":
      return null;
    case "profile":
      return `profile:${input.profileId}`;
    case "workflow":
      assertIdentifier("workflow id", input.workflowId);
      return `workflow:${input.profileId}:${input.workflowId}`;
    case "user":
      assertIdentifier("user id", input.userId);
      return `user:${input.profileId}:${input.userId}`;
  }
}

export function assertMemoryWriteAllowed(input: {
  memory: AiMemoryNodeConfig;
  value: unknown;
  namespace: string | null;
}): void {
  if (!input.memory.writeEnabled) {
    throw new AgentRuntimeError(
      "Memory node does not allow writes",
      "AGENT_MEMORY_WRITE_DISABLED",
      "Memory writes are disabled for this agent",
      400,
    );
  }

  if (!input.namespace || input.memory.scope === "none" || input.memory.scope === "session") {
    throw new AgentRuntimeError(
      "Memory scope does not support long-term memory writes",
      "AGENT_MEMORY_LONG_TERM_UNAVAILABLE",
      "This memory scope cannot write long-term memory",
      400,
    );
  }

  const serialized = serializeMemoryValue(input.value);
  const maxChars = Math.min(input.memory.maxMemoryChars, AGENT_LIMITS.maxMemoryChars);
  if (serialized.length > maxChars) {
    throw new AgentRuntimeError(
      `Memory size ${serialized.length} exceeds limit ${maxChars}`,
      "AGENT_MEMORY_TOO_LARGE",
      "Memory size exceeds the configured limit",
      400,
    );
  }

  if (containsObviousSecret(input.value)) {
    throw new AgentRuntimeError(
      "Memory value appears to contain a secret",
      "AGENT_MEMORY_SECRET_REJECTED",
      "Memory values cannot contain secrets",
      400,
    );
  }
}

function assertIdentifier(label: string, value: string | undefined): asserts value is string {
  if (!value || !MEMORY_IDENTIFIER_PATTERN.test(value)) {
    throw new AgentRuntimeError(
      `Invalid ${label}`,
      "AGENT_MEMORY_NAMESPACE_INVALID",
      `Invalid ${label}`,
      400,
    );
  }
}

function serializeMemoryValue(value: unknown): string {
  try {
    return typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    throw new AgentRuntimeError(
      "Memory value must be JSON serializable",
      "AGENT_MEMORY_VALUE_INVALID",
      "Memory value must be JSON serializable",
      400,
    );
  }
}

function containsObviousSecret(value: unknown): boolean {
  return inspectForSecrets(value, 0);
}

function inspectForSecrets(value: unknown, depth: number): boolean {
  if (depth > AGENT_LIMITS.maxJsonDepth) return false;

  if (typeof value === "string") {
    return SECRET_PATTERNS.some((pattern) => pattern.test(value));
  }

  if (!value || typeof value !== "object") return false;

  if (Array.isArray(value)) {
    return value.some((item) => inspectForSecrets(item, depth + 1));
  }

  return Object.entries(value as Record<string, unknown>).some(([key, child]) => (
    SECRET_PATTERNS.some((pattern) => pattern.test(key)) || inspectForSecrets(child, depth + 1)
  ));
}
