/**
 * schemaResolver.ts
 *
 * Recursively flattens a JSON Schema response schema into a list of
 * typed, path-annotated variable paths that can be injected into
 * workflow node parameters.
 *
 * Examples:
 *   steps.node1.output.id             → "ID" (string)
 *   steps.node1.output[0].title       → "Title" (string, from array)
 *   steps.node1.output.download.fileName → "Download → File Name" (string)
 */

export interface SchemaPath {
  /** Full template variable path, e.g. "steps.node1.output.fileName" */
  path: string
  /** Human-readable label, e.g. "File Name" */
  label: string
  /** JSON Schema type of the leaf value */
  type: string
  /** Display name of the node that produces this value */
  sourceNodeName: string
  /** The actual live value if the node has already executed */
  value?: any
}

/**
 * Minimal representation of a single JSON Schema property object.
 * Covers all fields accessed during schema traversal.
 */
interface JsonSchemaProp {
  'x-label'?: string
  label?: string
  type?: string
  properties?: Record<string, JsonSchemaProp>
  items?: {
    type?: string
    properties?: Record<string, JsonSchemaProp>
  }
}

/**
 * Recursively walks a JSON Schema properties map and emits one
 * `SchemaPath` entry per leaf (non-object, non-array-of-object) field.
 */
function walkProperties(
  properties: Record<string, JsonSchemaProp>,
  prefix: string,
  labelPrefix: string,
  nodeId: string,
  nodeName: string,
  depth = 0,
): SchemaPath[] {
  if (depth > 5) return []

  const paths: SchemaPath[] = []

  for (const [key, prop] of Object.entries(properties)) {
    const propLabel: string = prop['x-label'] ?? prop.label ?? key
    const fullLabel = labelPrefix ? `${labelPrefix} → ${propLabel}` : propLabel
    const fullPath = `${prefix}.${key}`

    if (prop.type === 'object' && prop.properties) {
      paths.push(
        ...walkProperties(prop.properties, fullPath, fullLabel, nodeId, nodeName, depth + 1),
      )
    } else if (prop.type === 'array' && prop.items?.type === 'object' && prop.items.properties) {
      paths.push(
        ...walkProperties(
          prop.items.properties,
          `${fullPath}[0]`,
          `${fullLabel}[0]`,
          nodeId,
          nodeName,
          depth + 1,
        ),
      )
    } else {
      paths.push({
        path: fullPath,
        label: fullLabel,
        type: prop.type ?? 'any',
        sourceNodeName: nodeName,
      })
    }
  }

  return paths
}

/**
 * Resolve all injectable variable paths from a plugin method's responseSchema.
 */
export function resolveSchemaTree(
  nodeId: string,
  nodeName: string,
  schema: JsonSchemaProp,
): SchemaPath[] {
  if (!schema) return []

  const prefix = `steps.${nodeId}.output`

  if (schema.type === 'array' && schema.items?.properties) {
    return walkProperties(schema.items.properties, `${prefix}[0]`, '', nodeId, nodeName)
  }

  if (schema.type === 'object' && schema.properties) {
    return walkProperties(schema.properties, prefix, '', nodeId, nodeName)
  }

  return [
    {
      path: prefix,
      label: 'Output',
      type: schema.type ?? 'any',
      sourceNodeName: nodeName,
    },
  ]
}

/**
 * Resolve all trigger variable paths from the trigger's manual input schema.
 * Returns an empty array if no manual schema is defined.
 */
export function resolveTriggerPaths(
  triggerSchema?: Record<string, { type?: string }>,
): SchemaPath[] {
  if (!triggerSchema) return []

  return Object.keys(triggerSchema).map((fieldName) => ({
    path: `trigger.${fieldName}`,
    label: fieldName,
    type: triggerSchema[fieldName]?.type ?? 'string',
    sourceNodeName: 'Trigger',
  }))
}
