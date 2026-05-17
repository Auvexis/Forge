const TINTABLE_ICON_FILENAMES = new Set(['ollama.svg'])

export function isIconUrl(icon?: string): boolean {
  if (!icon) return false

  const normalized = icon.toLowerCase()
  return (
    normalized.startsWith('http') ||
    normalized.startsWith('/') ||
    normalized.startsWith('data:image/') ||
    /\.(png|jpg|jpeg|svg|webp|gif|avif)(\?|#|$)/.test(normalized)
  )
}

export function isTintableExternalIcon(icon?: string): boolean {
  if (!icon || !isIconUrl(icon) || icon.startsWith('data:image/')) return false

  const pathWithoutQuery = icon.split(/[?#]/)[0]?.toLowerCase() ?? ''
  const filename = pathWithoutQuery.split('/').pop() ?? ''
  return TINTABLE_ICON_FILENAMES.has(filename)
}
