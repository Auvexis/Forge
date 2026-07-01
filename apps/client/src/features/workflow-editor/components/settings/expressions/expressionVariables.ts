import type { WorkflowVariable } from '@/core/types/workflow.types'
import type { GlobalVariable } from '@/shared/stores/settings.store'

export type ExpressionScope = 'local' | 'global'

export interface ExpressionItem {
  id: string
  scope: ExpressionScope
  name: string
  description?: string
  type: string
  preview: string
  token: string
  icon: string
}

export interface ExpressionToken {
  scope: ExpressionScope
  name: string
  token: string
}

export interface TextSelectionRange {
  start: number
  end: number
}

const SECRET_PREVIEW = '************'

function previewValue(value: unknown, type?: string): string {
  if (type === 'secret') return SECRET_PREVIEW
  if (value === undefined || value === null || value === '') return 'empty'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function buildExpressionItems(input: {
  localVariables?: WorkflowVariable[]
  globalVariables?: GlobalVariable[]
}): ExpressionItem[] {
  const localItems = (input.localVariables ?? []).map((variable): ExpressionItem => ({
    id: `local:${variable.name}`,
    scope: 'local',
    name: variable.name,
    description: variable.description,
    type: variable.type,
    preview: previewValue(variable.defaultValue, variable.type),
    token: `{{ variables.${variable.name} }}`,
    icon: variable.type === 'secret' ? 'key-round' : 'tag',
  }))

  const globalItems = (input.globalVariables ?? []).map((variable): ExpressionItem => ({
    id: `global:${variable.key}`,
    scope: 'global',
    name: variable.key,
    description: variable.description,
    type: 'string',
    preview: SECRET_PREVIEW,
    token: `{{ env.${variable.key} }}`,
    icon: 'globe',
  }))

  return [...localItems, ...globalItems]
}

export function findExpressionTokens(value: string): ExpressionToken[] {
  const tokens: ExpressionToken[] = []
  const pattern = /\{\{\s*(variables|env)\.([A-Za-z_$][\w$.-]*)\s*\}\}/g
  const seen = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = pattern.exec(value)) !== null) {
    const source = match[1]
    const name = match[2]
    const token = match[0]
    if (!source || !name || seen.has(`${source}:${name}`)) continue
    seen.add(`${source}:${name}`)
    tokens.push({
      scope: source === 'variables' ? 'local' : 'global',
      name,
      token,
    })
  }

  return tokens
}

export function insertExpressionToken(
  value: string,
  token: string,
  selection?: TextSelectionRange | null,
): string {
  const start = selection?.start ?? value.length
  const end = selection?.end ?? value.length
  return `${value.slice(0, start)}${token}${value.slice(end)}`
}
