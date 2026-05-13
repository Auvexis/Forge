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
