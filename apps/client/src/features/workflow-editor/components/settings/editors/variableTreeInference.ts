export interface VariableTreePath {
  path: string
  label: string
  type: string
  sourceNodeName: string
  value?: unknown
}

interface InferAssignedPathOptions {
  path: string
  label: string
  sourceNodeName: string
  rawValue: unknown
  knownPaths: VariableTreePath[]
}

interface InferEventListenerPathsOptions {
  eventName: string
  listenerNodeId: string
  sourceNodeName: string
  workflowNodes: Record<string, any>
  knownPaths: VariableTreePath[]
}

interface InferWaitFormOutputPathsOptions {
  nodeId: string
  sourceNodeName: string
  fields: Array<{ name?: string; label?: string; type?: string }>
  liveOutput?: unknown
}

interface InferReturnOutputPathsOptions {
  nodeId: string
  sourceNodeName: string
  mode?: string
  fields?: Array<{ key?: string; value?: unknown }>
  expression?: string
  knownPaths: VariableTreePath[]
}

const EXACT_TEMPLATE_RE = /^{{\s*([^{}]+?)\s*}}$/
const TEMPLATE_RE = /{{\s*([^{}]+?)\s*}}/g

function inferValueType(value: unknown): string {
  if (Array.isArray(value)) return 'array'
  if (value === null || value === undefined) return 'any'
  return typeof value
}

function withValue(path: VariableTreePath, value: unknown): VariableTreePath {
  return {
    ...path,
    type: path.type || inferValueType(value),
    value,
  }
}

function findKnownPath(knownPaths: VariableTreePath[], refPath: string): VariableTreePath | undefined {
  return knownPaths.find((p) => p.path === refPath.trim())
}

export function inferAssignedPath(options: InferAssignedPathOptions): VariableTreePath {
  const basePath: VariableTreePath = {
    path: options.path,
    label: options.label,
    type: 'any',
    sourceNodeName: options.sourceNodeName,
  }

  if (options.rawValue === undefined || options.rawValue === null) {
    return basePath
  }

  const strVal = String(options.rawValue).trim()
  const exactMatch = strVal.match(EXACT_TEMPLATE_RE)

  if (exactMatch) {
    const foundPath = findKnownPath(options.knownPaths, exactMatch[1] ?? '')
    if (!foundPath) return basePath

    return {
      ...basePath,
      type: foundPath.type,
      ...(foundPath.value !== undefined ? { value: foundPath.value } : {}),
    }
  }

  let sawTemplate = false
  let resolvedAllTemplates = true
  const interpolated = strVal.replace(TEMPLATE_RE, (fullMatch, refPath) => {
    sawTemplate = true
    const foundPath = findKnownPath(options.knownPaths, refPath)
    if (foundPath?.value === undefined) {
      resolvedAllTemplates = false
      return fullMatch
    }
    return String(foundPath.value)
  })

  if (sawTemplate) {
    return resolvedAllTemplates ? withValue({ ...basePath, type: 'string' }, interpolated) : { ...basePath, type: 'string' }
  }

  if (strVal !== '' && !Number.isNaN(Number(strVal))) {
    return withValue({ ...basePath, type: 'number' }, Number(strVal))
  }

  if (strVal === 'true' || strVal === 'false') {
    return withValue({ ...basePath, type: 'boolean' }, strVal === 'true')
  }

  return withValue({ ...basePath, type: 'string' }, strVal)
}

export function inferEventListenerPaths(options: InferEventListenerPathsOptions): VariableTreePath[] {
  const inferred: VariableTreePath[] = []
  const seen = new Set<string>()

  for (const node of Object.values(options.workflowNodes)) {
    if (node?.type !== 'event' || node.eventName !== options.eventName) continue

    const params = node.payloadParams || []
    for (const param of params) {
      if (!param.key) continue

      const path = `steps.${options.listenerNodeId}.output.${param.key}`
      if (seen.has(path)) continue
      seen.add(path)

      inferred.push(
        inferAssignedPath({
          path,
          label: param.key,
          sourceNodeName: options.sourceNodeName,
          rawValue: param.value,
          knownPaths: options.knownPaths,
        }),
      )
    }
  }

  return inferred
}

export function inferWaitFormOutputPaths(options: InferWaitFormOutputPathsOptions): VariableTreePath[] {
  const prefix = `steps.${options.nodeId}.output`
  const liveOutput = isRecord(options.liveOutput) ? options.liveOutput : undefined
  const submittedFields = isRecord(liveOutput?.fields) ? liveOutput.fields : undefined
  const paths: VariableTreePath[] = []

  if (liveOutput) {
    paths.push({
      path: prefix,
      label: 'output',
      type: 'object',
      sourceNodeName: options.sourceNodeName,
      value: liveOutput,
    })
  }

  paths.push(
    buildPath(`${prefix}.formId`, 'formId', 'string', options.sourceNodeName, liveOutput?.formId),
    buildPath(`${prefix}.fields`, 'fields', 'object', options.sourceNodeName, submittedFields),
  )

  for (const field of options.fields) {
    if (!field.name) continue
    const fieldValue = submittedFields?.[field.name]
    paths.push(
      buildPath(
        `${prefix}.fields.${field.name}`,
        field.label || field.name,
        mapFormFieldType(field.type),
        options.sourceNodeName,
        fieldValue,
      ),
    )
  }

  paths.push(
    buildPath(`${prefix}.submittedAt`, 'submittedAt', 'number', options.sourceNodeName, liveOutput?.submittedAt),
    buildPath(`${prefix}.formUrl`, 'formUrl', 'string', options.sourceNodeName, liveOutput?.formUrl),
    buildPath(`${prefix}.expiresAt`, 'expiresAt', 'number', options.sourceNodeName, liveOutput?.expiresAt),
  )

  return paths
}

export function inferReturnOutputPaths(options: InferReturnOutputPathsOptions): VariableTreePath[] {
  const prefix = `steps.${options.nodeId}.output`
  if (options.mode === 'fields') {
    const paths: VariableTreePath[] = [
      {
        path: prefix,
        label: 'output',
        type: 'object',
        sourceNodeName: options.sourceNodeName,
      },
    ]

    for (const field of options.fields ?? []) {
      if (!field.key) continue
      paths.push(inferAssignedPath({
        path: `${prefix}.${field.key}`,
        label: field.key,
        sourceNodeName: options.sourceNodeName,
        rawValue: field.value,
        knownPaths: options.knownPaths,
      }))
    }

    return paths
  }

  if (options.mode === 'expression') {
    return [
      inferAssignedPath({
        path: prefix,
        label: 'output',
        sourceNodeName: options.sourceNodeName,
        rawValue: options.expression,
        knownPaths: options.knownPaths,
      }),
    ]
  }

  return [{ path: prefix, label: 'output', type: 'object', sourceNodeName: options.sourceNodeName }]
}

function buildPath(
  path: string,
  label: string,
  type: string,
  sourceNodeName: string,
  value: unknown,
): VariableTreePath {
  return {
    path,
    label,
    type: value === undefined ? type : inferValueType(value),
    sourceNodeName,
    ...(value !== undefined ? { value } : {}),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function mapFormFieldType(type: string | undefined): string {
  if (type === 'number') return 'number'
  if (type === 'checkbox') return 'boolean'
  if (type === 'checkbox-group' || type === 'multiselect') return 'array'
  if (type === 'file') return 'object'
  return 'string'
}
