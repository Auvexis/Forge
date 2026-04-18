/**
 * schemaResolver.ts
 *
 * Recursively flattens a JSON Schema response schema into a list of
 * typed, path-annotated variable paths that can be injected into
 * workflow node parameters.
 */

export interface SchemaPath {
  /** Full template variable path, e.g. "steps.node1.output.fileName" */
  path: string;
  /** Human-readable label, e.g. "File Name" */
  label: string;
  /** JSON Schema type of the leaf value */
  type: string;
  /** Display name of the node that produces this value */
  sourceNodeName: string;
}

function walkProperties(
  properties: Record<string, any>,
  prefix: string,
  labelPrefix: string,
  nodeId: string,
  nodeName: string,
  depth = 0,
): SchemaPath[] {
  if (depth > 5) return [];

  const paths: SchemaPath[] = [];

  for (const [key, prop] of Object.entries(properties)) {
    const propLabel: string = prop["x-label"] ?? prop.label ?? key;
    const fullLabel = labelPrefix ? `${labelPrefix} → ${propLabel}` : propLabel;
    const fullPath = `${prefix}.${key}`;

    if (prop.type === "object" && prop.properties) {
      paths.push(
        ...walkProperties(
          prop.properties,
          fullPath,
          fullLabel,
          nodeId,
          nodeName,
          depth + 1,
        ),
      );
    } else if (
      prop.type === "array" &&
      prop.items?.type === "object" &&
      prop.items.properties
    ) {
      paths.push(
        ...walkProperties(
          prop.items.properties,
          `${fullPath}[0]`,
          `${fullLabel}[0]`,
          nodeId,
          nodeName,
          depth + 1,
        ),
      );
    } else {
      paths.push({
        path: fullPath,
        label: fullLabel,
        type: prop.type ?? "any",
        sourceNodeName: nodeName,
      });
    }
  }

  return paths;
}

export function resolveSchemaTree(
  nodeId: string,
  nodeName: string,
  schema: any,
): SchemaPath[] {
  if (!schema) return [];

  const prefix = `steps.${nodeId}.output`;

  if (schema.type === "array" && schema.items?.properties) {
    return walkProperties(
      schema.items.properties,
      `${prefix}[0]`,
      "",
      nodeId,
      nodeName,
    );
  }

  if (schema.type === "object" && schema.properties) {
    return walkProperties(schema.properties, prefix, "", nodeId, nodeName);
  }

  return [
    {
      path: prefix,
      label: "Output",
      type: schema.type ?? "any",
      sourceNodeName: nodeName,
    },
  ];
}

export function resolveTriggerPaths(triggerSchema?: Record<string, any>): SchemaPath[] {
  if (!triggerSchema) return [];

  return Object.keys(triggerSchema).map((fieldName) => ({
    path: `trigger.${fieldName}`,
    label: fieldName,
    type: triggerSchema[fieldName]?.type ?? "string",
    sourceNodeName: "Trigger",
  }));
}
