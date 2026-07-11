import AjvModule from "ajv";
import addFormatsModule from "ajv-formats";
import type { ErrorObject, ValidateFunction } from "ajv";
import type { JSONSchemaObject } from "@auvexis/fabric-sdk";

// ──────────── AJV Singleton ────────────
// A single AJV instance is created once and reused.
// We configure it to be strict about types but allow
// unknown `x-` extension keywords without failing.
const AjvCtor = AjvModule as unknown as { new(options?: Record<string, unknown>): InstanceType<any> };
const addFormats = addFormatsModule as unknown as (ajv: InstanceType<any>) => void;

const ajv = new AjvCtor({
  // Coerce strings to the declared type when possible (e.g. "42" → 42).
  // This is important because multipart form data arrives as strings.
  coerceTypes: true,
  // Remove any properties not declared in the schema before passing to the plugin.
  // This is a critical security measure.
  removeAdditional: true,
  // Provide human-readable error messages.
  allErrors: true,
  // Allow unknown keywords prefixed with "x-" (our Fabric UI extensions).
  // Without this, AJV would throw on "x-input-type", "x-label", etc.
  strict: false,
});

addFormats(ajv);

// ──────────── Schema Cache ────────────
// Compiled validators are cached per plugin+method key to avoid
// recompiling on every execution, which would be expensive.
const validatorCache = new Map<string, ValidateFunction>();

function getCacheKey(pluginId: string, methodName: string): string {
  return `${pluginId}::${methodName}`;
}

// ──────────── Typed Error ────────────

/**
 * Thrown when the params passed to a plugin method fail JSON Schema validation.
 * The route handler catches this specific error type to return HTTP 400 instead of 500.
 */
export class PluginValidationError extends Error {
  public readonly errors: string[];

  constructor(pluginId: string, methodName: string, errors: string[]) {
    super(
      `Validation failed for ${pluginId}.${methodName}:\n${errors.map((e) => `  - ${e}`).join("\n")}`
    );
    this.name = "PluginValidationError";
    this.errors = errors;
  }
}

// ──────────── Public API ────────────

/**
 * Returns a compiled, cached AJV validator for the given schema.
 * The schema is compiled only once per plugin/method combination.
 */
function getCompiledValidator(
  pluginId: string,
  methodName: string,
  schema: JSONSchemaObject,
) {
  const key = getCacheKey(pluginId, methodName);

  if (!validatorCache.has(key)) {
    const compiled = ajv.compile(schema);
    validatorCache.set(key, compiled);
  }

  return validatorCache.get(key)!;
}

/**
 * Validates `params` against the method's JSON Schema.
 *
 * - Mutates `params` in-place: removes unknown properties (`removeAdditional`).
 * - Throws `PluginValidationError` if validation fails.
 * - Is a no-op if the method has no `properties` defined (fully open schema).
 *
 * @param pluginId - Used for error messaging and cache keying.
 * @param methodName - Used for error messaging and cache keying.
 * @param schema - The `parameters` schema from the plugin manifest.
 * @param params - The raw params received from the request. Mutated in place.
 */
export function validateParams(
  pluginId: string,
  methodName: string,
  schema: JSONSchemaObject,
  params: Record<string, any>,
): void {
  // If the method schema has no properties defined, it accepts anything.
  // Skip validation to avoid false negatives on fully open schemas.
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return;
  }

  const validate = getCompiledValidator(pluginId, methodName, schema);
  const valid = validate(params);

  if (!valid && validate.errors) {
    const messages = validate.errors.map((err: ErrorObject) => {
      const field = err.instancePath ? err.instancePath.replace(/^\//, "") : "root";
      return `'${field}' ${err.message}`;
    });

    throw new PluginValidationError(pluginId, methodName, messages);
  }
}

/**
 * Clears the compiled schema cache for a specific plugin.
 * Should be called if a plugin is hot-reloaded.
 */
export function clearValidatorCache(pluginId?: string): void {
  if (pluginId) {
    for (const key of validatorCache.keys()) {
      if (key.startsWith(`${pluginId}::`)) {
        validatorCache.delete(key);
      }
    }
  } else {
    validatorCache.clear();
  }
}
