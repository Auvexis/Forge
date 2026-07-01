export interface PluginIconMetadata {
  icon?: string
  iconLight?: string
  iconDark?: string
  style?: {
    icon?: string
  }
}

export function resolvePluginIcon(
  metadata: PluginIconMetadata,
  options: { isDark?: boolean; fallback?: string } = {},
): string {
  const fallback = options.fallback ?? 'box'
  if (metadata.style?.icon) return metadata.style.icon

  if (options.isDark === false) {
    return metadata.iconDark ?? metadata.icon ?? metadata.iconLight ?? fallback
  }

  return metadata.iconLight ?? metadata.icon ?? metadata.iconDark ?? fallback
}
