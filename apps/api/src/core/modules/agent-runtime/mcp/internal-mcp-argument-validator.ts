import { Ajv, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { AgentRuntimeError } from "../agent-errors.ts";
import { AGENT_LIMITS } from "../agent-limits.ts";

export class InternalMcpArgumentValidator {
  private readonly ajv = createAjv();
  private readonly validators = new Map<string, ValidateFunction>();

  validate(toolName: string, schema: Record<string, unknown>, arguments_: unknown): void {
    assertPayloadLimits(arguments_);
    const validator = this.validatorFor(toolName, schema);
    if (validator(arguments_)) return;

    throw new AgentRuntimeError(
      `Invalid arguments for MCP tool ${toolName}: ${this.ajv.errorsText(validator.errors)}`,
      "AGENT_TOOL_ARGUMENTS_INVALID",
      `Invalid arguments for tool ${toolName}`,
      400,
    );
  }

  private validatorFor(toolName: string, schema: Record<string, unknown>): ValidateFunction {
    const cached = this.validators.get(toolName);
    if (cached) return cached;
    const validator = this.ajv.compile(disallowUnknownRootArguments(schema));
    this.validators.set(toolName, validator);
    return validator;
  }
}

function createAjv(): Ajv {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    removeAdditional: false,
    coerceTypes: false,
    useDefaults: false,
  });
  (addFormats as unknown as (instance: Ajv) => void)(ajv);
  ajv.addFormat("base64", {
    type: "string",
    validate: (value: string) => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value),
  });
  return ajv;
}

function disallowUnknownRootArguments(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  if (schema.type !== "object") return schema;
  return {
    ...schema,
    additionalProperties: false,
  };
}

function assertPayloadLimits(value: unknown): void {
  let encoded: string;
  try {
    encoded = JSON.stringify(value);
  } catch {
    throw invalidPayload("Arguments must be JSON serializable");
  }
  if (Buffer.byteLength(encoded, "utf8") > AGENT_LIMITS.maxToolPayloadBytes) {
    throw invalidPayload("Arguments exceed the maximum payload size");
  }

  const stats = countJson(value);
  if (stats.depth > AGENT_LIMITS.maxJsonDepth) {
    throw invalidPayload("Arguments exceed the maximum JSON depth");
  }
  if (stats.keys > AGENT_LIMITS.maxJsonKeys) {
    throw invalidPayload("Arguments contain too many JSON keys");
  }
}

function countJson(value: unknown, depth = 0): { depth: number; keys: number } {
  if (!value || typeof value !== "object") return { depth, keys: 0 };
  if (Array.isArray(value)) {
    return value.reduce(
      (total, item) => {
        const child = countJson(item, depth + 1);
        return { depth: Math.max(total.depth, child.depth), keys: total.keys + child.keys };
      },
      { depth, keys: 0 },
    );
  }
  return Object.values(value as Record<string, unknown>).reduce<{ depth: number; keys: number }>(
    (total, item) => {
      const child = countJson(item, depth + 1);
      return { depth: Math.max(total.depth, child.depth), keys: total.keys + child.keys + 1 };
    },
    { depth, keys: 0 },
  );
}

function invalidPayload(detail: string): AgentRuntimeError {
  return new AgentRuntimeError(
    `Invalid MCP tool payload: ${detail}`,
    "AGENT_TOOL_ARGUMENTS_INVALID",
    "Invalid tool arguments",
    400,
  );
}
