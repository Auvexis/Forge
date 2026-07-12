import darkTheme from '../json/dark.json'
import lightTheme from '../json/light.json'
import type { FabricThemeDefinition, FabricThemeId, FabricThemeType } from './theme.types'

export const fabricThemeRegistry = {
  'fabric.dark': defineTheme(darkTheme),
  'fabric.light': defineTheme(lightTheme),
} satisfies Record<FabricThemeId, FabricThemeDefinition>

export function themeIdForType(type: FabricThemeType): FabricThemeId {
  return type === 'dark' ? 'fabric.dark' : 'fabric.light'
}

export function getFabricTheme(themeId: FabricThemeId): FabricThemeDefinition {
  return fabricThemeRegistry[themeId]
}

function defineTheme(theme: unknown): FabricThemeDefinition {
  return theme as FabricThemeDefinition
}
