type JsonObject = Record<string, unknown>

export interface DocumentLoaderTemplateSuggestion {
  textTemplate: string
  metadataTemplate: Record<string, string>
  sampleData: JsonObject
}

interface TemplateField {
  path: string
  value: unknown
}

const MAX_TEMPLATE_FIELDS = 24
const MAX_METADATA_FIELDS = 12
const MAX_OBJECT_DEPTH = 3

export function buildDocumentLoaderTemplateSuggestion(
  output: unknown,
  dataPath?: string,
): DocumentLoaderTemplateSuggestion | null {
  const sampleData = sampleDocumentDataFromOutput(output, dataPath)
  if (!sampleData) return null

  const fields = flattenTemplateFields(sampleData).slice(0, MAX_TEMPLATE_FIELDS)
  if (fields.length === 0) return null

  const metadataFields = fields
    .filter((field) => isMetadataFriendlyValue(field.value))
    .slice(0, MAX_METADATA_FIELDS)

  return {
    sampleData,
    textTemplate: fields.map((field) => `${field.path}: {{ item.${field.path} }}`).join('\n'),
    metadataTemplate: Object.fromEntries(
      metadataFields.map((field) => [field.path, `{{ item.${field.path} }}`]),
    ),
  }
}

export function sampleDocumentDataFromOutput(output: unknown, dataPath?: string): JsonObject | null {
  const source = findExtractedFileData(output)
  if (source === undefined || source === null) return null

  const selected = dataPath?.trim() ? getByPath(source, dataPath.trim()) : source
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

export function renderMetadataTemplatePreview(
  template: Record<string, unknown>,
  item: JsonObject,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(template).map(([key, value]) => [
      key,
      typeof value === 'string' ? renderTemplatePreview(value, item) : stringifyPreviewValue(value),
    ]),
  )
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

function findExtractedFileData(output: unknown): unknown {
  if (!output || typeof output !== 'object') return undefined
  const record = output as JsonObject
  const firstFile = Array.isArray(record.files) ? record.files[0] : undefined
  if (firstFile && typeof firstFile === 'object' && 'data' in firstFile) {
    return (firstFile as JsonObject).data
  }
  const firstItem = Array.isArray(record.items) ? record.items[0] : undefined
  if (firstItem && typeof firstItem === 'object' && 'raw' in firstItem) {
    return (firstItem as JsonObject).raw
  }
  return record
}

function isTemplateFriendlyValue(value: unknown): boolean {
  if (value === null) return true
  if (['string', 'number', 'boolean'].includes(typeof value)) return true
  return Array.isArray(value) && value.every((entry) => entry === null || ['string', 'number', 'boolean'].includes(typeof entry))
}

function isMetadataFriendlyValue(value: unknown): boolean {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value)
}

function stringifyPreviewValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}
