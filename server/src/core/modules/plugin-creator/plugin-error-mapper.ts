import type { PluginBlueprintErrorMapping } from "./plugin-blueprint-types.ts";
import type { PluginCreatorResponseLike } from "./plugin-response-mapper.ts";

export interface PluginCreatorMappedError {
  code: string;
  message: string;
  status: number | null;
  details: unknown;
}

const safeSegmentPattern = /^[a-zA-Z0-9_-]+$/;
const forbiddenSegments = new Set(["__proto__", "constructor", "prototype"]);

export function mapPluginCreatorError(
  response: PluginCreatorResponseLike,
  mappings: PluginBlueprintErrorMapping[],
): PluginCreatorMappedError | null {
  for (const mapping of mappings) {
    if (!conditionMatches(response, mapping)) {
      continue;
    }

    return {
      code: mapping.code,
      message: resolveMessage(response, mapping),
      status: response.status,
      details: response.body,
    };
  }

  return null;
}

function conditionMatches(
  response: PluginCreatorResponseLike,
  mapping: PluginBlueprintErrorMapping,
): boolean {
  const condition = mapping.condition;
  const actual = condition.source === "status"
    ? response.status
    : getPathValue(response.body, condition.path ?? "");

  switch (condition.operator) {
    case "equals":
      return actual === condition.value;
    case "notEquals":
      return actual !== condition.value;
    case "greaterThan":
      return Number(actual) > Number(condition.value);
    case "greaterThanOrEquals":
      return Number(actual) >= Number(condition.value);
    case "lessThan":
      return Number(actual) < Number(condition.value);
    case "lessThanOrEquals":
      return Number(actual) <= Number(condition.value);
    case "exists":
      return actual !== undefined && actual !== null;
    case "notExists":
      return actual === undefined || actual === null;
  }
}

function resolveMessage(
  response: PluginCreatorResponseLike,
  mapping: PluginBlueprintErrorMapping,
): string {
  if (mapping.message.type === "static") {
    return mapping.message.value;
  }

  const value = getPathValue(response.body, mapping.message.path);
  if (value === undefined || value === null || value === "") {
    return mapping.message.fallback ?? mapping.code;
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

function getPathValue(root: unknown, path: string): unknown {
  const segments = path.split(".");
  if (segments.length === 0 || segments.some(isUnsafeSegment)) {
    throw new Error(`Unsafe error mapping path: ${path}`);
  }

  let current = root;
  for (const segment of segments) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

function isUnsafeSegment(segment: string): boolean {
  return !safeSegmentPattern.test(segment) || forbiddenSegments.has(segment);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
