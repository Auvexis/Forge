import type { JSONSchemaProperty, PluginManifestResponseSchema } from "../types/plugin";

export const getSchemaProperties = (
  schema: PluginManifestResponseSchema,
): [string, JSONSchemaProperty][] | null => {
  const properties =
    schema.type === "array" ? schema.items?.properties : schema.properties;

  if (!properties) return null;

  return Object.entries(properties) as [string, JSONSchemaProperty][];
};

/**
 * Returns the human-readable label for a schema property.
 * Prefers x-label (new standard), falls back to legacy label field.
 */
export const getPropertyLabel = (key: string, prop: JSONSchemaProperty & { label?: string }): string => {
  return prop["x-label"] ?? prop.label ?? key;
};

/**
 * Returns the display strategy for a response schema.
 * Prefers x-forge-display (new), falls back to x-type (legacy).
 */
export const getDisplayType = (schema: PluginManifestResponseSchema): string => {
  return schema["x-forge-display"] ?? (schema as any)["x-type"] ?? "generic";
};
