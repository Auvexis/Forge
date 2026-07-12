import { getFabricTheme, themeIdForType } from './theme.registry'
import type { FabricThemeDefinition, FabricThemeId, FabricThemeType } from './theme.types'

const THEME_STYLE_ID = 'fabric-runtime-theme'

export function applyFabricThemeByType(type: FabricThemeType) {
  applyFabricTheme(getFabricTheme(themeIdForType(type)))
}

export function applyFabricThemeById(themeId: FabricThemeId) {
  applyFabricTheme(getFabricTheme(themeId))
}

export function applyFabricTheme(theme: FabricThemeDefinition) {
  if (typeof document === 'undefined') return
  const style = getThemeStyleElement()
  style.textContent = renderThemeCss(theme)
  document.documentElement.dataset.fabricTheme = theme.id
}

export function tokenNameToCssVar(tokenName: string): string {
  return `--fabric-${tokenName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\./g, '-')
    .toLowerCase()}`
}

export function renderThemeCss(theme: FabricThemeDefinition): string {
  const declarations = Object.entries(theme.tokens)
    .map(([tokenName, value]) => `  ${tokenNameToCssVar(tokenName)}: ${value};`)
    .join('\n')

  return `:root {\n${declarations}\n}\n`
}

function getThemeStyleElement(): HTMLStyleElement {
  const existing = document.getElementById(THEME_STYLE_ID)
  if (existing instanceof HTMLStyleElement) return existing

  const style = document.createElement('style')
  style.id = THEME_STYLE_ID
  document.head.appendChild(style)
  return style
}
