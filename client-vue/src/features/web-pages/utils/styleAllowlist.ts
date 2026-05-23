import type { PageBlockStyles } from '../types/page.types.ts'

const ALLOWED_STYLES = new Set([
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'padding',
  'margin',
  'display',
  'flexDirection',
  'alignItems',
  'justifyContent',
  'gap',
  'backgroundColor',
  'backgroundImage',
  'color',
  'border',
  'borderRadius',
  'boxShadow',
  'opacity',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'textAlign',
])

const DANGEROUS_CSS_PATTERN = /javascript:|data:text\/html|expression\s*\(|<\/style|<\s*script/i

export function sanitizeStyles(styles: PageBlockStyles): PageBlockStyles {
  const sanitized: PageBlockStyles = {}

  for (const [key, value] of Object.entries(styles)) {
    if (!ALLOWED_STYLES.has(key)) continue
    if (typeof value === 'string' && DANGEROUS_CSS_PATTERN.test(value)) continue

    if (key === 'opacity') {
      sanitized[key] = clampNumber(value, 0, 1)
      continue
    }

    if (key === 'fontSize') {
      sanitized[key] = clampPxValue(value, 8, 120)
      continue
    }

    sanitized[key] = value
  }

  return sanitized
}

export function sanitizeCustomCss(css: string): string {
  return css
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !DANGEROUS_CSS_PATTERN.test(part))
    .filter((part) => /^[a-z-]+\s*:\s*[^{}<>]+$/i.test(part))
    .map((part) => `${part};`)
    .join(' ')
}

export function sanitizeClassName(className: string): string {
  return className
    .split(/\s+/)
    .filter((part) => /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(part))
    .join(' ')
}

function clampNumber(value: string | number, min: number, max: number): number {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return min
  return Math.min(max, Math.max(min, numeric))
}

function clampPxValue(value: string | number, min: number, max: number): string | number {
  if (typeof value === 'number') return Math.min(max, Math.max(min, value))
  const match = value.match(/^(-?\d+(?:\.\d+)?)px$/)
  if (!match) return value
  return `${Math.min(max, Math.max(min, Number(match[1])))}px`
}
