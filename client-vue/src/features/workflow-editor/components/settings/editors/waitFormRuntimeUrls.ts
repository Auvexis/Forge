const TEMPLATE_PATTERN = /{{\s*([a-zA-Z0-9_.\[\]-]+)\s*}}/g

export interface WaitFormTemplateContext {
  trigger?: unknown
  steps?: Record<string, { output?: unknown }>
  variables?: Record<string, unknown>
}

export interface WaitFormRuntimeSlugPreview {
  slug: string
  hasTemplate: boolean
  isResolved: boolean
}

export function resolveWaitFormRuntimeSlug(
  value: string,
  context: WaitFormTemplateContext,
): WaitFormRuntimeSlugPreview {
  const trimmed = value.trim()
  if (!trimmed) return { slug: '', hasTemplate: false, isResolved: false }

  let isResolved = true
  const resolved = trimmed.replace(TEMPLATE_PATTERN, (match, path) => {
    const value = resolvePath(context, path)
    if (value === undefined || value === null) {
      isResolved = false
      return match
    }
    return String(value)
  })

  const hasTemplate = TEMPLATE_PATTERN.test(trimmed)
  return {
    slug: hasTemplate && !isResolved ? '' : sanitizeTemporaryFormSlug(resolved),
    hasTemplate,
    isResolved: !hasTemplate || isResolved,
  }
}

export function buildTemporaryFormUrl(origin: string, slug: string): string {
  if (!origin || !slug) return ''
  return `${origin.replace(/\/$/, '')}/temporary-forms/${slug}`
}

export function buildTemporaryFormUrlPreview(origin: string, placeholder: string): string {
  if (!origin || !placeholder) return placeholder
  return `${origin.replace(/\/$/, '')}/temporary-forms/${placeholder}`
}

function sanitizeTemporaryFormSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function resolvePath(context: WaitFormTemplateContext, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc === undefined || acc === null || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[part]
  }, context)
}
