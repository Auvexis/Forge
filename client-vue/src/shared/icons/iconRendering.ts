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
