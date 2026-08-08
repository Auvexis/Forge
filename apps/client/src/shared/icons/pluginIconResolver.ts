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
  options: { iconVariant?: 'dark' | 'light'; isDark?: boolean; fallback?: string } = {},
): string {
  const fallback = options.fallback ?? 'box'
  if (metadata.style?.icon) return metadata.style.icon

  const iconVariant = options.iconVariant ?? (options.isDark === false ? 'dark' : 'light')

  if (iconVariant === 'dark') {
    return metadata.iconDark ?? metadata.icon ?? metadata.iconLight ?? fallback
  }

  return metadata.iconLight ?? metadata.icon ?? metadata.iconDark ?? fallback
}
