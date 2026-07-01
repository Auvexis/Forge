import type { FileDatasetFile } from '@/core/types/workflow.types'

type JsonObject = Record<string, unknown>

export interface FileDatasetTemplateSuggestion {
  textTemplate: string
  sampleData: JsonObject
}

interface TemplateField {
  path: string
  value: unknown
}

export interface JsonArrayPathOption {
  value: string
  label: string
}

const MAX_TEMPLATE_FIELDS = 24
const MAX_OBJECT_DEPTH = 3

export function buildFileDatasetTemplateSuggestion(
  files: readonly FileDatasetFile[],
  jsonPath?: string,
): FileDatasetTemplateSuggestion | null {
  const sampleData = sampleDocumentDataFromFiles(files, jsonPath)
  if (!sampleData) return null

  const fields = flattenTemplateFields(sampleData).slice(0, MAX_TEMPLATE_FIELDS)
  if (fields.length === 0) return null

  return {
    sampleData,
    textTemplate: fields.map((field) => `${field.path}: {{ item.${field.path} }}`).join('\n'),
  }
}

export function buildJsonArrayPathOptions(files: readonly FileDatasetFile[]): JsonArrayPathOption[] {
  const paths = new Map<string, string>()

  for (const file of files) {
    const data = parseFileJson(file)
    if (data === undefined) continue
    collectArrayPaths(data).forEach((path) => {
      if (!path) return
      paths.set(path, path)
    })
  }

  return [...paths.values()].map((path) => ({ value: path, label: path }))
}

export function sampleDocumentDataFromFiles(files: readonly FileDatasetFile[], jsonPath?: string): JsonObject | null {
  const source = files.map(parseFileJson).find((value) => value !== undefined)
  if (source === undefined || source === null) return null

  const selected = jsonPath?.trim() ? getByPath(source, jsonPath.trim()) : source
  const sample = Array.isArray(selected) ? selected[0] : selected
  if (sample === undefined || sample === null) return null
  if (Array.isArray(sample)) return { value: sample }
  if (typeof sample === 'object') return sample as JsonObject
  return { value: sample }
}

export function flattenTemplateFields(value: JsonObject): TemplateField[] {
  const fields: TemplateField[] = []

  function visit(current: unknown, path: string, depth: number) {
    if (fields.length >= MAX_TEMPLATE_FIELDS) return
    if (current === undefined) return

    if (isTemplateFriendlyValue(current)) {
      fields.push({ path, value: current })
      return
    }

    if (!current || typeof current !== 'object' || Array.isArray(current) || depth >= MAX_OBJECT_DEPTH) {
      return
    }

    for (const [key, child] of Object.entries(current)) {
      const childPath = path ? `${path}.${key}` : key
      visit(child, childPath, depth + 1)
    }
  }

  visit(value, '', 0)
  return fields.filter((field) => Boolean(field.path))
}

export function renderTemplatePreview(template: string, item: JsonObject): string {
  return template.replace(/\{\{\s*item\.([^}]+?)\s*\}\}/g, (_match, path: string) => {
    return stringifyPreviewValue(getByPath(item, path.trim()))
  })
}

export function getByPath(value: unknown, path: string): unknown {
  return path
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<unknown>((current, part) => {
      if (current === undefined || current === null) return undefined
      if (Array.isArray(current)) {
        const index = Number(part)
        return Number.isInteger(index) ? current[index] : undefined
      }
      if (typeof current === 'object') return (current as JsonObject)[part]
      return undefined
    }, value)
}

function collectArrayPaths(value: unknown): string[] {
  const paths: string[] = []

  function visit(current: unknown, path: string) {
    if (Array.isArray(current)) {
      if (current.some((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))) {
        paths.push(path)
      }
      current.slice(0, 1).forEach((entry) => visit(entry, path))
      return
    }
    if (!current || typeof current !== 'object') return
    for (const [key, child] of Object.entries(current)) {
      visit(child, path ? `${path}.${key}` : key)
    }
  }

  visit(value, '')
  return paths
}

function parseFileJson(file: FileDatasetFile): unknown {
  if (typeof file === 'string') {
    return parseJsonText(file)
  }
  return parseJsonText(decodeFileContent(file.content))
}

function parseJsonText(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function decodeFileContent(content: string): string {
  const encoded = content.includes(',') ? content.slice(content.indexOf(',') + 1) : content
  if (!looksBase64(encoded)) return content
  try {
    return globalThis.atob(encoded)
  } catch {
    return content
  }
}

function looksBase64(value: string): boolean {
  const normalized = value.trim()
  return normalized.length > 0 &&
    normalized.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(normalized)
}

function isTemplateFriendlyValue(value: unknown): boolean {
  if (value === null) return true
  if (['string', 'number', 'boolean'].includes(typeof value)) return true
  return Array.isArray(value) && value.every((entry) => entry === null || ['string', 'number', 'boolean'].includes(typeof entry))
}

function stringifyPreviewValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}
