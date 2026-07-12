import { getFabricTheme, themeIdForType } from './theme.registry'
import type { FabricThemeDefinition, FabricThemeType } from './theme.types'

export interface FabricThemePreviewCard {
  value: FabricThemeType | 'system'
  label: string
  bgColor: string
  surfaceColor: string
  componentColor: string
  borderColor: string
  accentColor: string
  mutedColor: string
}

export function getFabricThemePreviewCards(): FabricThemePreviewCard[] {
  const darkTheme = getFabricTheme(themeIdForType('dark'))
  const lightTheme = getFabricTheme(themeIdForType('light'))

  return [
    buildPreviewCard(darkTheme, 'dark', 'Dark'),
    buildPreviewCard(lightTheme, 'light', 'Light'),
    buildSystemPreviewCard(darkTheme, lightTheme),
  ]
}

function buildPreviewCard(
  theme: FabricThemeDefinition,
  value: FabricThemeType,
  label: string,
): FabricThemePreviewCard {
  return {
    value,
    label,
    bgColor: resolveThemeToken(theme, 'bg.base'),
    surfaceColor: resolveThemeToken(theme, 'bg.surface'),
    componentColor: resolveThemeToken(theme, 'bg.subtle'),
    borderColor: resolveThemeToken(theme, 'border'),
    accentColor: resolveThemeToken(theme, 'accent'),
    mutedColor: resolveThemeToken(theme, 'text.muted'),
  }
}

function buildSystemPreviewCard(
  darkTheme: FabricThemeDefinition,
  lightTheme: FabricThemeDefinition,
): FabricThemePreviewCard {
  return {
    value: 'system',
    label: 'System',
    bgColor: resolveThemeToken(darkTheme, 'bg.chrome'),
    surfaceColor: resolveThemeToken(lightTheme, 'bg.surface'),
    componentColor: resolveThemeToken(darkTheme, 'bg.chrome.elevated'),
    borderColor: resolveThemeToken(lightTheme, 'border.strong'),
    accentColor: resolveThemeToken(lightTheme, 'accent'),
    mutedColor: resolveThemeToken(lightTheme, 'text.muted'),
  }
}

function resolveThemeToken(theme: FabricThemeDefinition, tokenName: string): string {
  const value = theme.tokens[tokenName]
  if (!value) return ''

  const cssVarMatch = value.match(/^var\(--fabric-(.+)\)$/)
  if (!cssVarMatch) return value

  const referencedToken = (cssVarMatch[1] ?? '').replace(/-/g, '.')
  return resolveThemeToken(theme, referencedToken)
}
