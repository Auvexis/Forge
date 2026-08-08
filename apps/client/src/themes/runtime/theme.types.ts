export type FabricThemeType = 'dark' | 'light'
export type FabricThemeIconVariant = 'dark' | 'light'

export interface FabricThemeDefinition {
  $schema?: string
  id: string
  name: string
  type: FabricThemeType
  iconVariant?: FabricThemeIconVariant
  tokens: Record<string, string>
}

export type FabricThemeId = 'fabric.dark' | 'fabric.light'
