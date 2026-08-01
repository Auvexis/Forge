import { AgentRuntimeError } from "./agent-errors.ts";
import type { AgentModelMessage } from "./model-adapters/agent-model-adapter.ts";
import type { AgentModelCapabilities } from "./model-adapters/agent-model-capabilities.ts";
import { Ajv } from "ajv";

export interface AgentRuntimeModel {
  invokeJson<T extends object>(input: {
    messages: AgentModelMessage[];
    schema: Record<string, any>;
    signal?: AbortSignal;
  }): Promise<T>;
  generateFinalResponse(input: {
    messages: AgentModelMessage[];
    signal?: AbortSignal;
  }): Promise<string>;
}

export function toAgentRuntimeModel(model: unknown): AgentRuntimeModel {
  const candidate = model as {
    invoke?: (
      messages: AgentModelMessage[],
      options?: { signal?: AbortSignal },
    ) => Promise<{ content?: unknown } | string>;
    invokeJson?: <T extends object>(
      input: { messages: AgentModelMessage[] },
      schema?: Record<string, any>,
      options?: { signal?: AbortSignal },
    ) => Promise<T>;
    generateFinalResponse?: (
      input: { messages: AgentModelMessage[] },
      options?: { signal?: AbortSignal },
    ) => Promise<string>;
    capabilities?: AgentModelCapabilities;
  };

  const supportsStructuredOutput =
    candidate.capabilities?.structuredOutput !== "text" &&
    typeof candidate.invokeJson === "function";
  const supportsTextFallback = typeof candidate.invoke === "function";
  if (!supportsStructuredOutput && !supportsTextFallback) {
    throw new AgentRuntimeError(
      "Agent model does not support structured decisions",
      "AGENT_MODEL_JSON_UNSUPPORTED",
      "Agent model cannot produce structured tool decisions",
      500,
    );
  }

  return {
    invokeJson: async <T extends object>(input: {
      messages: AgentModelMessage[];
      schema: Record<string, any>;
      signal?: AbortSignal;
    }) => {
      if (supportsStructuredOutput) {
        return candidate.invokeJson!<T>(
          { messages: input.messages },
          input.schema,
          { signal: input.signal },
        );
      }
      const response = await candidate.invoke!(
        withJsonFallbackInstruction(input.messages, input.schema),
        { signal: input.signal },
      );
      const content = typeof response === "string" ? response : response.content;
      return parseAndValidateFallbackJson<T>(content, input.schema);
    },
    generateFinalResponse: async (input) => {
      if (typeof candidate.generateFinalResponse === "function") {
        return candidate.generateFinalResponse(
          { messages: input.messages },
          { signal: input.signal },
        );
      }
      if (typeof candidate.invoke === "function") {
        const response = await candidate.invoke(input.messages, { signal: input.signal });
        if (typeof response === "string") return response;
        return typeof response?.content === "string" ? response.content : "";
      }
      throw new AgentRuntimeError(
        "Agent model does not support final responses",
        "AGENT_MODEL_FINAL_UNSUPPORTED",
        "Agent model cannot generate a final response",
        500,
      );
    },
  };
}

function withJsonFallbackInstruction(
  messages: AgentModelMessage[],
  schema: Record<string, any>,
): AgentModelMessage[] {
  return [
    {
      role: "system",
      content: [
        "Return exactly one JSON object and no prose or markdown.",
        `The JSON must satisfy this schema: ${JSON.stringify(schema)}`,
      ].join("\n"),
    },
    ...messages,
  ];
}

function parseAndValidateFallbackJson<T extends object>(
  content: unknown,
  schema: Record<string, any>,
): T {
  if (typeof content !== "string" || content.length > 64_000) {
    throw invalidFallbackJson();
  }
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    throw invalidFallbackJson();
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected object");
    }
    const ajv = new Ajv({ allErrors: true, strict: false });
    ajv.addFormat("base64", true);
    const validate = ajv.compile(schema);
    if (!validate(parsed)) throw new Error("Schema mismatch");
    return parsed as T;
  } catch {
    throw invalidFallbackJson();
  }
}

function invalidFallbackJson(): AgentRuntimeError {
  return new AgentRuntimeError(
    "Text fallback returned invalid structured output",
    "AGENT_MODEL_JSON_INVALID",
    "Model returned invalid JSON",
    502,
  );
}

export function withAgentModelTimeout(
  model: AgentRuntimeModel,
  timeoutMs: number,
  upstream?: AbortSignal,
): AgentRuntimeModel {
  return {
    invokeJson: async <T extends object>(input: {
      messages: AgentModelMessage[];
      schema: Record<string, any>;
      signal?: AbortSignal;
    }) => await withModelDeadline(
      (signal) => model.invokeJson<T>({ ...input, signal }),
      timeoutMs,
      input.signal ?? upstream,
    ),
    generateFinalResponse: async (input) => await withModelDeadline(
      (signal) => model.generateFinalResponse({ ...input, signal }),
      timeoutMs,
      input.signal ?? upstream,
    ),
  };
}

async function withModelDeadline<T>(
  invoke: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  upstream?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const onAbort = () => controller.abort(upstream?.reason);
  upstream?.addEventListener("abort", onAbort, { once: true });
  if (upstream?.aborted) onAbort();
  const timeoutError = new AgentRuntimeError(
    `Agent model timed out after ${timeoutMs}ms`,
    "AGENT_MODEL_TIMEOUT",
    "Agent model response timed out",
    504,
  );
  let timeout: NodeJS.Timeout | undefined;
  const operation = invoke(controller.signal);
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort(timeoutError);
          reject(timeoutError);
        }, timeoutMs);
        timeout.unref?.();
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    upstream?.removeEventListener("abort", onAbort);
    operation.catch(() => undefined);
  }
}
