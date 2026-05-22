import type { PluginBlueprint } from '@/core/types/plugin-creator.types'

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
