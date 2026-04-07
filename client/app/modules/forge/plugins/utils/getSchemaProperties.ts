import type { PluginManifestResponseSchema } from "../types/plugin";

export const getSchemaProperties = (schema: PluginManifestResponseSchema) => {
  const properties =
    schema.type === "array" ? schema.items?.properties : schema.properties;

  if (!properties) return null;

  return Object.entries(properties);
};
