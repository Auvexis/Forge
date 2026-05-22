import type { PluginBlueprint } from '@/core/types/plugin-creator.types'

const branchHandles = new Set(['then', 'else', 'default', 'try', 'catch', 'body'])

export interface PluginCreatorSelectedNodePreview {
  code: string
  label: string
}

export function resolvePluginCreatorSelectedNodePreview(input: {
  blueprint: PluginBlueprint | null | undefined
  selectedNodeId: string | null | undefined
}): PluginCreatorSelectedNodePreview {
  const blueprint = input.blueprint
  const node =
    blueprint && input.selectedNodeId ? blueprint.canvas.nodes[input.selectedNodeId] : undefined
  const method = node?.data.methodId
    ? blueprint?.methods.find((candidate) => candidate.id === node.data.methodId)
    : undefined

  if (!blueprint || !node || !method) {
    return { code: '', label: 'selected node' }
  }

  return {
    code: formatPluginCreatorReadableMethodPreview(blueprint, method),
    label: `${method.name || method.handle} method`,
  }
}

function formatPluginCreatorReadableMethodPreview(
  blueprint: PluginBlueprint,
  method: PluginBlueprint['methods'][number],
) {
  const methodNode = Object.values(blueprint.canvas.nodes).find(
    (node) => node.type === 'method' && node.data.methodId === method.id,
  )
  const steps = methodNode
    ? formatStepsFromNodeIds(blueprint, method, nextNodeIds(blueprint, methodNode.id), new Set())
    : []
  const body = steps.length > 0 ? steps.join('\n\n') : '// No steps connected yet.'

  return `async function ${method.handle}(params, context) {\n${indent(body, 2)}\n}`
}

function formatStepsFromNodeIds(
  blueprint: PluginBlueprint,
  method: PluginBlueprint['methods'][number],
  startNodeIds: string[],
  visited: Set<string>,
): string[] {
  const output: string[] = []
  const queue = [...startNodeIds]

  while (queue.length > 0) {
    const nodeId = queue.shift()
    if (!nodeId || visited.has(nodeId)) continue
    visited.add(nodeId)

    const node = blueprint.canvas.nodes[nodeId]
    if (!node || node.data.methodId !== method.id) continue

    const source = formatStep(blueprint, method, node, visited)
    if (source) output.push(source)

    queue.unshift(...nextNodeIds(blueprint, nodeId))
  }

  return output
}

function formatStep(
  blueprint: PluginBlueprint,
  method: PluginBlueprint['methods'][number],
  node: PluginBlueprint['canvas']['nodes'][string],
  visited: Set<string>,
): string {
  switch (node.type) {
    case 'request':
      return [
        `// HTTP Request: ${node.id}`,
        `const ${node.id} = await httpRequest({`,
        `  method: ${JSON.stringify(method.request.method)},`,
        `  url: ${JSON.stringify(method.request.url)},`,
        `});`,
      ].join('\n')
    case 'responseMapper':
    case 'output':
      return [
        `// Response Mapper: ${node.id}`,
        `const ${node.id} = mapResponse(${JSON.stringify(method.responseMapping, null, 2)});`,
      ].join('\n')
    case 'errorMapper':
      return [
        `// Error Mapper: ${node.id}`,
        `throwIfMappedError(${JSON.stringify(method.errorMapping, null, 2)});`,
      ].join('\n')
    case 'codeBlock':
      return formatCodeBlockStep(method, node)
    case 'if':
      return formatIfStep(blueprint, method, node, visited)
    case 'switch':
      return formatSwitchStep(blueprint, method, node, visited)
    case 'jsonTransform':
      return [
        `// JSON Transform: ${node.id}`,
        `const ${stringData(node, 'outputName', node.id)} = ${stringData(node, 'expression', 'previous')};`,
      ].join('\n')
    case 'return':
      return [
        `// Return: ${node.id}`,
        `return ${stringData(node, 'valueExpression', 'previous')};`,
      ].join('\n')
    default:
      return `// ${String(node.data.name ?? node.type)}: ${node.id}`
  }
}

function formatCodeBlockStep(
  method: PluginBlueprint['methods'][number],
  node: PluginBlueprint['canvas']['nodes'][string],
) {
  const codeBlockId = typeof node.data.codeBlockId === 'string' ? node.data.codeBlockId : node.id
  const codeBlock = method.codeBlocks?.find((candidate) => candidate.id === codeBlockId)
  const source =
    codeBlock?.source ??
    (typeof node.data.source === 'string' ? node.data.source : 'return previous;')
  return [`// Code Block: ${codeBlock?.name ?? node.id}`, source].join('\n')
}

function formatIfStep(
  blueprint: PluginBlueprint,
  method: PluginBlueprint['methods'][number],
  node: PluginBlueprint['canvas']['nodes'][string],
  visited: Set<string>,
) {
  const thenSource = formatStepsFromNodeIds(
    blueprint,
    method,
    branchNodeIds(blueprint, node.id, 'then'),
    cloneVisited(visited),
  ).join('\n\n')
  const elseSource = formatStepsFromNodeIds(
    blueprint,
    method,
    branchNodeIds(blueprint, node.id, 'else'),
    cloneVisited(visited),
  ).join('\n\n')

  return [
    `// If: ${node.id}`,
    `if (${stringData(node, 'condition', 'false')}) {`,
    indent(thenSource || '// then branch empty', 2),
    `} else {`,
    indent(elseSource || '// else branch empty', 2),
    `}`,
  ].join('\n')
}

function formatSwitchStep(
  blueprint: PluginBlueprint,
  method: PluginBlueprint['methods'][number],
  node: PluginBlueprint['canvas']['nodes'][string],
  visited: Set<string>,
) {
  const cases = arrayData<{ id?: string; label?: string; value?: unknown; handle?: string }>(
    node,
    'cases',
  ).map((switchCase, index) => {
    const handle = String(switchCase.handle ?? switchCase.id ?? `case_${index}`)
    const caseSource = formatStepsFromNodeIds(
      blueprint,
      method,
      branchNodeIds(blueprint, node.id, handle),
      cloneVisited(visited),
    ).join('\n\n')
    return [`case ${JSON.stringify(switchCase.value)}:`, indent(caseSource || 'break;', 2)].join(
      '\n',
    )
  })
  const defaultSource = formatStepsFromNodeIds(
    blueprint,
    method,
    branchNodeIds(blueprint, node.id, 'default'),
    cloneVisited(visited),
  ).join('\n\n')

  return [
    `// Switch: ${node.id}`,
    `switch (${stringData(node, 'expression', 'undefined')}) {`,
    indent(cases.join('\n') || '// no cases', 2),
    `  default:`,
    indent(defaultSource || 'break;', 4),
    `}`,
  ].join('\n')
}

function nextNodeIds(blueprint: PluginBlueprint, nodeId: string): string[] {
  return (blueprint.canvas.edges ?? [])
    .filter((edge) => edge.source === nodeId && isSequentialHandle(edge.sourceHandle))
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((edge) => edge.target)
}

function branchNodeIds(blueprint: PluginBlueprint, nodeId: string, handle: string): string[] {
  return (blueprint.canvas.edges ?? [])
    .filter((edge) => edge.source === nodeId && edge.sourceHandle === handle)
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((edge) => edge.target)
}

function isSequentialHandle(handle: string | undefined): boolean {
  return !handle || handle === 'next' || !branchHandles.has(handle)
}

function cloneVisited(visited: Set<string>): Set<string> {
  return new Set(visited)
}

function stringData(
  node: PluginBlueprint['canvas']['nodes'][string],
  key: string,
  fallback: string,
): string {
  const value = node.data[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function arrayData<T>(node: PluginBlueprint['canvas']['nodes'][string], key: string): T[] {
  const value = node.data[key]
  return Array.isArray(value) ? (value as T[]) : []
}

function indent(value: string, spaces: number): string {
  const padding = ' '.repeat(spaces)
  return padding + value.replace(/\n/g, `\n${padding}`)
}

export function resolvePluginCreatorMethodHandle(
  blueprint: PluginBlueprint | null | undefined,
  selectedNodeId: string | null | undefined,
) {
  if (!blueprint?.methods.length) return null

  const methodId =
    selectedNodeId && typeof blueprint.canvas.nodes[selectedNodeId]?.data.methodId === 'string'
      ? blueprint.canvas.nodes[selectedNodeId]?.data.methodId
      : null
  const selectedMethod = methodId
    ? blueprint.methods.find((method) => method.id === methodId)
    : null

  return selectedMethod?.handle ?? blueprint.methods[0]?.handle ?? null
}

export function hasPluginCreatorMethodSteps(
  blueprint: PluginBlueprint | null | undefined,
  methodHandle: string | null | undefined,
) {
  if (!blueprint || !methodHandle) return false
  const method = blueprint.methods.find((candidate) => candidate.handle === methodHandle)
  if (!method) return false

  return Object.values(blueprint.canvas.nodes).some((node) => {
    return node.type !== 'method' && node.data.methodId === method.id
  })
}

export function extractPluginCreatorMethodBlock(
  source: string,
  methodHandle: string | null | undefined,
) {
  const trimmedSource = source.trim()
  if (!trimmedSource || !methodHandle) return trimmedSource

  const methodPattern = new RegExp(`(^|\\n)(\\s*)${escapeRegExp(methodHandle)}:\\s*async\\s*\\(`)
  const match = methodPattern.exec(source)
  if (!match) return trimmedSource

  const methodStart = match.index + (match[1] === '\n' ? 1 : 0)
  const bodyStart = findMethodBodyStart(source, methodStart)
  if (bodyStart < 0) return trimmedSource

  const bodyEnd = findMatchingBrace(source, bodyStart)
  if (bodyEnd < 0) return trimmedSource

  let methodEnd = bodyEnd + 1
  while (source[methodEnd] === ' ' || source[methodEnd] === '\t') methodEnd += 1
  if (source[methodEnd] === ',') methodEnd += 1

  return source.slice(methodStart, methodEnd).trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findMethodBodyStart(source: string, methodStart: number) {
  for (let index = methodStart; index < source.length; index += 1) {
    if (source[index] === '=' && source[index + 1] === '>') {
      return findNextCodeBrace(source, index + 2)
    }
  }
  return -1
}

function findNextCodeBrace(source: string, startIndex: number) {
  const state = createScanState()
  for (let index = startIndex; index < source.length; index += 1) {
    updateScanState(state, source, index)
    if (!state.isCode) continue
    if (source[index] === '{') return index
  }
  return -1
}

function findMatchingBrace(source: string, openBraceIndex: number) {
  const state = createScanState()
  let depth = 0

  for (let index = openBraceIndex; index < source.length; index += 1) {
    updateScanState(state, source, index)
    if (!state.isCode) continue

    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }

  return -1
}

interface ScanState {
  quote: '"' | "'" | '`' | null
  isBlockComment: boolean
  isLineComment: boolean
  isCode: boolean
}

function createScanState(): ScanState {
  return {
    quote: null,
    isBlockComment: false,
    isLineComment: false,
    isCode: true,
  }
}

function updateScanState(state: ScanState, source: string, index: number) {
  const char = source[index]
  const previous = source[index - 1]
  const next = source[index + 1]
  state.isCode = false

  if (state.isLineComment) {
    if (char === '\n') state.isLineComment = false
    return
  }

  if (state.isBlockComment) {
    if (previous === '*' && char === '/') state.isBlockComment = false
    return
  }

  if (state.quote) {
    if (char === state.quote && previous !== '\\') state.quote = null
    return
  }

  if (char === '/' && next === '/') {
    state.isLineComment = true
    return
  }

  if (char === '/' && next === '*') {
    state.isBlockComment = true
    return
  }

  if (char === '"' || char === "'" || char === '`') {
    state.quote = char
    return
  }

  state.isCode = true
}
