import { z, ZodError, type ZodType } from "zod";
import { AgentRuntimeError } from "./agent-errors.ts";
import { AGENT_LIMITS } from "./agent-limits.ts";
import type {
  AiAgentNodeConfig,
  AiMemoryNodeConfig,
  AiModelNodeConfig,
  AiToolNodeConfig,
  ChatTriggerConfig,
} from "./agent-types.ts";

const sideEffectSchema = z.enum([
  "read",
  "write",
  "delete",
  "external-message",
  "external-payment",
  "filesystem",
]);

const jsonObjectSchema = z.record(z.string(), z.unknown());

const aiAgentSchema = z
  .object({
    type: z.literal("ai-agent"),
    name: z.string().trim().min(1).max(120),
    prompt: z.string().trim().min(1).max(AGENT_LIMITS.maxPromptChars),
    maxIterations: z.number().int().min(1).max(AGENT_LIMITS.maxIterations),
    maxToolCalls: z.number().int().min(0).max(AGENT_LIMITS.maxToolCalls),
    timeoutMs: z.number().int().min(1000).max(AGENT_LIMITS.maxAgentTimeoutMs),
    requireApprovalForSideEffects: z.array(sideEffectSchema).max(sideEffectSchema.options.length),
    outputMode: z.enum(["text", "json"]),
    outputSchema: jsonObjectSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.outputSchema) {
      validateJsonPolicy(value.outputSchema, ["outputSchema"], context);
    }
  });

const aiModelSchema = z
  .object({
    type: z.literal("ai-model"),
    name: z.string().trim().min(1).max(120),
    pluginId: z.string().trim().min(1).max(120),
    adapter: z.enum(["openai-compatible"]),
    model: z.string().trim().min(1).max(160),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().int().min(1).max(200000).optional(),
    credentialId: z.string().trim().min(1).max(160).optional(),
    baseUrl: z.string().url().optional(),
  })
  .strict();

const aiMemorySchema = z
  .object({
    type: z.literal("ai-memory"),
    name: z.string().trim().min(1).max(120),
    scope: z.enum(["none", "session", "workflow", "profile", "user"]),
    readEnabled: z.boolean(),
    writeEnabled: z.boolean(),
    maxRetrievedMemories: z.number().int().min(0).max(AGENT_LIMITS.maxRetrievedMemories),
    maxMemoryChars: z.number().int().min(1).max(AGENT_LIMITS.maxMemoryChars),
  })
  .strict();

const aiToolSchema = z
  .object({
    type: z.literal("ai-tool"),
    name: z.string().trim().min(1).max(120),
    pluginId: z.string().trim().min(1).max(120),
    methodId: z.string().trim().min(1).max(120),
    descriptionOverride: z.string().trim().min(1).max(1000).optional(),
    timeoutMs: z.number().int().min(1000).max(AGENT_LIMITS.maxToolTimeoutMs),
    requiresApproval: z.boolean(),
    sideEffect: sideEffectSchema,
    inputDefaults: jsonObjectSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.inputDefaults) {
      validateJsonPolicy(value.inputDefaults, ["inputDefaults"], context);
    }
  });

const chatTriggerSchema = z
  .object({
    type: z.literal("chat"),
    chatSlug: z
      .string()
      .trim()
      .min(3)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1).max(120),
    authMode: z.enum(["public", "signed", "profile"]),
    sessionMode: z.enum(["new-session-per-user", "resume-by-session-id"]),
    allowedOrigins: z.array(z.string().url()).max(20).optional(),
    rateLimitPerMinute: z.number().int().min(1).max(AGENT_LIMITS.chatRateLimitPerMinute),
  })
  .strict();

export function validateAiAgentConfig(input: unknown): AiAgentNodeConfig {
  return parseConfig(aiAgentSchema, input, "Invalid AI agent config");
}

export function validateAiModelConfig(input: unknown): AiModelNodeConfig {
  return parseConfig(aiModelSchema, normalizeLegacyAiModel(input), "Invalid AI model config");
}

export function validateAiMemoryConfig(input: unknown): AiMemoryNodeConfig {
  return parseConfig(aiMemorySchema, input, "Invalid AI memory config");
}

export function validateAiToolConfig(input: unknown): AiToolNodeConfig {
  return parseConfig(aiToolSchema, input, "Invalid AI tool config");
}

export function validateChatTriggerConfig(input: unknown): ChatTriggerConfig {
  return parseConfig(chatTriggerSchema, input, "Invalid chat trigger config");
}

function normalizeLegacyAiModel(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }

  const value = input as Record<string, unknown>;
  if (value.type !== "ai-model") {
    return input;
  }
  if (typeof value.pluginId === "string" || typeof value.adapter === "string") {
    return input;
  }
  if (value.provider === "openai" || value.provider === "openrouter") {
    const { provider, ...config } = value;
    return {
      ...config,
      pluginId: provider,
      adapter: "openai-compatible",
      ...(provider === "openrouter" && !config.baseUrl
        ? { baseUrl: "https://openrouter.ai/api/v1" }
        : {}),
    };
  }

  return input;
}

function parseConfig<T>(schema: ZodType<T>, input: unknown, message: string): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AgentRuntimeError(
        `${message}: ${formatZodError(error)}`,
        "AGENT_CONFIG_INVALID",
      );
    }
    throw error;
  }
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "root"} ${issue.message}`)
    .join("; ");
}

function validateJsonPolicy(
  value: unknown,
  path: Array<string | number>,
  context: z.RefinementCtx,
): void {
  const stats = inspectJson(value);
  if (stats.depth > AGENT_LIMITS.maxJsonDepth) {
    context.addIssue({
      code: "custom",
      path,
      message: `exceeds max JSON depth ${AGENT_LIMITS.maxJsonDepth}`,
    });
  }
  if (stats.keys > AGENT_LIMITS.maxJsonKeys) {
    context.addIssue({
      code: "custom",
      path,
      message: `exceeds max JSON keys ${AGENT_LIMITS.maxJsonKeys}`,
    });
  }
}

function inspectJson(value: unknown, depth = 0): { depth: number; keys: number } {
  if (!value || typeof value !== "object") {
    return { depth, keys: 0 };
  }

  if (Array.isArray(value)) {
    return value.reduce(
      (stats, item) => {
        const child = inspectJson(item, depth + 1);
        return {
          depth: Math.max(stats.depth, child.depth),
          keys: stats.keys + child.keys,
        };
      },
      { depth, keys: 0 },
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  return entries.reduce(
    (stats, [, item]) => {
      const child = inspectJson(item, depth + 1);
      return {
        depth: Math.max(stats.depth, child.depth),
        keys: stats.keys + 1 + child.keys,
      };
    },
    { depth, keys: 0 },
  );
}
