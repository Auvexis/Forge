import type {
  PluginBlueprintOutputType,
  PluginBlueprintResponseMapping,
} from "./plugin-blueprint-types.ts";

export interface PluginCreatorResponseLike {
  status: number | null;
  headers: Record<string, string>;
  body: unknown;
}

const safeSegmentPattern = /^[a-zA-Z0-9_-]+$/;
const forbiddenSegments = new Set(["__proto__", "constructor", "prototype"]);

export function mapPluginCreatorResponse(
  response: PluginCreatorResponseLike,
  mappings: PluginBlueprintResponseMapping[],
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const value = getPathValue(response, mapping.path);
    if (value === undefined && mapping.required) {
      throw new Error(`Required response path not found: ${mapping.path}`);
    }
    output[mapping.outputName] = value === undefined ? null : value;
  }

  return output;
}

export function inferPluginCreatorValueType(value: unknown): PluginBlueprintOutputType {
  if (Array.isArray(value)) return "array";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "object";
}

function getPathValue(response: PluginCreatorResponseLike, path: string): unknown {
  const segments = path.split(".");
  if (segments.length === 0 || segments.some(isUnsafeSegment)) {
    throw new Error(`Unsafe response path: ${path}`);
  }

  let current: unknown = response;
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
